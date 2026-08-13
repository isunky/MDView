mod distribution;
mod docx_import;
mod file_watcher;
mod fs_utils;
mod image_utils;
mod startup;

use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::Duration,
};

use base64::{engine::general_purpose, Engine as _};
use docx_import::DocxImportRegistry;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use tauri::Emitter;

const FILE_ACCESS_POLICY_FILENAME: &str = "approved-markdown-files.json";
const FILE_ACCESS_DENIED: &str =
    "File access denied. Open or select the file in MDView before accessing it.";
const MAX_IMAGE_ASSET_BYTES: usize = 10 * 1024 * 1024;
const MAX_EXPORT_IMAGE_BYTES: usize = 20 * 1024 * 1024;

use distribution::get_app_distribution;
use file_watcher::FileWatcherRegistry;
use fs_utils::{
    atomic_write_file, configure_default_path, ensure_docx_path, ensure_extension,
    ensure_html_path, ensure_image_path, ensure_markdown_path, image_mime_type, is_docx_path,
    is_html_path, is_markdown_path,
};
use image_utils::{
    create_image_asset_file, image_extension_for_mime_type, sanitize_image_filename_stem,
};
use startup::collect_opened_files_from_args;

struct OpenedFiles(Mutex<Vec<PathBuf>>);

#[derive(Default)]
struct FileAccessPolicy {
    approved_markdown_files: Mutex<HashSet<PathBuf>>,
    active_document_roots: Mutex<HashSet<PathBuf>>,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredFileAccessPolicy {
    markdown_files: Vec<PathBuf>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedMarkdownFilePayload {
    path: String,
    content: String,
    revision: String,
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
enum MarkdownFileCheckPayload {
    Unchanged,
    Changed { file: OpenedMarkdownFilePayload },
    Missing { path: String },
}

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
enum MarkdownFileSavePayload {
    Saved { path: String, revision: String },
    Conflict { file: OpenedMarkdownFilePayload },
    Missing { path: String },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageFilePayload {
    path: String,
    data_url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WrittenImageAssetPayload {
    path: String,
    relative_path: String,
    filename: String,
}

impl FileAccessPolicy {
    fn load(app: &AppHandle) -> Self {
        let policy = Self::default();
        let Ok(content) = fs::read_to_string(file_access_policy_path(app)) else {
            return policy;
        };
        let Ok(stored) = serde_json::from_str::<StoredFileAccessPolicy>(&content) else {
            return policy;
        };

        if let Ok(mut approved) = policy.approved_markdown_files.lock() {
            for path in stored.markdown_files {
                if ensure_markdown_path(&path).is_ok() {
                    if let Ok(normalized) = normalize_path_for_policy(&path) {
                        approved.insert(normalized);
                    }
                }
            }
        }

        policy
    }

    fn approve_markdown_file(&self, path: &Path) -> Result<(), String> {
        ensure_markdown_path(path)?;
        let normalized = normalize_path_for_policy(path)?;

        self.approved_markdown_files
            .lock()
            .map_err(|_| "File access policy lock was poisoned.".to_string())?
            .insert(normalized.clone());
        self.activate_document_root(&normalized)
    }

    fn activate_document_root(&self, path: &Path) -> Result<(), String> {
        let normalized = normalize_path_for_policy(path)?;
        let root = normalized
            .parent()
            .ok_or_else(|| "The selected file does not have a parent directory.".to_string())?
            .to_path_buf();

        self.active_document_roots
            .lock()
            .map_err(|_| "File access policy lock was poisoned.".to_string())?
            .insert(root);
        Ok(())
    }

    fn is_authorized(&self, path: &Path) -> Result<bool, String> {
        let normalized = normalize_path_for_policy(path)?;
        let is_approved_file = self
            .approved_markdown_files
            .lock()
            .map_err(|_| "File access policy lock was poisoned.".to_string())?
            .contains(&normalized);

        if is_approved_file {
            return Ok(true);
        }

        Ok(self
            .active_document_roots
            .lock()
            .map_err(|_| "File access policy lock was poisoned.".to_string())?
            .iter()
            .any(|root| normalized.starts_with(root)))
    }

    fn ensure_authorized(&self, path: &Path) -> Result<(), String> {
        if self.is_authorized(path)? {
            Ok(())
        } else {
            Err(FILE_ACCESS_DENIED.to_string())
        }
    }

    fn approved_markdown_files(&self) -> Result<Vec<PathBuf>, String> {
        let mut files = self
            .approved_markdown_files
            .lock()
            .map_err(|_| "File access policy lock was poisoned.".to_string())?
            .iter()
            .cloned()
            .collect::<Vec<_>>();
        files.sort();
        Ok(files)
    }
}

#[tauri::command]
fn take_opened_files(opened_files: State<'_, OpenedFiles>) -> Vec<String> {
    let mut files = opened_files.0.lock().expect("opened file state poisoned");
    files
        .drain(..)
        .map(|path| path.to_string_lossy().to_string())
        .collect()
}

#[tauri::command]
async fn open_markdown_file_dialog(
    app: AppHandle,
    policy: State<'_, FileAccessPolicy>,
) -> Result<Option<OpenedMarkdownFilePayload>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "mdown", "mkdn"])
        .blocking_pick_file();
    let Some(path) = selected else {
        return Ok(None);
    };
    let path = path
        .into_path()
        .map_err(|_| "The selected item is not a local file path.".to_string())?;

    ensure_markdown_path(&path)?;
    let content =
        fs::read_to_string(&path).map_err(|error| format!("Failed to read file: {error}"))?;
    approve_and_persist_markdown_file(&app, &policy, &path)?;

    Ok(Some(opened_markdown_payload(path, content)))
}

#[tauri::command]
async fn open_markdown_file_at_path(
    app: AppHandle,
    policy: State<'_, FileAccessPolicy>,
    path: String,
) -> Result<OpenedMarkdownFilePayload, String> {
    let path = PathBuf::from(path);
    ensure_markdown_path(&path)?;

    if !policy.is_authorized(&path)? {
        approve_and_persist_markdown_file(&app, &policy, &path)?;
    }

    read_authorized_markdown_file(&policy, &path)
}

#[tauri::command]
fn read_markdown_file(policy: State<'_, FileAccessPolicy>, path: String) -> Result<String, String> {
    let path = PathBuf::from(path);
    Ok(read_authorized_markdown_file(&policy, &path)?.content)
}

#[tauri::command]
fn save_markdown_file(
    policy: State<'_, FileAccessPolicy>,
    path: String,
    content: String,
    expected_revision: String,
) -> Result<MarkdownFileSavePayload, String> {
    let path = PathBuf::from(path);
    ensure_markdown_path(&path)?;
    policy.ensure_authorized(&path)?;
    let existing = match read_authorized_markdown_file(&policy, &path) {
        Ok(file) => file,
        Err(error) if is_not_found_error(&error) => {
            return Ok(MarkdownFileSavePayload::Missing {
                path: path.to_string_lossy().to_string(),
            })
        }
        Err(error) => return Err(error),
    };
    if existing.revision != expected_revision {
        return Ok(MarkdownFileSavePayload::Conflict { file: existing });
    }
    atomic_write_file(&path, content.as_bytes())
        .map_err(|error| format!("Failed to write file: {error}"))?;
    Ok(MarkdownFileSavePayload::Saved {
        path: path.to_string_lossy().to_string(),
        revision: markdown_revision(&content),
    })
}

#[tauri::command]
fn check_markdown_file(
    policy: State<'_, FileAccessPolicy>,
    path: String,
    known_revision: String,
) -> Result<MarkdownFileCheckPayload, String> {
    let path = PathBuf::from(path);
    ensure_markdown_path(&path)?;
    policy.ensure_authorized(&path)?;
    let file = match read_authorized_markdown_file(&policy, &path) {
        Ok(file) => file,
        Err(error) if is_not_found_error(&error) => {
            return Ok(MarkdownFileCheckPayload::Missing {
                path: path.to_string_lossy().to_string(),
            })
        }
        Err(error) => return Err(error),
    };
    if file.revision == known_revision {
        Ok(MarkdownFileCheckPayload::Unchanged)
    } else {
        Ok(MarkdownFileCheckPayload::Changed { file })
    }
}

#[tauri::command]
fn start_markdown_file_watch(
    app: AppHandle,
    policy: State<'_, FileAccessPolicy>,
    watchers: State<'_, FileWatcherRegistry>,
    path: String,
) -> Result<String, String> {
    let path = PathBuf::from(path);
    ensure_markdown_path(&path)?;
    policy.ensure_authorized(&path)?;
    let normalized = normalize_path_for_policy(&path)?;
    watchers.start(app, normalized)
}

#[tauri::command]
fn stop_markdown_file_watch(
    watchers: State<'_, FileWatcherRegistry>,
    watch_id: String,
) -> Result<(), String> {
    watchers.stop(&watch_id)
}

#[tauri::command]
async fn save_markdown_file_dialog(
    app: AppHandle,
    policy: State<'_, FileAccessPolicy>,
    content: String,
    default_path: String,
) -> Result<Option<OpenedMarkdownFilePayload>, String> {
    let dialog = configure_default_path(
        app.dialog()
            .file()
            .add_filter("Markdown", &["md", "markdown", "mdown", "mkdn"]),
        Path::new(&default_path),
    );
    let Some(path) = dialog.blocking_save_file() else {
        return Ok(None);
    };
    let path = path
        .into_path()
        .map_err(|_| "The selected item is not a local file path.".to_string())?;
    let path = ensure_extension(path, "md", is_markdown_path);

    atomic_write_file(&path, content.as_bytes())
        .map_err(|error| format!("Failed to write file: {error}"))?;
    approve_and_persist_markdown_file(&app, &policy, &path)?;
    Ok(Some(opened_markdown_payload(path, content)))
}

#[tauri::command]
async fn export_html_file_dialog(
    app: AppHandle,
    content: String,
    default_path: String,
) -> Result<Option<String>, String> {
    let dialog = configure_default_path(
        app.dialog().file().add_filter("HTML", &["html", "htm"]),
        Path::new(&default_path),
    );
    let Some(path) = dialog.blocking_save_file() else {
        return Ok(None);
    };
    let path = path
        .into_path()
        .map_err(|_| "The selected item is not a local file path.".to_string())?;
    let path = ensure_extension(path, "html", is_html_path);

    ensure_html_path(&path)?;
    fs::write(&path, content).map_err(|error| format!("Failed to write file: {error}"))?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
async fn export_docx_file_dialog(
    app: AppHandle,
    bytes: Vec<u8>,
    default_path: String,
) -> Result<Option<String>, String> {
    let dialog = configure_default_path(
        app.dialog().file().add_filter("Word Document", &["docx"]),
        Path::new(&default_path),
    );
    let Some(path) = dialog.blocking_save_file() else {
        return Ok(None);
    };
    let path = path
        .into_path()
        .map_err(|_| "The selected item is not a local file path.".to_string())?;
    let path = ensure_extension(path, "docx", is_docx_path);

    ensure_docx_path(&path)?;
    fs::write(&path, bytes).map_err(|error| format!("Failed to write file: {error}"))?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn get_docx_import_status(
    app: AppHandle,
    registry: State<'_, DocxImportRegistry>,
) -> Result<docx_import::Status, String> {
    docx_import::get_status(&app, &registry)
}

#[tauri::command]
fn select_docx_import_python(
    app: AppHandle,
    registry: State<'_, DocxImportRegistry>,
) -> Result<docx_import::Status, String> {
    docx_import::select_python(&app, &registry)
}

#[tauri::command]
fn install_docx_import_dependencies(
    app: AppHandle,
    registry: State<'_, DocxImportRegistry>,
) -> Result<docx_import::Status, String> {
    docx_import::install(&app, &registry)
}

#[tauri::command]
fn import_docx_file(
    app: AppHandle,
    registry: State<'_, DocxImportRegistry>,
) -> Result<Option<docx_import::ImportedFile>, String> {
    docx_import::import_file(&app, &registry)
}

#[tauri::command]
fn cancel_docx_import(registry: State<'_, DocxImportRegistry>) -> Result<(), String> {
    registry.cancel()
}

#[tauri::command]
fn read_image_file(
    policy: State<'_, FileAccessPolicy>,
    path: String,
) -> Result<ImageFilePayload, String> {
    let path = PathBuf::from(path);
    ensure_image_path(&path)?;
    policy.ensure_authorized(&path)?;
    let bytes = fs::read(&path).map_err(|error| format!("Failed to read image: {error}"))?;
    let mime_type = image_mime_type(&path)?;
    let encoded = general_purpose::STANDARD.encode(bytes);

    Ok(ImageFilePayload {
        path: path.to_string_lossy().to_string(),
        data_url: format!("data:{mime_type};base64,{encoded}"),
    })
}

#[tauri::command]
async fn read_remote_image_file(url: String) -> Result<ImageFilePayload, String> {
    let parsed = url::Url::parse(&url).map_err(|_| "The image URL is invalid.".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https")
        || !parsed.username().is_empty()
        || parsed.password().is_some()
    {
        return Err("Only unauthenticated HTTP and HTTPS image URLs are supported.".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|error| format!("Failed to create image download client: {error}"))?;
    let mut response = client
        .get(parsed)
        .send()
        .await
        .map_err(|error| format!("Failed to download image: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Failed to download image: {error}"))?;

    if response
        .content_length()
        .is_some_and(|length| length > MAX_EXPORT_IMAGE_BYTES as u64)
    {
        return Err("The remote image exceeds the 20 MB export limit.".to_string());
    }
    let mime_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .map(str::trim)
        .filter(|value| value.starts_with("image/"))
        .map(str::to_owned)
        .ok_or_else(|| "The remote resource is not an image.".to_string())?;
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("Failed to read downloaded image: {error}"))?
    {
        if bytes.len() + chunk.len() > MAX_EXPORT_IMAGE_BYTES {
            return Err("The remote image exceeds the 20 MB export limit.".to_string());
        }
        bytes.extend_from_slice(&chunk);
    }

    Ok(ImageFilePayload {
        path: url,
        data_url: format!(
            "data:{mime_type};base64,{}",
            general_purpose::STANDARD.encode(bytes)
        ),
    })
}

#[tauri::command]
fn write_image_asset(
    policy: State<'_, FileAccessPolicy>,
    document_path: String,
    file_name: String,
    mime_type: String,
    bytes: Vec<u8>,
) -> Result<WrittenImageAssetPayload, String> {
    if bytes.is_empty() {
        return Err("Image data is empty.".to_string());
    }

    if bytes.len() > MAX_IMAGE_ASSET_BYTES {
        return Err("Image files must be 10 MB or smaller.".to_string());
    }

    let document_path = PathBuf::from(document_path);
    ensure_markdown_path(&document_path)?;
    policy.ensure_authorized(&document_path)?;

    let extension = image_extension_for_mime_type(&mime_type)?;
    let parent = document_path
        .parent()
        .ok_or_else(|| "The Markdown file does not have a parent directory.".to_string())?;
    let assets_directory = parent.join("assets");
    fs::create_dir_all(&assets_directory)
        .map_err(|error| format!("Failed to create assets directory: {error}"))?;

    let stem = sanitize_image_filename_stem(&file_name);
    let (path, filename) = create_image_asset_file(&assets_directory, &stem, extension, &bytes)?;

    Ok(WrittenImageAssetPayload {
        path: path.to_string_lossy().to_string(),
        relative_path: format!("assets/{filename}"),
        filename,
    })
}

#[tauri::command]
fn reveal_file_in_folder(
    app: AppHandle,
    policy: State<'_, FileAccessPolicy>,
    path: String,
) -> Result<(), String> {
    let path = PathBuf::from(path);
    policy.ensure_authorized(&path)?;
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|error| format!("Failed to reveal file: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_files = collect_opened_files_from_args();
    let startup_files_for_policy = startup_files.clone();
    let builder = tauri::Builder::default()
        .manage(OpenedFiles(Mutex::new(startup_files)))
        .manage(DocxImportRegistry::default())
        .manage(FileWatcherRegistry::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(target_os = "windows")]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![
            take_opened_files,
            open_markdown_file_dialog,
            open_markdown_file_at_path,
            read_markdown_file,
            save_markdown_file,
            check_markdown_file,
            start_markdown_file_watch,
            stop_markdown_file_watch,
            save_markdown_file_dialog,
            export_html_file_dialog,
            export_docx_file_dialog,
            get_docx_import_status,
            select_docx_import_python,
            install_docx_import_dependencies,
            import_docx_file,
            cancel_docx_import,
            read_image_file,
            read_remote_image_file,
            write_image_asset,
            reveal_file_in_folder,
            get_app_distribution
        ])
        .setup(move |app| {
            let policy = FileAccessPolicy::load(app.handle());
            for path in &startup_files_for_policy {
                let _ = policy.approve_markdown_file(path);
            }
            let _ = persist_file_access_policy(app.handle(), &policy);
            app.manage(policy);

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            if let tauri::RunEvent::Opened { urls } = event {
                let files = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter(|path| is_markdown_path(path))
                    .collect::<Vec<_>>();

                if !files.is_empty() {
                    push_opened_files(app, files);
                }
            }

            #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
            let _ = (app, event);
        });
}

fn approve_and_persist_markdown_file(
    app: &AppHandle,
    policy: &FileAccessPolicy,
    path: &Path,
) -> Result<(), String> {
    policy.approve_markdown_file(path)?;
    persist_file_access_policy(app, policy)
}

fn persist_file_access_policy(app: &AppHandle, policy: &FileAccessPolicy) -> Result<(), String> {
    let path = file_access_policy_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!("Failed to create the app configuration directory: {error}")
        })?;
    }

    let content = serde_json::to_string_pretty(&StoredFileAccessPolicy {
        markdown_files: policy.approved_markdown_files()?,
    })
    .map_err(|error| format!("Failed to serialize the file access policy: {error}"))?;
    fs::write(path, content)
        .map_err(|error| format!("Failed to persist the file access policy: {error}"))
}

fn file_access_policy_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(FILE_ACCESS_POLICY_FILENAME)
}

fn read_authorized_markdown_file(
    policy: &FileAccessPolicy,
    path: &Path,
) -> Result<OpenedMarkdownFilePayload, String> {
    ensure_markdown_path(path)?;
    policy.ensure_authorized(path)?;
    let content =
        fs::read_to_string(path).map_err(|error| format!("Failed to read file: {error}"))?;
    policy.activate_document_root(path)?;
    Ok(opened_markdown_payload(path.to_path_buf(), content))
}

fn opened_markdown_payload(path: PathBuf, content: String) -> OpenedMarkdownFilePayload {
    OpenedMarkdownFilePayload {
        path: path.to_string_lossy().to_string(),
        revision: markdown_revision(&content),
        content,
    }
}

fn markdown_revision(content: &str) -> String {
    format!("{:x}", Sha256::digest(content.as_bytes()))
}

fn is_not_found_error(error: &str) -> bool {
    error.contains("os error 2")
        || error.contains("The system cannot find the file")
        || error.contains("No such file")
}

fn normalize_path_for_policy(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        return fs::canonicalize(path)
            .map_err(|error| format!("Failed to resolve file path: {error}"));
    }

    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let file_name = path
        .file_name()
        .ok_or_else(|| "The file path does not include a file name.".to_string())?;
    let parent = fs::canonicalize(parent)
        .map_err(|error| format!("Failed to resolve the parent directory: {error}"))?;
    Ok(parent.join(file_name))
}

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
fn push_opened_files(app: &AppHandle, files: Vec<PathBuf>) {
    let authorized_files = if let Some(policy) = app.try_state::<FileAccessPolicy>() {
        let authorized = files
            .into_iter()
            .filter(|path| policy.approve_markdown_file(path).is_ok())
            .collect::<Vec<_>>();
        let _ = persist_file_access_policy(app, &policy);
        authorized
    } else {
        Vec::new()
    };

    if authorized_files.is_empty() {
        return;
    }

    let payload = authorized_files
        .iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect::<Vec<_>>();

    if let Some(opened_files) = app.try_state::<OpenedFiles>() {
        opened_files
            .0
            .lock()
            .expect("opened file state poisoned")
            .extend(authorized_files);
    }

    let _ = app.emit("opened-files", payload);
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    #[test]
    fn accepts_html_export_paths() {
        assert!(ensure_html_path(Path::new("report.html")).is_ok());
        assert!(ensure_html_path(Path::new("report.htm")).is_ok());
        assert!(ensure_html_path(Path::new("REPORT.HTML")).is_ok());
    }

    #[test]
    fn rejects_non_html_export_paths() {
        assert!(ensure_html_path(Path::new("report.md")).is_err());
        assert!(ensure_html_path(Path::new("report")).is_err());
    }

    #[test]
    fn accepts_docx_export_paths() {
        assert!(ensure_docx_path(Path::new("report.docx")).is_ok());
        assert!(ensure_docx_path(Path::new("REPORT.DOCX")).is_ok());
    }

    #[test]
    fn rejects_non_docx_export_paths() {
        assert!(ensure_docx_path(Path::new("report.doc")).is_err());
        assert!(ensure_docx_path(Path::new("report.md")).is_err());
    }

    #[test]
    fn accepts_supported_image_paths() {
        assert!(ensure_image_path(Path::new("diagram.PNG")).is_ok());
        assert!(ensure_image_path(Path::new("photo.webp")).is_ok());
    }

    #[test]
    fn serializes_image_payload_for_frontend() {
        let payload = ImageFilePayload {
            path: "diagram.png".to_string(),
            data_url: "data:image/png;base64,abc".to_string(),
        };

        let value = serde_json::to_value(payload).expect("image payload should serialize");

        assert_eq!(value["dataUrl"], "data:image/png;base64,abc");
        assert!(value.get("data_url").is_none());
    }

    #[test]
    fn rejects_non_image_paths() {
        assert!(ensure_image_path(Path::new("report.md")).is_err());
    }

    #[test]
    fn accepts_only_supported_image_import_mime_types() {
        assert_eq!(image_extension_for_mime_type("image/png").unwrap(), "png");
        assert_eq!(image_extension_for_mime_type("IMAGE/JPEG").unwrap(), "jpg");
        assert!(image_extension_for_mime_type("image/svg+xml").is_err());
    }

    #[test]
    fn sanitizes_imported_image_file_names() {
        assert_eq!(
            sanitize_image_filename_stem("../report:final.png"),
            "reportfinal"
        );
        assert_eq!(sanitize_image_filename_stem("中文 图片.webp"), "中文 图片");
    }

    #[test]
    fn creates_unique_image_asset_files_without_overwriting() {
        let directory = create_test_directory("image-assets");
        let assets = directory.join("assets");
        fs::create_dir_all(&assets).unwrap();

        let (first_path, first_name) =
            create_image_asset_file(&assets, "photo", "png", b"first").unwrap();
        let (second_path, second_name) =
            create_image_asset_file(&assets, "photo", "png", b"second").unwrap();

        assert_eq!(first_name, "photo.png");
        assert_eq!(second_name, "photo-2.png");
        assert_eq!(fs::read(first_path).unwrap(), b"first");
        assert_eq!(fs::read(second_path).unwrap(), b"second");

        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn authorizes_the_open_document_and_resources_inside_its_directory() {
        let root = create_test_directory("authorized");
        let docs = root.join("docs");
        let outside = root.join("outside");
        fs::create_dir_all(&docs).unwrap();
        fs::create_dir_all(&outside).unwrap();
        let markdown = docs.join("readme.md");
        let image = docs.join("image.png");
        let secret = outside.join("secret.png");
        fs::write(&markdown, "# Safe").unwrap();
        fs::write(&image, b"image").unwrap();
        fs::write(&secret, b"secret").unwrap();

        let policy = FileAccessPolicy::default();
        policy.approve_markdown_file(&markdown).unwrap();

        assert!(policy.is_authorized(&markdown).unwrap());
        assert!(policy.is_authorized(&image).unwrap());
        assert!(!policy.is_authorized(&secret).unwrap());
        assert!(!policy
            .is_authorized(&docs.join("..").join("outside").join("secret.png"))
            .unwrap());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_unapproved_markdown_and_non_markdown_approval() {
        let root = create_test_directory("unapproved");
        let markdown = root.join("private.md");
        let text = root.join("private.txt");
        fs::write(&markdown, "# Private").unwrap();
        fs::write(&text, "Private").unwrap();

        let policy = FileAccessPolicy::default();

        assert_eq!(
            policy.ensure_authorized(&markdown).unwrap_err(),
            FILE_ACCESS_DENIED
        );
        assert!(policy.approve_markdown_file(&text).is_err());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn appends_safe_extensions_to_dialog_paths() {
        assert_eq!(
            ensure_extension(PathBuf::from("report"), "html", is_html_path),
            PathBuf::from("report.html")
        );
        assert_eq!(
            ensure_extension(PathBuf::from("report.txt"), "docx", is_docx_path),
            PathBuf::from("report.txt.docx")
        );
        assert_eq!(
            ensure_extension(PathBuf::from("report.MD"), "md", is_markdown_path),
            PathBuf::from("report.MD")
        );
    }

    #[test]
    fn atomic_write_creates_and_replaces_files() {
        let root = create_test_directory("atomic-write");
        let path = root.join("draft.md");

        atomic_write_file(&path, b"first version").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "first version");

        atomic_write_file(&path, b"second version").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "second version");

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn failed_atomic_write_leaves_no_temporary_file() {
        let root = create_test_directory("atomic-failure");
        let target_directory = root.join("target.md");
        fs::create_dir(&target_directory).unwrap();

        assert!(atomic_write_file(&target_directory, b"new content").is_err());
        assert!(target_directory.is_dir());
        assert_eq!(
            fs::read_dir(&root)
                .unwrap()
                .filter_map(Result::ok)
                .filter(|entry| entry.file_name().to_string_lossy().starts_with(".mdview-"))
                .count(),
            0
        );

        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn atomic_write_inherits_existing_file_permissions() {
        use std::os::unix::fs::PermissionsExt;

        let root = create_test_directory("atomic-permissions");
        let path = root.join("draft.md");
        fs::write(&path, "existing").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o640)).unwrap();

        atomic_write_file(&path, b"replacement").unwrap();

        assert_eq!(
            fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o640
        );
        fs::remove_dir_all(root).unwrap();
    }

    fn create_test_directory(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path =
            std::env::temp_dir().join(format!("mdview-{label}-{}-{nonce}", std::process::id()));
        fs::create_dir_all(&path).unwrap();
        path
    }
}
