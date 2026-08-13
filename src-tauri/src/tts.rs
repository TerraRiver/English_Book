use std::collections::hash_map::DefaultHasher;
use std::ffi::OsString;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

use tauri::{AppHandle, Manager};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// sherpa-onnx-offline-tts.exe parses argv through a narrow (non-Unicode-aware)
// entry point, so any non-ASCII character in a path argument — like "词忆" in
// this app's own install path — gets mangled into "?" and the file can't be
// found. Work around it with an NTFS junction: a plain-ASCII path under
// %TEMP% that transparently redirects to the real (Chinese-containing)
// resource directory at the filesystem level, so the exe never sees the
// non-ASCII characters at all. Junctions (unlike symlinks) don't need admin
// rights or Developer Mode.
// %TEMP% is itself under the user's profile folder, which is usually but not
// guaranteed to be ASCII (a non-Latin display name can produce a non-ASCII
// profile folder). Fall back to the machine-wide, always-ASCII ProgramData
// directory in that case.
fn ascii_safe_base_dir() -> PathBuf {
    let temp = std::env::temp_dir();
    if temp.to_str().is_some_and(|s| s.is_ascii()) {
        return temp;
    }
    std::env::var_os("ProgramData").map(PathBuf::from).unwrap_or(temp)
}

fn ascii_resource_dir(real_dir: &Path) -> Result<PathBuf, String> {
    static LINK: OnceLock<Result<PathBuf, String>> = OnceLock::new();
    LINK.get_or_init(|| {
        let link = ascii_safe_base_dir().join("english-book-sherpa-link");
        if link.exists() {
            return Ok(link);
        }
        let mut command = Command::new("cmd");
        command.args(["/C", "mklink", "/J"]).arg(&link).arg(real_dir);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(CREATE_NO_WINDOW);
        }
        let output = command.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(format!(
                "failed to create resource junction: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Ok(link)
    })
    .clone()
}

// sherpa-onnx-offline-tts.exe's option parser only accepts the `--flag=value`
// form as a single argv token; a separate `--flag` `value` pair (the usual
// two-token style) is rejected with "Invalid option --flag".
fn flag(name: &str, value: impl AsRef<std::ffi::OsStr>) -> OsString {
    let mut arg = OsString::from(name);
    arg.push("=");
    arg.push(value);
    arg
}

// `resource_dir()` returns a Windows extended-length ("verbatim", \\?\-prefixed)
// path. sherpa-onnx-offline-tts.exe builds paths like `data_dir + "/phontab"`
// internally, and Windows doesn't normalize forward slashes in verbatim paths,
// so it ends up looking for a literal `...\espeak-ng-data/phontab` and fails.
// Our own paths are always well under MAX_PATH, so the extended-length form
// isn't needed here — strip it back to a plain path before handing it off.
fn strip_verbatim_prefix(path: PathBuf) -> PathBuf {
    match path.to_str() {
        Some(s) => match s.strip_prefix(r"\\?\") {
            Some(rest) => PathBuf::from(rest),
            None => path,
        },
        None => path,
    }
}

fn cache_file_for(text: &str) -> Result<PathBuf, String> {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    // Also kept ASCII-only, since this path is passed as a CLI arg to the
    // same exe (see ascii_resource_dir above).
    let dir = ascii_safe_base_dir().join("english-book-tts-cache");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{:x}.wav", hasher.finish())))
}

// Runs the bundled sherpa-onnx engine as a standalone subprocess (not linked
// into this binary) so espeak-ng's GPL-3 phonemizer never becomes part of the
// compiled app — see resources/sherpa/THIRD_PARTY_NOTICES.txt.
//
// Spawning the subprocess and waiting for it to finish can take a noticeable
// amount of time; since this command isn't marked async, Tauri runs it
// synchronously on the IPC-handling thread, so the blocking work is pushed
// onto a background thread explicitly to avoid freezing the UI.
#[tauri::command]
pub async fn speak_tts(app: AppHandle, text: String) -> Result<tauri::ipc::Response, String> {
    tauri::async_runtime::spawn_blocking(move || speak_tts_blocking(app, text))
        .await
        .map_err(|e| e.to_string())?
}

fn speak_tts_blocking(app: AppHandle, text: String) -> Result<tauri::ipc::Response, String> {
    let text = text.trim();
    if text.is_empty() {
        return Err("empty text".into());
    }

    let cache_file = cache_file_for(text)?;
    if !cache_file.exists() {
        let real_sherpa_dir = strip_verbatim_prefix(
            app.path()
                .resource_dir()
                .map_err(|e| e.to_string())?
                .join("sherpa"),
        );
        let sherpa_dir = ascii_resource_dir(&real_sherpa_dir)?;
        let voice_dir = sherpa_dir.join("voices");

        let mut command = Command::new(sherpa_dir.join("sherpa-onnx-offline-tts.exe"));
        command
            .arg(flag("--vits-model", voice_dir.join("en_US-ljspeech-medium.onnx")))
            .arg(flag("--vits-tokens", voice_dir.join("tokens.txt")))
            .arg(flag("--vits-data-dir", sherpa_dir.join("espeak-ng-data")))
            .arg(flag("--output-filename", &cache_file))
            .arg(text);

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command
            .output()
            .map_err(|e| format!("failed to start sherpa-onnx-offline-tts: {e}"))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("sherpa-onnx-offline-tts exited with {}: {stderr}", output.status));
        }
    }

    let bytes = fs::read(&cache_file).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}
