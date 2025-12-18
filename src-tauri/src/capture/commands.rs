use super::Note;
use crate::core::{AppResult, SharedDb, blocking};
use tauri::State;

#[tauri::command]
pub async fn notes_list(db: State<'_, SharedDb>) -> AppResult<Vec<Note>> {
    let db = db.inner().clone();
    blocking("notes_list", move || db.with(super::list)).await
}

#[tauri::command]
pub async fn note_save(db: State<'_, SharedDb>, id: Option<String>, body: String) -> AppResult<Option<Note>> {
    let db = db.inner().clone();
    blocking("note_save", move || db.with(|c| super::save(c, id.as_deref(), &body))).await
}

#[tauri::command]
pub async fn note_delete(db: State<'_, SharedDb>, id: String) -> AppResult<()> {
    let db = db.inner().clone();
    blocking("note_delete", move || db.with(|c| super::delete(c, &id))).await
}
