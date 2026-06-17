use std::{
  fs,
  path::{Path, PathBuf},
  sync::Mutex,
};

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use tauri::State;

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use tauri::{AppHandle, Emitter};

struct OpenedFiles(Mutex<Vec<PathBuf>>);

#[derive(Serialize)]
struct ImageFilePayload {
  path: String,
  data_url: String,
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
fn read_markdown_file(path: String) -> Result<String, String> {
  let path = PathBuf::from(path);
  ensure_markdown_path(&path)?;
  fs::read_to_string(&path).map_err(|error| format!("Failed to read file: {error}"))
}

#[tauri::command]
fn write_markdown_file(path: String, content: String) -> Result<(), String> {
  let path = PathBuf::from(path);
  ensure_markdown_path(&path)?;
  fs::write(&path, content).map_err(|error| format!("Failed to write file: {error}"))
}

#[tauri::command]
fn write_html_file(path: String, content: String) -> Result<(), String> {
  let path = PathBuf::from(path);
  ensure_html_path(&path)?;
  fs::write(&path, content).map_err(|error| format!("Failed to write file: {error}"))
}

#[tauri::command]
fn read_image_file(path: String) -> Result<ImageFilePayload, String> {
  let path = PathBuf::from(path);
  ensure_image_path(&path)?;
  let bytes = fs::read(&path).map_err(|error| format!("Failed to read image: {error}"))?;
  let mime_type = image_mime_type(&path)?;
  let encoded = general_purpose::STANDARD.encode(bytes);

  Ok(ImageFilePayload {
    path: path.to_string_lossy().to_string(),
    data_url: format!("data:{mime_type};base64,{encoded}"),
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(OpenedFiles(Mutex::new(collect_opened_files_from_args())))
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      take_opened_files,
      read_markdown_file,
      write_markdown_file,
      write_html_file,
      read_image_file
    ])
    .setup(|app| {
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
  let payload = files
    .iter()
    .map(|path| path.to_string_lossy().to_string())
    .collect::<Vec<_>>();

  if let Some(opened_files) = app.try_state::<OpenedFiles>() {
    opened_files
      .0
      .lock()
      .expect("opened file state poisoned")
      .extend(files);
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

fn ensure_image_path(path: &Path) -> Result<(), String> {
  image_mime_type(path).map(|_| ())
}

fn is_markdown_path(path: &Path) -> bool {
  path
    .extension()
    .and_then(|extension| extension.to_str())
    .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown"))
    .unwrap_or(false)
}

fn is_html_path(path: &Path) -> bool {
  path
    .extension()
    .and_then(|extension| extension.to_str())
    .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "html" | "htm"))
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
  fn accepts_supported_image_paths() {
    assert!(ensure_image_path(Path::new("diagram.PNG")).is_ok());
    assert!(ensure_image_path(Path::new("photo.webp")).is_ok());
  }

  #[test]
  fn rejects_non_image_paths() {
    assert!(ensure_image_path(Path::new("report.md")).is_err());
  }
}
