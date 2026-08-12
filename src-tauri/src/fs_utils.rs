use std::{
    ffi::OsString,
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
};
use tauri_plugin_dialog::FileDialogBuilder;

pub(crate) fn atomic_write_file(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    let permissions = fs::metadata(path)
        .ok()
        .map(|metadata| metadata.permissions());
    let mut temporary = tempfile::Builder::new()
        .prefix(".mdview-")
        .tempfile_in(parent)?;
    temporary.write_all(bytes)?;
    temporary.as_file().sync_all()?;
    if let Some(permissions) = permissions {
        temporary.as_file().set_permissions(permissions)?;
    }
    temporary.persist(path).map_err(|error| error.error)?;
    #[cfg(unix)]
    {
        let _ = fs::File::open(parent).and_then(|directory| directory.sync_all());
    }
    Ok(())
}

pub(crate) fn configure_default_path<R: tauri::Runtime>(
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

pub(crate) fn ensure_extension(
    path: PathBuf,
    extension: &str,
    is_allowed_path: fn(&Path) -> bool,
) -> PathBuf {
    if is_allowed_path(&path) {
        return path;
    }
    let mut value = OsString::from(path.as_os_str());
    value.push(format!(".{extension}"));
    PathBuf::from(value)
}

pub(crate) fn ensure_markdown_path(path: &Path) -> Result<(), String> {
    if is_markdown_path(path) {
        Ok(())
    } else {
        Err("Only Markdown files with .md or .markdown extensions are supported.".to_string())
    }
}
pub(crate) fn ensure_html_path(path: &Path) -> Result<(), String> {
    if is_html_path(path) {
        Ok(())
    } else {
        Err("Only HTML files with .html or .htm extensions are supported.".to_string())
    }
}
pub(crate) fn ensure_docx_path(path: &Path) -> Result<(), String> {
    if is_docx_path(path) {
        Ok(())
    } else {
        Err("Only Word documents with .docx extensions are supported.".to_string())
    }
}
pub(crate) fn ensure_image_path(path: &Path) -> Result<(), String> {
    image_mime_type(path).map(|_| ())
}
pub(crate) fn is_markdown_path(path: &Path) -> bool {
    has_extension(path, &["md", "markdown"])
}
pub(crate) fn is_html_path(path: &Path) -> bool {
    has_extension(path, &["html", "htm"])
}
pub(crate) fn is_docx_path(path: &Path) -> bool {
    has_extension(path, &["docx"])
}

fn has_extension(path: &Path, allowed: &[&str]) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            allowed
                .iter()
                .any(|allowed| extension.eq_ignore_ascii_case(allowed))
        })
}

pub(crate) fn image_mime_type(path: &Path) -> Result<&'static str, String> {
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
    fn validates_export_extensions() {
        assert!(ensure_html_path(Path::new("report.HTML")).is_ok());
        assert!(ensure_docx_path(Path::new("report.docx")).is_ok());
        assert!(ensure_html_path(Path::new("report.md")).is_err());
    }
    #[test]
    fn appends_safe_extensions() {
        assert_eq!(
            ensure_extension(PathBuf::from("report"), "html", is_html_path),
            PathBuf::from("report.html")
        );
    }
    #[test]
    fn atomic_write_replaces_files() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("draft.md");
        atomic_write_file(&path, b"first").unwrap();
        atomic_write_file(&path, b"second").unwrap();
        assert_eq!(fs::read_to_string(path).unwrap(), "second");
    }
}
