use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::fs_utils::ensure_docx_path;

const MARKITDOWN_VERSION: &str = "0.1.6";
const MAX_DOCX_BYTES: u64 = 50 * 1024 * 1024;
const MAX_MARKDOWN_BYTES: u64 = 50 * 1024 * 1024;
const SETTINGS_FILENAME: &str = "docx-import.json";
const READY_FILENAME: &str = ".mdview-ready";
const BRIDGE: &str = include_str!("../resources/markitdown_bridge.py");

#[derive(Default)]
pub struct DocxImportRegistry {
    child: Mutex<Option<Child>>,
    environment: Mutex<Option<CachedEnvironment>>,
}

#[derive(Clone)]
struct PythonRuntime {
    executable: PathBuf,
    version: String,
}

#[derive(Clone)]
struct CachedEnvironment {
    python: PythonRuntime,
    ready: bool,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    python_path: Option<PathBuf>,
    python_version: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    state: &'static str,
    python_path: Option<String>,
    python_version: Option<String>,
    message: Option<String>,
    can_install_python: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedFile {
    source_path: String,
    suggested_filename: String,
    content: String,
}

impl DocxImportRegistry {
    fn run(&self, mut command: Command) -> Result<(), String> {
        if self
            .child
            .lock()
            .map_err(|_| "Import task lock was poisoned.".to_string())?
            .is_some()
        {
            return Err("Another Word import task is already running.".to_string());
        }
        configure_background_command(&mut command);
        command.stdout(Stdio::piped()).stderr(Stdio::piped());
        let mut child = command
            .spawn()
            .map_err(|error| format!("Could not start process: {error}"))?;
        let stdout = child.stdout.take().map(read_stream);
        let stderr = child.stderr.take().map(read_stream);

        {
            let mut active = self
                .child
                .lock()
                .map_err(|_| "Import task lock was poisoned.".to_string())?;
            *active = Some(child);
        }

        let status = loop {
            let result = {
                let mut active = self
                    .child
                    .lock()
                    .map_err(|_| "Import task lock was poisoned.".to_string())?;
                let Some(child) = active.as_mut() else {
                    return Err("Word import was cancelled.".to_string());
                };
                child
                    .try_wait()
                    .map_err(|error| format!("Could not wait for process: {error}"))?
            };
            if let Some(status) = result {
                break status;
            }
            thread::sleep(Duration::from_millis(120));
        };

        self.child
            .lock()
            .map_err(|_| "Import task lock was poisoned.".to_string())?
            .take();
        let output = stdout
            .and_then(|reader| reader.join().ok())
            .unwrap_or_default();
        let errors = stderr
            .and_then(|reader| reader.join().ok())
            .unwrap_or_default();
        if status.success() {
            return Ok(());
        }

        let details = if errors.trim().is_empty() {
            output
        } else {
            errors
        };
        Err(format!("Process failed: {}", truncate_message(&details)))
    }

    pub fn cancel(&self) -> Result<(), String> {
        let mut active = self
            .child
            .lock()
            .map_err(|_| "Import task lock was poisoned.".to_string())?;
        if let Some(child) = active.as_mut() {
            let _ = child.kill();
        }
        Ok(())
    }

    fn cached_environment(&self) -> Result<Option<CachedEnvironment>, String> {
        self.environment
            .lock()
            .map(|environment| environment.clone())
            .map_err(|_| "Import environment lock was poisoned.".to_string())
    }

    fn cache_environment(&self, python: PythonRuntime, ready: bool) -> Result<(), String> {
        *self
            .environment
            .lock()
            .map_err(|_| "Import environment lock was poisoned.".to_string())? =
            Some(CachedEnvironment { python, ready });
        Ok(())
    }

    fn clear_environment(&self) -> Result<(), String> {
        *self
            .environment
            .lock()
            .map_err(|_| "Import environment lock was poisoned.".to_string())? = None;
        Ok(())
    }
}

pub fn get_status(app: &AppHandle, registry: &DocxImportRegistry) -> Result<Status, String> {
    if let Some(environment) = registry.cached_environment()? {
        let state = if environment.ready {
            "ready"
        } else {
            "componentsMissing"
        };
        return Ok(status(
            state,
            Some(&environment.python),
            None,
            can_install_python(),
        ));
    }
    let Some(python) = find_python(app)? else {
        return Ok(status("pythonMissing", None, None, can_install_python()));
    };
    if !is_supported_version(&python.version) {
        return Ok(status(
            "pythonUnsupported",
            Some(&python),
            None,
            can_install_python(),
        ));
    }
    let package_dir = package_dir(app, &python.version)?;
    if converter_is_marked_ready(&package_dir) {
        registry.cache_environment(python.clone(), true)?;
        return Ok(status("ready", Some(&python), None, can_install_python()));
    }
    match check_packages(&python, &package_dir) {
        Ok(()) => {
            mark_converter_ready(&package_dir)?;
            registry.cache_environment(python.clone(), true)?;
            Ok(status("ready", Some(&python), None, can_install_python()))
        }
        Err(message) if package_dir.exists() => Ok(status(
            "componentsBroken",
            Some(&python),
            Some(message),
            can_install_python(),
        )),
        Err(_) => Ok(status(
            "componentsMissing",
            Some(&python),
            None,
            can_install_python(),
        )),
    }
}

pub fn select_python(app: &AppHandle, registry: &DocxImportRegistry) -> Result<Status, String> {
    let dialog = app.dialog().file();
    let Some(file) = dialog.blocking_pick_file() else {
        return get_status(app, registry);
    };
    let path = file
        .into_path()
        .map_err(|_| "The selected Python executable must be a local file.".to_string())?;
    let python = inspect_python(&path)?;
    save_settings(
        app,
        &Settings {
            python_path: Some(python.executable),
            python_version: Some(python.version),
        },
    )?;
    registry.clear_environment()?;
    get_status(app, registry)
}

pub fn install(app: &AppHandle, registry: &DocxImportRegistry) -> Result<Status, String> {
    registry.clear_environment()?;
    let python = match find_python(app)? {
        Some(python) if is_supported_version(&python.version) => python,
        _ => {
            install_python(registry)?;
            find_python(app)?
                .filter(|python| is_supported_version(&python.version))
                .ok_or_else(|| {
                    "Python was installed but is not available yet. Restart MDView, then try again."
                        .to_string()
                })?
        }
    };

    let target = package_dir(app, &python.version)?;
    let staging = target.with_extension(format!("install-{}", unique_suffix()));
    fs::create_dir_all(&staging)
        .map_err(|error| format!("Could not prepare converter directory: {error}"))?;
    let mut command = Command::new(&python.executable);
    command
        .args([
            "-m",
            "pip",
            "--isolated",
            "install",
            "--disable-pip-version-check",
            "--no-input",
            "--only-binary=:all:",
            "--upgrade",
            "--target",
        ])
        .arg(&staging)
        .arg(format!("markitdown[docx]=={MARKITDOWN_VERSION}"));
    let result = registry.run(command);
    if let Err(error) = result {
        let _ = fs::remove_dir_all(&staging);
        return Err(error);
    }
    check_packages(&python, &staging)?;
    mark_converter_ready(&staging)?;

    if target.exists() {
        let backup = target.with_extension(format!("backup-{}", unique_suffix()));
        fs::rename(&target, &backup)
            .map_err(|error| format!("Could not update converter: {error}"))?;
        if let Err(error) = fs::rename(&staging, &target) {
            let _ = fs::rename(&backup, &target);
            return Err(format!("Could not activate converter: {error}"));
        }
        let _ = fs::remove_dir_all(backup);
    } else {
        fs::rename(&staging, &target)
            .map_err(|error| format!("Could not activate converter: {error}"))?;
    }
    registry.cache_environment(python.clone(), true)?;
    Ok(status("ready", Some(&python), None, can_install_python()))
}

pub fn import_file(
    app: &AppHandle,
    registry: &DocxImportRegistry,
) -> Result<Option<ImportedFile>, String> {
    let environment = match registry.cached_environment()? {
        Some(environment) if environment.ready => environment,
        _ => {
            let current_status = get_status(app, registry)?;
            if current_status.state != "ready" {
                return Err(
                    "The local Word converter is not ready. Install or repair it first."
                        .to_string(),
                );
            }
            registry.cached_environment()?.ok_or_else(|| {
                "The local Word converter environment could not be loaded.".to_string()
            })?
        }
    };
    if !environment.ready {
        return Err(
            "The local Word converter is not ready. Install or repair it first.".to_string(),
        );
    }
    let selected = app
        .dialog()
        .file()
        .add_filter("Word Document", &["docx"])
        .blocking_pick_file();
    let Some(file) = selected else {
        return Ok(None);
    };
    let source = file
        .into_path()
        .map_err(|_| "The selected item is not a local file path.".to_string())?;
    ensure_docx_path(&source)?;
    let metadata = fs::metadata(&source)
        .map_err(|error| format!("Could not inspect Word document: {error}"))?;
    if metadata.len() > MAX_DOCX_BYTES {
        return Err("Word documents larger than 50 MB cannot be imported.".to_string());
    }
    let python = environment.python;
    let packages = package_dir(app, &python.version)?;
    let work_dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("docx-import")
        .join(unique_suffix());
    fs::create_dir_all(&work_dir)
        .map_err(|error| format!("Could not prepare conversion: {error}"))?;
    let bridge = work_dir.join("convert.py");
    let output = work_dir.join("document.md");
    fs::write(&bridge, BRIDGE).map_err(|error| format!("Could not prepare converter: {error}"))?;

    let mut command = Command::new(&python.executable);
    command
        .arg("-I")
        .arg(&bridge)
        .arg(&packages)
        .arg(&source)
        .arg(&output);
    let result = registry.run(command);
    if let Err(error) = result {
        let _ = fs::remove_dir_all(&work_dir);
        return Err(error);
    }
    let output_size = fs::metadata(&output)
        .map_err(|error| format!("Conversion did not produce Markdown: {error}"))?
        .len();
    if output_size > MAX_MARKDOWN_BYTES {
        let _ = fs::remove_dir_all(&work_dir);
        return Err("Converted Markdown is larger than 50 MB.".to_string());
    }
    let content = fs::read_to_string(&output)
        .map_err(|error| format!("Could not read converted Markdown: {error}"))?;
    let _ = fs::remove_dir_all(&work_dir);
    let suggested_filename = format!(
        "{}.md",
        source
            .file_stem()
            .and_then(|value| value.to_str())
            .filter(|value| !value.is_empty())
            .unwrap_or("document")
    );
    Ok(Some(ImportedFile {
        source_path: source.to_string_lossy().to_string(),
        suggested_filename,
        content,
    }))
}

fn status(
    state: &'static str,
    python: Option<&PythonRuntime>,
    message: Option<String>,
    can_install_python: bool,
) -> Status {
    Status {
        state,
        python_path: python.map(|value| value.executable.to_string_lossy().to_string()),
        python_version: python.map(|value| value.version.clone()),
        message,
        can_install_python,
    }
}

fn find_python(app: &AppHandle) -> Result<Option<PythonRuntime>, String> {
    let settings = load_settings(app);
    if let (Some(path), Some(version)) = (&settings.python_path, &settings.python_version) {
        if path.is_file() && is_supported_version(version) {
            return Ok(Some(PythonRuntime {
                executable: path.clone(),
                version: version.clone(),
            }));
        }
    }
    if let Some(path) = settings.python_path {
        if let Ok(python) = inspect_python(&path) {
            remember_python(app, &python);
            return Ok(Some(python));
        }
    }
    for candidate in python_candidates() {
        if let Ok(python) = inspect_python(&candidate) {
            remember_python(app, &python);
            return Ok(Some(python));
        }
    }
    if let Ok(path) = command_output("py", &["-3", "-c", "import sys; print(sys.executable)"]) {
        if let Ok(python) = inspect_python(Path::new(path.trim())) {
            remember_python(app, &python);
            return Ok(Some(python));
        }
    }
    Ok(None)
}

fn python_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![PathBuf::from("python3"), PathBuf::from("python")];
    #[cfg(target_os = "windows")]
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        candidates.push(PathBuf::from(local_app_data).join("Programs/Python/Python312/python.exe"));
        candidates.push(
            PathBuf::from(std::env::var_os("LOCALAPPDATA").unwrap())
                .join("Programs/Python/Python311/python.exe"),
        );
    }
    #[cfg(target_os = "macos")]
    candidates.extend([
        PathBuf::from("/opt/homebrew/bin/python3.12"),
        PathBuf::from("/usr/local/bin/python3.12"),
    ]);
    candidates
}

fn inspect_python(executable: &Path) -> Result<PythonRuntime, String> {
    let output = command_output(executable, &["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}'); print(sys.executable)"])?;
    let mut lines = output.lines();
    let version = lines
        .next()
        .ok_or_else(|| "Python did not report a version.".to_string())?
        .trim()
        .to_string();
    let actual_path = lines
        .next()
        .map(PathBuf::from)
        .unwrap_or_else(|| executable.to_path_buf());
    Ok(PythonRuntime {
        executable: actual_path,
        version,
    })
}

fn command_output(executable: impl AsRef<Path>, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new(executable.as_ref());
    configure_background_command(&mut command);
    let output = command
        .args(args)
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn check_packages(python: &PythonRuntime, package_dir: &Path) -> Result<(), String> {
    if !package_dir.is_dir() {
        return Err("The converter package directory is missing.".to_string());
    }
    let package_dir = package_dir
        .to_string_lossy()
        .replace('\\', "\\\\")
        .replace('\'', "\\'");
    command_output(&python.executable, &["-I", "-c", &format!("import sys; sys.path.insert(0, r'{package_dir}'); import markitdown, mammoth, lxml; print(markitdown.__version__)")]).map(|_| ())
}

fn converter_is_marked_ready(package_dir: &Path) -> bool {
    package_dir.join(READY_FILENAME).is_file()
}

fn mark_converter_ready(package_dir: &Path) -> Result<(), String> {
    fs::write(package_dir.join(READY_FILENAME), MARKITDOWN_VERSION)
        .map_err(|error| format!("Could not record converter readiness: {error}"))
}

fn install_python(registry: &DocxImportRegistry) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("winget");
        command.args([
            "install",
            "--id",
            "Python.Python.3.12",
            "--exact",
            "--scope",
            "user",
            "--accept-source-agreements",
            "--accept-package-agreements",
            "--disable-interactivity",
        ]);
        return registry.run(command);
    }
    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("brew");
        command.args(["install", "python@3.12"]);
        return registry.run(command);
    }
    #[allow(unreachable_code)]
    Err("Automatic Python installation is supported on Windows and macOS only.".to_string())
}

fn can_install_python() -> bool {
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("winget");
        configure_background_command(&mut command);
        command.arg("--version").output().is_ok()
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("brew").arg("--version").output().is_ok()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        false
    }
}

fn configure_background_command(command: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

fn package_dir(app: &AppHandle, version: &str) -> Result<PathBuf, String> {
    let version_key = version.split('.').take(2).collect::<Vec<_>>().join(".");
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("markitdown")
        .join(MARKITDOWN_VERSION)
        .join(format!(
            "python-{version_key}-{}-{}",
            std::env::consts::OS,
            std::env::consts::ARCH
        ))
        .join("site-packages"))
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(SETTINGS_FILENAME))
}
fn load_settings(app: &AppHandle) -> Settings {
    settings_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}
fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(
        path,
        serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}
fn remember_python(app: &AppHandle, python: &PythonRuntime) {
    let _ = save_settings(
        app,
        &Settings {
            python_path: Some(python.executable.clone()),
            python_version: Some(python.version.clone()),
        },
    );
}
fn is_supported_version(version: &str) -> bool {
    let mut parts = version
        .split('.')
        .filter_map(|value| value.parse::<u32>().ok());
    matches!((parts.next(), parts.next()), (Some(major), Some(minor)) if major > 3 || (major == 3 && minor >= 10))
}
fn unique_suffix() -> String {
    format!(
        "{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    )
}
fn read_stream(mut stream: impl Read + Send + 'static) -> thread::JoinHandle<String> {
    thread::spawn(move || {
        let mut text = String::new();
        let _ = stream.read_to_string(&mut text);
        text
    })
}
fn truncate_message(message: &str) -> String {
    message.trim().chars().take(2000).collect()
}
