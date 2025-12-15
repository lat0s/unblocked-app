use super::{Client, JsonRequest, KeySource, Llm, Provider, Settings};
use crate::core::{AppResult, SharedDb, blocking};
use serde::Serialize;
use serde_json::json;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStatus {
    settings: Settings,
    key_source: KeySource,
}

fn status(db: &crate::core::Db) -> AppResult<AiStatus> {
    let settings = super::settings(db)?;
    let key_source = super::api_key(settings.provider).1;
    Ok(AiStatus { settings, key_source })
}

#[tauri::command]
pub async fn ai_status(db: State<'_, SharedDb>) -> AppResult<AiStatus> {
    let db = db.inner().clone();
    blocking("ai_status", move || status(&db)).await
}

#[tauri::command]
pub async fn ai_save_settings(db: State<'_, SharedDb>, settings: Settings) -> AppResult<AiStatus> {
    let db = db.inner().clone();
    blocking("ai_save_settings", move || {
        super::save_settings(&db, settings)?;
        status(&db)
    })
    .await
}

#[tauri::command]
pub async fn ai_set_key(provider: Provider, key: String) -> AppResult<()> {
    blocking("ai_set_key", move || super::set_key(provider, &key)).await
}

#[tauri::command]
pub async fn ai_clear_key(provider: Provider) -> AppResult<()> {
    blocking("ai_clear_key", move || super::clear_key(provider)).await
}

#[tauri::command]
pub async fn ai_models(db: State<'_, SharedDb>) -> AppResult<Vec<String>> {
    let db = db.inner().clone();
    blocking("ai_models", move || Client::from_db(&db)?.models()).await
}

/// Sends a tiny structured request to prove key, model and JSON mode all work.
#[tauri::command]
pub async fn ai_test(db: State<'_, SharedDb>) -> AppResult<String> {
    let db = db.inner().clone();
    blocking("ai_test", move || {
        let client = Client::from_db(&db)?;
        let schema = json!({ "type": "object", "properties": { "ok": { "type": "boolean" } }, "required": ["ok"] });
        let v = client.json(&JsonRequest { name: "ping", system: "Answer in JSON.", prompt: "Reply with ok = true.", schema: &schema })?;
        Ok(format!("{} answered {v}", client.settings.model))
    })
    .await
}
