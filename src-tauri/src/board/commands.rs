use super::{Task, TaskInput};
use crate::core::{AppResult, SharedDb, blocking};
use tauri::State;

#[tauri::command]
pub async fn tasks_list(db: State<'_, SharedDb>) -> AppResult<Vec<Task>> {
    let db = db.inner().clone();
    blocking("tasks_list", move || db.with(super::list)).await
}

#[tauri::command]
pub async fn task_create(db: State<'_, SharedDb>, input: TaskInput) -> AppResult<Task> {
    let db = db.inner().clone();
    blocking("task_create", move || db.with(|c| super::create(c, input))).await
}

#[tauri::command]
pub async fn task_update(db: State<'_, SharedDb>, id: String, input: TaskInput) -> AppResult<Task> {
    let db = db.inner().clone();
    blocking("task_update", move || db.with(|c| super::update(c, &id, input))).await
}

#[tauri::command]
pub async fn task_move(db: State<'_, SharedDb>, id: String, status: String, index: usize) -> AppResult<Task> {
    let db = db.inner().clone();
    blocking("task_move", move || db.with(|c| super::move_to(c, &id, &status, index))).await
}

#[tauri::command]
pub async fn task_delete(db: State<'_, SharedDb>, id: String) -> AppResult<()> {
    let db = db.inner().clone();
    blocking("task_delete", move || db.with(|c| super::delete(c, &id))).await
}
