use std::{path::Path, process::Command};

use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    pub path: String,
    pub kind: String,
    pub additions: u32,
    pub deletions: u32,
    pub reason: String,
}

fn git(root: &Path, arguments: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(arguments)
        .current_dir(root)
        .output()
        .map_err(|error| format!("Gitを起動できません: {error}"))?;
    if !output.status.success() {
        return Err(
            "Gitの実行に失敗しました。登録済みプロジェクトがGitリポジトリか確認してください"
                .to_string(),
        );
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn sensitive_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.contains(".env")
        || lower.ends_with(".pem")
        || lower.ends_with(".key")
        || lower.contains("credential")
        || lower.contains("secret")
}

fn safe_relative_path(path: &str) -> Result<(), String> {
    let path = Path::new(path);
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                std::path::Component::ParentDir | std::path::Component::RootDir
            )
        })
    {
        return Err("プロジェクト外のファイルは参照できません".to_string());
    }
    Ok(())
}

pub fn changed_files(root: &Path) -> Result<Vec<ChangedFile>, String> {
    let statuses = git(root, &["status", "--porcelain=v1"])?;
    let statistics = git(root, &["diff", "--numstat"])?;
    let mut counts = std::collections::HashMap::new();
    for line in statistics.lines() {
        let mut fields = line.splitn(3, '\t');
        let additions = fields
            .next()
            .and_then(|value| value.parse().ok())
            .unwrap_or(0);
        let deletions = fields
            .next()
            .and_then(|value| value.parse().ok())
            .unwrap_or(0);
        if let Some(path) = fields.next() {
            counts.insert(path.to_string(), (additions, deletions));
        }
    }

    let mut files = Vec::new();
    for line in statuses.lines() {
        if line.len() < 4 {
            continue;
        }
        let code = &line[0..2];
        let path = line[3..].trim();
        if path.is_empty() || sensitive_path(path) {
            continue;
        }
        let kind = if code.contains('A') || code == "??" {
            "added"
        } else if code.contains('D') {
            "deleted"
        } else {
            "modified"
        };
        let (additions, deletions) = counts.get(path).copied().unwrap_or((0, 0));
        files.push(ChangedFile {
            path: path.to_string(),
            kind: kind.to_string(),
            additions,
            deletions,
            reason: "Git作業ツリーで検出された変更".to_string(),
        });
    }
    Ok(files)
}

pub fn diff(root: &Path, path: &str) -> Result<String, String> {
    safe_relative_path(path)?;
    if sensitive_path(path) {
        return Err("秘密情報を含む可能性があるファイルの差分は表示しません".to_string());
    }
    let output = Command::new("git")
        .args(["diff", "--no-ext-diff", "--", path])
        .current_dir(root)
        .output()
        .map_err(|error| format!("Git差分を取得できません: {error}"))?;
    if !output.status.success() {
        return Err("Git差分を取得できません".to_string());
    }
    let diff = String::from_utf8_lossy(&output.stdout).to_string();
    const MAX_DIFF_BYTES: usize = 250_000;
    if diff.len() > MAX_DIFF_BYTES {
        return Ok(format!(
            "{}\n\n… 差分が大きいため先頭のみ表示しています。",
            &diff[..MAX_DIFF_BYTES]
        ));
    }
    Ok(diff)
}
