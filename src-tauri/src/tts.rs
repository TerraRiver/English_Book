use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use tauri::{AppHandle, Manager};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn cache_file_for(text: &str) -> Result<PathBuf, String> {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    let dir = std::env::temp_dir().join("english-book-piper-cache");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{:x}.wav", hasher.finish())))
}

// Runs the bundled Piper engine as a standalone subprocess (not linked into
// this binary) so espeak-ng's GPL-3 phonemizer never becomes part of the
// compiled app — see resources/piper/THIRD_PARTY_NOTICES.txt.
#[tauri::command]
pub fn speak_piper(app: AppHandle, text: String) -> Result<tauri::ipc::Response, String> {
    let text = text.trim();
    if text.is_empty() {
        return Err("empty text".into());
    }

    let cache_file = cache_file_for(text)?;
    if !cache_file.exists() {
        let piper_dir = app
            .path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("piper");

        let mut command = Command::new(piper_dir.join("piper.exe"));
        command
            .arg("--model")
            .arg(piper_dir.join("voices").join("en_US-ljspeech-medium.onnx"))
            .arg("--espeak_data")
            .arg(piper_dir.join("espeak-ng-data"))
            .arg("--output_file")
            .arg(&cache_file)
            .arg("--quiet")
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = command.spawn().map_err(|e| format!("failed to start piper: {e}"))?;
        child
            .stdin
            .take()
            .ok_or("no stdin")?
            .write_all(text.as_bytes())
            .map_err(|e| e.to_string())?;

        let output = child.wait_with_output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("piper exited with {}: {stderr}", output.status));
        }
    }

    let bytes = fs::read(&cache_file).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}
