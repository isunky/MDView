#[cfg(any(target_os = "macos", target_os = "windows"))]
use font_kit::source::SystemSource;

#[tauri::command]
pub(crate) fn list_system_font_families() -> Result<Vec<String>, String> {
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let mut families = SystemSource::new()
            .all_families()
            .map_err(|error| format!("Failed to enumerate system fonts: {error}"))?;
        families.sort_by_cached_key(|family| family.to_lowercase());
        families.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
        return Ok(families);
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok(Vec::new())
    }
}
