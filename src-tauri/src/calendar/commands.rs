use super::{Event, EventInput};
use crate::core::{AppResult, SharedDb, blocking};
use tauri::State;

#[tauri::command]
pub async fn events_list(db: State<'_, SharedDb>, from: String, to: String) -> AppResult<Vec<Event>> {
    let db = db.inner().clone();
    blocking("events_list", move || db.with(|c| super::list(c, &from, &to))).await
}

#[tauri::command]
pub async fn event_create(db: State<'_, SharedDb>, input: EventInput) -> AppResult<Event> {
    let db = db.inner().clone();
    blocking("event_create", move || db.with(|c| super::create(c, input))).await
}

#[tauri::command]
pub async fn event_update(db: State<'_, SharedDb>, id: String, input: EventInput) -> AppResult<Event> {
    let db = db.inner().clone();
    blocking("event_update", move || db.with(|c| super::update(c, &id, input))).await
}

#[tauri::command]
pub async fn event_delete(db: State<'_, SharedDb>, id: String) -> AppResult<()> {
    let db = db.inner().clone();
    blocking("event_delete", move || db.with(|c| super::delete(c, &id))).await
}
