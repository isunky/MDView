use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub(crate) fn image_extension_for_mime_type(mime_type: &str) -> Result<&'static str, String> {
    match mime_type.to_ascii_lowercase().as_str() {
        "image/png" => Ok("png"),
        "image/jpeg" => Ok("jpg"),
        "image/gif" => Ok("gif"),
        "image/webp" => Ok("webp"),
        "image/bmp" => Ok("bmp"),
        "image/avif" => Ok("avif"),
        _ => Err("Only PNG, JPEG, GIF, WebP, BMP, and AVIF images can be imported.".to_string()),
    }
}

pub(crate) fn sanitize_image_filename_stem(file_name: &str) -> String {
    let source = Path::new(file_name)
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or_default();
    let cleaned = source
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, ' ' | '-' | '_'))
        .take(72)
        .collect::<String>()
        .trim_matches(|character: char| matches!(character, ' ' | '.' | '-'))
        .to_string();
    if cleaned.is_empty() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or(0);
        format!("pasted-image-{timestamp}")
    } else {
        cleaned
    }
}

pub(crate) fn create_image_asset_file(
    assets_directory: &Path,
    stem: &str,
    extension: &str,
    bytes: &[u8],
) -> Result<(PathBuf, String), String> {
    for index in 1..10_000 {
        let filename = if index == 1 {
            format!("{stem}.{extension}")
        } else {
            format!("{stem}-{index}.{extension}")
        };
        let path = assets_directory.join(&filename);
        match fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
        {
            Ok(mut file) => {
                if let Err(error) = file.write_all(bytes) {
                    let _ = fs::remove_file(&path);
                    return Err(format!("Failed to write image: {error}"));
                }
                return Ok((path, filename));
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("Failed to create image file: {error}")),
        }
    }
    Err("Unable to allocate a unique image file name.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sanitizes_names() {
        assert_eq!(
            sanitize_image_filename_stem("../report:final.png"),
            "reportfinal"
        );
    }
    #[test]
    fn creates_unique_files() {
        let directory = tempfile::tempdir().unwrap();
        let (_, first) =
            create_image_asset_file(directory.path(), "photo", "png", b"first").unwrap();
        let (_, second) =
            create_image_asset_file(directory.path(), "photo", "png", b"second").unwrap();
        assert_eq!(
            (first.as_str(), second.as_str()),
            ("photo.png", "photo-2.png")
        );
    }
}
