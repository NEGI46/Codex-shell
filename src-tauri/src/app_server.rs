use std::{
    io::{BufRead, BufReader, Write},
    path::Path,
    process::{Child, ChildStdin, Command, Stdio},
    thread,
};

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

/// Owns one private stdio app-server child. No TCP listener is created.
pub struct AppServerProcess {
    child: Child,
    stdin: ChildStdin,
    next_request_id: u64,
}

impl AppServerProcess {
    pub fn spawn(app: AppHandle, cwd: &Path) -> Result<Self, String> {
        let mut child = Command::new("codex")
            .args(["app-server", "--listen", "stdio://"])
            .current_dir(cwd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| format!("Codex app-serverを起動できません: {error}"))?;

        let stdin = child
            .stdin
            .take()
            .ok_or("app-server stdinを取得できません")?;
        let stdout = child
            .stdout
            .take()
            .ok_or("app-server stdoutを取得できません")?;
        let stderr = child
            .stderr
            .take()
            .ok_or("app-server stderrを取得できません")?;

        thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let _ = app.emit("codex-event", line);
            }
        });
        thread::spawn(move || {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                let _ = app.emit("codex-log", line);
            }
        });

        let mut process = Self {
            child,
            stdin,
            next_request_id: 1,
        };
        process.write(json!({
            "method": "initialize",
            "id": 0,
            "params": { "clientInfo": { "name": "codex_shell", "title": "Codex Shell", "version": "0.1.0" } }
        }))?;
        process.write(json!({ "method": "initialized", "params": {} }))?;
        Ok(process)
    }

    pub fn start_thread(&mut self, cwd: &Path) -> Result<u64, String> {
        self.request(
            "thread/start",
            json!({
                "cwd": cwd.to_string_lossy(),
                "sandbox": "read-only"
            }),
        )
    }

    pub fn start_turn(&mut self, thread_id: &str, text: &str) -> Result<u64, String> {
        self.request(
            "turn/start",
            json!({
                "threadId": thread_id,
                "input": [{ "type": "text", "text": text }]
            }),
        )
    }

    pub fn interrupt(&mut self, thread_id: &str, turn_id: &str) -> Result<u64, String> {
        self.request(
            "turn/interrupt",
            json!({ "threadId": thread_id, "turnId": turn_id }),
        )
    }

    pub fn is_running(&mut self) -> bool {
        self.child.try_wait().ok().flatten().is_none()
    }

    fn request(&mut self, method: &str, params: Value) -> Result<u64, String> {
        let id = self.next_request_id;
        self.next_request_id += 1;
        self.write(json!({ "method": method, "id": id, "params": params }))?;
        Ok(id)
    }

    fn write(&mut self, value: Value) -> Result<(), String> {
        let encoded = serde_json::to_string(&value).map_err(|error| error.to_string())?;
        self.stdin
            .write_all(encoded.as_bytes())
            .map_err(|error| error.to_string())?;
        self.stdin
            .write_all(b"\n")
            .map_err(|error| error.to_string())?;
        self.stdin.flush().map_err(|error| error.to_string())
    }
}

impl Drop for AppServerProcess {
    fn drop(&mut self) {
        let _ = self.child.kill();
    }
}
