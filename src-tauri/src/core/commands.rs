use super::{AppResult, SharedDb, blocking, db, logging};
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    version: &'static str,
    db_path: String,
    log_file: String,
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION"),
        db_path: db::db_path().display().to_string(),
        log_file: logging::log_file().display().to_string(),
    }
}

#[tauri::command]
pub fn log_client(level: String, message: String) {
    match level.as_str() {
        "error" => log::error!(target: "unblocked::ui", "{message}"),
        "warn" => log::warn!(target: "unblocked::ui", "{message}"),
        _ => log::info!(target: "unblocked::ui", "{message}"),
    }
}

/// UI preferences (theme, last page...) as plain strings.
#[tauri::command]
pub async fn pref_get(db: State<'_, SharedDb>, key: String) -> AppResult<Option<String>> {
    let db = db.inner().clone();
    blocking("pref_get", move || db.kv_get(&format!("pref.{key}"))).await
}

#[tauri::command]
pub async fn pref_set(db: State<'_, SharedDb>, key: String, value: String) -> AppResult<()> {
    let db = db.inner().clone();
    blocking("pref_set", move || db.kv_set(&format!("pref.{key}"), &value)).await
}
