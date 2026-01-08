use super::{Answer, Draft, Outcome};
use crate::ai::Client;
use crate::core::{AppResult, SharedDb, blocking};
use tauri::State;

#[tauri::command]
pub async fn refine_start(db: State<'_, SharedDb>, note_id: String) -> AppResult<Draft> {
    let db = db.inner().clone();
    blocking("refine_start", move || {
        let llm = Client::from_db(&db)?;
        super::start(&db, &llm, &note_id)
    })
    .await
}

#[tauri::command]
pub async fn refine_finish(db: State<'_, SharedDb>, note_id: String, answers: Vec<Answer>, cards: Vec<String>) -> AppResult<Outcome> {
    let db = db.inner().clone();
    blocking("refine_finish", move || {
        let llm = Client::from_db(&db)?;
        super::finish(&db, &llm, &note_id, &answers, &cards)
    })
    .await
}
