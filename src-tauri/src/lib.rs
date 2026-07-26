mod app_server;
mod git;

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
    title: String,
    status: String,
    current_task: String,
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

fn project_root(state: &ShellState, project_id: &str) -> Result<PathBuf, String> {
    let project = state
        .projects
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .iter()
        .find(|project| project.id == project_id)
        .cloned()
        .ok_or("未登録のプロジェクトです")?;
    canonical_project_root(&project.path)
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
fn get_changed_files(
    state: State<ShellState>,
    project_id: String,
) -> Result<Vec<git::ChangedFile>, String> {
    git::changed_files(&project_root(&state, &project_id)?)
}

#[tauri::command]
fn get_file_diff(
    state: State<ShellState>,
    project_id: String,
    path: String,
) -> Result<String, String> {
    git::diff(&project_root(&state, &project_id)?, &path)
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
        title: "新しいCodexセッション".to_string(),
        status: "idle".to_string(),
        current_task: "指示を待機中".to_string(),
    };
    state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .insert(session.id.clone(), session.clone());
    Ok(session)
}

#[tauri::command]
fn list_sessions(state: State<ShellState>) -> Result<Vec<NativeSession>, String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .values()
        .cloned()
        .collect::<Vec<_>>();
    sessions.sort_by(|left, right| left.id.cmp(&right.id));
    Ok(sessions)
}

#[tauri::command]
fn rename_session(
    state: State<ShellState>,
    session_id: String,
    title: String,
) -> Result<NativeSession, String> {
    let title = title.trim();
    if title.is_empty() || title.chars().count() > 120 {
        return Err("セッション名は1〜120文字で入力してください".to_string());
    }
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    let session = sessions
        .get_mut(&session_id)
        .ok_or("セッションが見つかりません")?;
    session.title = title.to_string();
    Ok(session.clone())
}

#[tauri::command]
fn duplicate_session(
    state: State<ShellState>,
    session_id: String,
) -> Result<NativeSession, String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    let source = sessions
        .get(&session_id)
        .cloned()
        .ok_or("セッションが見つかりません")?;
    let duplicated = NativeSession {
        id: Uuid::new_v4().to_string(),
        project_id: source.project_id,
        external_thread_id: None,
        title: format!("{} (複製)", source.title),
        status: "idle".to_string(),
        current_task: "複製元の会話を参照して指示を待機中".to_string(),
    };
    sessions.insert(duplicated.id.clone(), duplicated.clone());
    Ok(duplicated)
}

#[tauri::command]
fn end_session(state: State<ShellState>, session_id: String) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    let session = sessions
        .get_mut(&session_id)
        .ok_or("セッションが見つかりません")?;
    session.status = "stopped".to_string();
    session.current_task = "ユーザーが終了しました".to_string();
    Ok(())
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
fn start_codex_session(
    app: AppHandle,
    state: State<ShellState>,
    session_id: String,
) -> Result<u64, String> {
    let session = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .get(&session_id)
        .cloned()
        .ok_or("セッションが見つかりません")?;
    let project = state
        .projects
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .iter()
        .find(|project| project.id == session.project_id)
        .cloned()
        .ok_or("プロジェクトが見つかりません")?;
    let root = canonical_project_root(&project.path)?;
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    if !runtime.as_mut().is_some_and(|process| process.is_running()) {
        *runtime = Some(app_server::AppServerProcess::spawn(app, &root)?);
    }
    let request_id = runtime
        .as_mut()
        .ok_or("Codexランタイムを開始できません")?
        .start_thread(&root)?;
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    if let Some(session) = sessions.get_mut(&session_id) {
        session.status = "running".to_string();
        session.current_task = "Codexセッションを開始中".to_string();
    }
    Ok(request_id)
}

#[tauri::command]
fn bind_codex_thread(
    state: State<ShellState>,
    session_id: String,
    thread_id: String,
) -> Result<(), String> {
    if thread_id.trim().is_empty() || thread_id.chars().count() > 256 {
        return Err("CodexスレッドIDが不正です".to_string());
    }
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    let session = sessions
        .get_mut(&session_id)
        .ok_or("セッションが見つかりません")?;
    session.external_thread_id = Some(thread_id);
    session.status = "idle".to_string();
    session.current_task = "指示を待機中".to_string();
    Ok(())
}

#[tauri::command]
fn send_codex_turn(
    state: State<ShellState>,
    session_id: String,
    text: String,
) -> Result<u64, String> {
    let text = text.trim();
    if text.is_empty() || text.chars().count() > 100_000 {
        return Err("指示は1〜100,000文字で入力してください".to_string());
    }
    let thread_id = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?
        .get(&session_id)
        .and_then(|session| session.external_thread_id.clone())
        .ok_or("Codexセッションの開始完了を待っています")?;
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    let process = runtime
        .as_mut()
        .ok_or("Codex app-serverは実行されていません")?;
    if !process.is_running() {
        return Err("Codex app-serverは実行されていません".to_string());
    }
    let request_id = process.start_turn(&thread_id, text)?;
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "状態のロックに失敗しました")?;
    if let Some(session) = sessions.get_mut(&session_id) {
        session.status = "running".to_string();
        session.current_task = "Codexが応答を生成中".to_string();
    }
    Ok(request_id)
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
            get_changed_files,
            get_file_diff,
            create_session,
            list_sessions,
            rename_session,
            duplicate_session,
            end_session,
            start_app_server,
            start_codex_session,
            bind_codex_thread,
            send_codex_turn,
            codex_available
        ])
        .run(tauri::generate_context!())
        .expect("error while running Codex Shell");
}
