use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub(crate) const MARKDOWN_FILE_WATCH_EVENT: &str = "markdown-file-watch";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MarkdownFileWatchPayload {
    watch_id: String,
    kind: &'static str,
    path: String,
}

#[derive(Default)]
pub(crate) struct FileWatcherRegistry {
    next_id: AtomicU64,
    watchers: Mutex<HashMap<String, RecommendedWatcher>>,
}

impl FileWatcherRegistry {
    pub(crate) fn start(&self, app: AppHandle, target: PathBuf) -> Result<String, String> {
        let parent = target
            .parent()
            .ok_or_else(|| "The Markdown file does not have a parent directory.".to_string())?
            .to_path_buf();
        let watch_id = format!("markdown-{}", self.next_id.fetch_add(1, Ordering::Relaxed));
        let callback_id = watch_id.clone();
        let callback_path = target.clone();
        let display_path = target.to_string_lossy().to_string();
        let mut watcher =
            notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
                let kind = match result {
                    Ok(event)
                        if event
                            .paths
                            .iter()
                            .any(|path| same_path(path, &callback_path)) =>
                    {
                        "changed"
                    }
                    Ok(_) => return,
                    Err(_) => "error",
                };

                let _ = app.emit(
                    MARKDOWN_FILE_WATCH_EVENT,
                    MarkdownFileWatchPayload {
                        watch_id: callback_id.clone(),
                        kind,
                        path: display_path.clone(),
                    },
                );
            })
            .map_err(|error| format!("Failed to create file watcher: {error}"))?;

        watcher
            .watch(&parent, RecursiveMode::NonRecursive)
            .map_err(|error| format!("Failed to watch Markdown file directory: {error}"))?;

        self.watchers
            .lock()
            .map_err(|_| "File watcher registry lock was poisoned.".to_string())?
            .insert(watch_id.clone(), watcher);
        Ok(watch_id)
    }

    pub(crate) fn stop(&self, watch_id: &str) -> Result<(), String> {
        self.watchers
            .lock()
            .map_err(|_| "File watcher registry lock was poisoned.".to_string())?
            .remove(watch_id);
        Ok(())
    }
}

fn same_path(left: &Path, right: &Path) -> bool {
    if left == right {
        return true;
    }

    match (left.canonicalize(), right.canonicalize()) {
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_only_the_watched_file() {
        let root = std::env::temp_dir().join("mdview-watcher-path-test");
        let target = root.join("document.md");

        assert!(same_path(&target, &target));
        assert!(!same_path(&root.join("other.md"), &target));
    }
}
