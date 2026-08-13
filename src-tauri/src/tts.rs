use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::process::Command;

use tauri::{AppHandle, Manager};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn cache_file_for(text: &str) -> Result<PathBuf, String> {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    let dir = std::env::temp_dir().join("english-book-tts-cache");
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
        let sherpa_dir = app
            .path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("sherpa");
        let voice_dir = sherpa_dir.join("voices");

        let mut command = Command::new(sherpa_dir.join("sherpa-onnx-offline-tts.exe"));
        command
            .arg("--vits-model")
            .arg(voice_dir.join("en_US-ljspeech-medium.onnx"))
            .arg("--vits-tokens")
            .arg(voice_dir.join("tokens.txt"))
            .arg("--vits-data-dir")
            .arg(sherpa_dir.join("espeak-ng-data"))
            .arg("--output-filename")
            .arg(&cache_file)
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
