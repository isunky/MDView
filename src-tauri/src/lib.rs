use std::{
    collections::HashSet,
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::{DialogExt, FileDialogBuilder};
use tauri_plugin_opener::OpenerExt;

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use tauri::Emitter;

const FILE_ACCESS_POLICY_FILENAME: &str = "approved-markdown-files.json";
const FILE_ACCESS_DENIED: &str =
    "File access denied. Open or select the file in MDView before accessing it.";

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
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageFilePayload {
    path: String,
    data_url: String,
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
fn write_markdown_file(
    policy: State<'_, FileAccessPolicy>,
    path: String,
    content: String,
) -> Result<(), String> {
    let path = PathBuf::from(path);
    ensure_markdown_path(&path)?;
    policy.ensure_authorized(&path)?;
    fs::write(&path, content).map_err(|error| format!("Failed to write file: {error}"))
}

#[tauri::command]
async fn save_markdown_file_dialog(
    app: AppHandle,
    policy: State<'_, FileAccessPolicy>,
    content: String,
    default_path: String,
) -> Result<Option<String>, String> {
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

    fs::write(&path, content).map_err(|error| format!("Failed to write file: {error}"))?;
    approve_and_persist_markdown_file(&app, &policy, &path)?;
    Ok(Some(path.to_string_lossy().to_string()))
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

#[tauri::command]
fn get_app_distribution() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        return if is_portable_distribution() {
            "windows-portable"
        } else {
            "windows-installed"
        };
    }

    #[cfg(not(target_os = "windows"))]
    {
        "unsupported"
    }
}

#[cfg(target_os = "windows")]
fn is_portable_distribution() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|executable| executable.parent().map(Path::to_path_buf))
        .is_some_and(|directory| directory.join("MDView.portable").is_file())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_files = collect_opened_files_from_args();
    let startup_files_for_policy = startup_files.clone();
    let builder = tauri::Builder::default()
        .manage(OpenedFiles(Mutex::new(startup_files)))
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
            write_markdown_file,
            save_markdown_file_dialog,
            export_html_file_dialog,
            export_docx_file_dialog,
            read_image_file,
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
        content,
    }
}

fn configure_default_path<R: tauri::Runtime>(
    mut dialog: FileDialogBuilder<R>,
    default_path: &Path,
) -> FileDialogBuilder<R> {
    if let Some(parent) = default_path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        dialog = dialog.set_directory(parent);
    }

    if let Some(file_name) = default_path.file_name() {
        dialog = dialog.set_file_name(file_name.to_string_lossy());
    }

    dialog
}

fn ensure_extension(path: PathBuf, extension: &str, is_allowed_path: fn(&Path) -> bool) -> PathBuf {
    if is_allowed_path(&path) {
        return path;
    }

    let mut value = OsString::from(path.as_os_str());
    value.push(format!(".{extension}"));
    PathBuf::from(value)
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

fn collect_opened_files_from_args() -> Vec<PathBuf> {
    std::env::args()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .filter_map(|arg| {
            if arg.starts_with("file://") {
                url::Url::parse(&arg).ok()?.to_file_path().ok()
            } else {
                Some(PathBuf::from(arg))
            }
        })
        .filter(|path| is_markdown_path(path))
        .collect()
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

fn ensure_markdown_path(path: &Path) -> Result<(), String> {
    if is_markdown_path(path) {
        Ok(())
    } else {
        Err("Only Markdown files with .md or .markdown extensions are supported.".to_string())
    }
}

fn ensure_html_path(path: &Path) -> Result<(), String> {
    if is_html_path(path) {
        Ok(())
    } else {
        Err("Only HTML files with .html or .htm extensions are supported.".to_string())
    }
}

fn ensure_docx_path(path: &Path) -> Result<(), String> {
    if is_docx_path(path) {
        Ok(())
    } else {
        Err("Only Word documents with .docx extensions are supported.".to_string())
    }
}

fn ensure_image_path(path: &Path) -> Result<(), String> {
    image_mime_type(path).map(|_| ())
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown"))
        .unwrap_or(false)
}

fn is_html_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "html" | "htm"))
        .unwrap_or(false)
}

fn is_docx_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("docx"))
        .unwrap_or(false)
}

fn image_mime_type(path: &Path) -> Result<&'static str, String> {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => Ok("image/png"),
        Some("jpg") | Some("jpeg") => Ok("image/jpeg"),
        Some("gif") => Ok("image/gif"),
        Some("webp") => Ok("image/webp"),
        Some("bmp") => Ok("image/bmp"),
        Some("svg") => Ok("image/svg+xml"),
        Some("avif") => Ok("image/avif"),
        _ => Err("Only common image files are supported.".to_string()),
    }
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
