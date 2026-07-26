use std::{fs, path::Path};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{de::DeserializeOwned, Serialize};

/// A small local-only SQLite store for non-secret workspace metadata.
pub struct Storage {
    connection: std::sync::Mutex<Connection>,
}

impl Storage {
    pub fn open(directory: &Path) -> Result<Self, String> {
        fs::create_dir_all(directory).map_err(|error| format!("保存先を作成できません: {error}"))?;
        let connection = Connection::open(directory.join("codex-shell.sqlite3"))
            .map_err(|error| format!("ローカルデータベースを開けません: {error}"))?;
        connection
            .execute_batch(
                "
                PRAGMA journal_mode = WAL;
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS app_state (
                  key TEXT PRIMARY KEY NOT NULL,
                  value TEXT NOT NULL,
                  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                ",
            )
            .map_err(|error| format!("ローカルデータベースを初期化できません: {error}"))?;
        Ok(Self {
            connection: std::sync::Mutex::new(connection),
        })
    }

    pub fn load<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "ローカルデータベースのロックに失敗しました")?;
        let mut statement = connection
            .prepare("SELECT value FROM app_state WHERE key = ?1")
            .map_err(|error| error.to_string())?;
        let value = statement
            .query_row(params![key], |row| row.get::<_, String>(0))
            .optional()
            .map_err(|error| error.to_string())?;
        value
            .map(|value| serde_json::from_str(&value).map_err(|error| error.to_string()))
            .transpose()
    }

    pub fn save<T: Serialize>(&self, key: &str, value: &T) -> Result<(), String> {
        let encoded = serde_json::to_string(value).map_err(|error| error.to_string())?;
        self.connection
            .lock()
            .map_err(|_| "ローカルデータベースのロックに失敗しました")?
            .execute(
                "INSERT INTO app_state(key, value, updated_at) VALUES(?1, ?2, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                params![key, encoded],
            )
            .map_err(|error| format!("ローカル状態を保存できません: {error}"))?;
        Ok(())
    }
}
