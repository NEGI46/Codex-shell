mod app_server;

use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
};

use serde::Serialize;
use tauri::{AppHandle, State};
use uuid::Uuid;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Project {
    id: String,
    name: String,
    path: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeSession {
    id: String,
    project_id: String,
    external_thread_id: Option<String>,
    status: String,
}

struct ShellState {
    projects: Mutex<Vec<Project>>,
    sessions: Mutex<HashMap<String, NativeSession>>,
    runtime: Mutex<Option<app_server::AppServerProcess>>,
}

impl Default for ShellState {
    fn default() -> Self {
        Self {
            projects: Mutex::new(Vec::new()),
            sessions: Mutex::new(HashMap::new()),
            runtime: Mutex::new(None),
        }
    }
}

fn canonical_project_root(raw_path: &str) -> Result<PathBuf, String> {
    let path = Path::new(raw_path);
    let root = path
        .canonicalize()
        .map_err(|_| "プロジェクトフォルダが見つかりません".to_string())?;
    if !root.is_dir() {
        return Err("プロジェクトパスはフォルダである必要があります".to_string());
    }
    Ok(root)
}

#[tauri::command]
fn register_project(
    state: State<ShellState>,
    name: String,
    path: String,
) -> Result<Project, String> {
    let root = canonical_project_root(&path)?;
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name,
        path: root.to_string_lossy().to_string(),
    };
    state
        .projects
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .push(project.clone());
    Ok(project)
}

#[tauri::command]
fn list_projects(state: State<ShellState>) -> Result<Vec<Project>, String> {
    Ok(state
        .projects
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .clone())
}

#[tauri::command]
fn create_session(state: State<ShellState>, project_id: String) -> Result<NativeSession, String> {
    let projects = state
        .projects
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    if !projects.iter().any(|project| project.id == project_id) {
        return Err("未登録のプロジェクトです".to_string());
    }
    drop(projects);

    let session = NativeSession {
        id: Uuid::new_v4().to_string(),
        project_id,
        external_thread_id: None,
        status: "idle".to_string(),
    };
    state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .insert(session.id.clone(), session.clone());
    Ok(session)
}

#[tauri::command]
fn start_app_server(
    app: AppHandle,
    state: State<ShellState>,
    project_path: String,
) -> Result<(), String> {
    let root = canonical_project_root(&project_path)?;
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    if runtime.as_mut().is_some_and(|process| process.is_running()) {
        return Ok(());
    }
    *runtime = Some(app_server::AppServerProcess::spawn(app, &root)?);
    Ok(())
}

#[tauri::command]
fn codex_available() -> bool {
    Command::new("codex").arg("--version").output().is_ok()
}

pub fn run() {
    tauri::Builder::default()
        .manage(ShellState::default())
        .invoke_handler(tauri::generate_handler![
            register_project,
            list_projects,
            create_session,
            start_app_server,
            codex_available
        ])
        .run(tauri::generate_context!())
        .expect("error while running Codex Shell");
}
