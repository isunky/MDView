#[tauri::command]
pub(crate) fn get_app_distribution() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        if is_portable_distribution() {
            "windows-portable"
        } else {
            "windows-installed"
        }
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
        .and_then(|path| path.parent().map(std::path::Path::to_path_buf))
        .is_some_and(|directory| directory.join("MDView.portable").is_file())
}
