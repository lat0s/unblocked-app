use super::{Item, Placed, Proposal};
use crate::core::{AppResult, SharedDb, blocking};
use tauri::State;

#[tauri::command]
pub async fn inbox_list(db: State<'_, SharedDb>) -> AppResult<Vec<Item>> {
    let db = db.inner().clone();
    blocking("inbox_list", move || db.with(super::pending)).await
}

#[tauri::command]
pub async fn inbox_update(db: State<'_, SharedDb>, id: String, proposal: Proposal) -> AppResult<Item> {
    let db = db.inner().clone();
    blocking("inbox_update", move || db.with(|c| super::update(c, &id, proposal))).await
}

#[tauri::command]
pub async fn inbox_accept(db: State<'_, SharedDb>, id: String) -> AppResult<Placed> {
    let db = db.inner().clone();
    blocking("inbox_accept", move || db.with(|c| super::accept(c, &id))).await
}

#[tauri::command]
pub async fn inbox_accept_note(db: State<'_, SharedDb>, note_id: String) -> AppResult<Vec<Placed>> {
    let db = db.inner().clone();
    blocking("inbox_accept_note", move || db.with(|c| super::accept_note(c, &note_id))).await
}

#[tauri::command]
pub async fn inbox_dismiss(db: State<'_, SharedDb>, id: String) -> AppResult<()> {
    let db = db.inner().clone();
    blocking("inbox_dismiss", move || db.with(|c| super::dismiss(c, &id))).await
}
