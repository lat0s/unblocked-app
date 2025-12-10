//! Board: tasks in three columns (todo, doing, done), ordered by position.

pub mod commands;

use crate::core::{AppError, AppResult, new_id, now, required};
use rusqlite::{Connection, Row, params};
use serde::{Deserialize, Serialize};

pub const SCHEMA: &str = include_str!("schema.sql");

pub const STATUSES: [&str; 3] = ["todo", "doing", "done"];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Subtask {
    pub title: String,
    #[serde(default)]
    pub done: bool,
}

/// Which book idea shaped an AI item, shown so the user can judge it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Strategy {
    pub book: String,
    pub principle: String,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub notes: Option<String>,
    pub status: String,
    pub position: i64,
    pub priority: String,
    pub work_type: String,
    pub energy: String,
    pub estimate_min: Option<i64>,
    pub context: Option<String>,
    pub due_date: Option<String>,
    pub next_action: Option<String>,
    pub subtasks: Vec<Subtask>,
    pub strategies: Vec<Strategy>,
    pub confidence: Option<f64>,
    pub source_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// Fields a user (or an accepted inbox item) can set. Missing fields keep their value on update.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TaskInput {
    pub title: Option<String>,
    pub notes: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub work_type: Option<String>,
    pub energy: Option<String>,
    pub estimate_min: Option<i64>,
    pub context: Option<String>,
    pub due_date: Option<String>,
    pub next_action: Option<String>,
    pub subtasks: Option<Vec<Subtask>>,
    pub strategies: Option<Vec<Strategy>>,
    pub confidence: Option<f64>,
    pub source_note: Option<String>,
}

const COLS: &str = "id, title, notes, status, position, priority, work_type, energy, estimate_min, context, due_date, next_action, \
                    subtasks, strategies, confidence, source_note, created_at, updated_at, completed_at";

fn from_row(r: &Row) -> rusqlite::Result<Task> {
    let json = |i: usize| -> rusqlite::Result<String> { r.get(i) };
    Ok(Task {
        id: r.get(0)?,
        title: r.get(1)?,
        notes: r.get(2)?,
        status: r.get(3)?,
        position: r.get(4)?,
        priority: r.get(5)?,
        work_type: r.get(6)?,
        energy: r.get(7)?,
        estimate_min: r.get(8)?,
        context: r.get(9)?,
        due_date: r.get(10)?,
        next_action: r.get(11)?,
        subtasks: serde_json::from_str(&json(12)?).unwrap_or_default(),
        strategies: serde_json::from_str(&json(13)?).unwrap_or_default(),
        confidence: r.get(14)?,
        source_note: r.get(15)?,
        created_at: r.get(16)?,
        updated_at: r.get(17)?,
        completed_at: r.get(18)?,
    })
}

fn check(field: &str, value: &Option<String>, allowed: &[&str]) -> AppResult<()> {
    match value {
        Some(v) if !allowed.contains(&v.as_str()) => Err(AppError::InvalidInput(format!("{field} must be one of {}", allowed.join(", ")))),
        _ => Ok(()),
    }
}

fn validate(i: &TaskInput) -> AppResult<()> {
    check("status", &i.status, &STATUSES)?;
    check("priority", &i.priority, &["low", "medium", "high", "urgent"])?;
    check("workType", &i.work_type, &["deep", "shallow"])?;
    check("energy", &i.energy, &["low", "medium", "high"])?;
    if let Some(d) = &i.due_date {
        if !d.is_empty() && chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").is_err() {
            return Err(AppError::InvalidInput("dueDate must be YYYY-MM-DD".into()));
        }
    }
    Ok(())
}

/// Empty strings from forms mean "no value".
fn blank_to_none(v: Option<String>) -> Option<String> {
    v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

pub fn list(c: &Connection) -> AppResult<Vec<Task>> {
    let mut st = c.prepare(&format!("SELECT {COLS} FROM tasks ORDER BY status, position"))?;
    let rows = st.query_map([], from_row)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn get(c: &Connection, id: &str) -> AppResult<Task> {
    Ok(c.query_row(&format!("SELECT {COLS} FROM tasks WHERE id = ?1"), [id], from_row)?)
}

pub fn create(c: &Connection, i: TaskInput) -> AppResult<Task> {
    validate(&i)?;
    let title = required("title", i.title.as_deref().unwrap_or(""))?;
    let status = i.status.unwrap_or_else(|| "todo".into());
    let id = new_id();
    let ts = now();
    // New cards go on top of their column.
    let top: i64 = c.query_row("SELECT COALESCE(MIN(position), 0) - 1 FROM tasks WHERE status = ?1", [&status], |r| r.get(0))?;
    c.execute(
        &format!("INSERT INTO tasks ({COLS}) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?17,?18)"),
        params![
            id,
            title,
            blank_to_none(i.notes),
            status,
            top,
            i.priority.unwrap_or_else(|| "medium".into()),
            i.work_type.unwrap_or_else(|| "shallow".into()),
            i.energy.unwrap_or_else(|| "medium".into()),
            i.estimate_min.filter(|m| *m > 0),
            blank_to_none(i.context),
            blank_to_none(i.due_date),
            blank_to_none(i.next_action),
            serde_json::to_string(&i.subtasks.unwrap_or_default())?,
            serde_json::to_string(&i.strategies.unwrap_or_default())?,
            i.confidence,
            i.source_note,
            ts,
            (status == "done").then(|| ts.clone()),
        ],
    )?;
    get(c, &id)
}

pub fn update(c: &Connection, id: &str, i: TaskInput) -> AppResult<Task> {
    validate(&i)?;
    let mut t = get(c, id)?;
    if let Some(v) = i.title {
        t.title = required("title", &v)?;
    }
    if i.notes.is_some() {
        t.notes = blank_to_none(i.notes);
    }
    if let Some(v) = i.priority {
        t.priority = v;
    }
    if let Some(v) = i.work_type {
        t.work_type = v;
    }
    if let Some(v) = i.energy {
        t.energy = v;
    }
    if i.estimate_min.is_some() {
        t.estimate_min = i.estimate_min.filter(|m| *m > 0);
    }
    if i.context.is_some() {
        t.context = blank_to_none(i.context);
    }
    if i.due_date.is_some() {
        t.due_date = blank_to_none(i.due_date);
    }
    if i.next_action.is_some() {
        t.next_action = blank_to_none(i.next_action);
    }
    if let Some(v) = i.subtasks {
        t.subtasks = v;
    }
    c.execute(
        "UPDATE tasks SET title=?2, notes=?3, priority=?4, work_type=?5, energy=?6, estimate_min=?7, context=?8, due_date=?9,
         next_action=?10, subtasks=?11, updated_at=?12 WHERE id=?1",
        params![
            id,
            t.title,
            t.notes,
            t.priority,
            t.work_type,
            t.energy,
            t.estimate_min,
            t.context,
            t.due_date,
            t.next_action,
            serde_json::to_string(&t.subtasks)?,
            now()
        ],
    )?;
    if let Some(s) = i.status.filter(|s| *s != t.status) {
        move_to(c, id, &s, 0)?;
    }
    get(c, id)
}

/// Puts a task at `index` in `status` and renumbers that column. Entering "done" stamps completion.
pub fn move_to(c: &Connection, id: &str, status: &str, index: usize) -> AppResult<Task> {
    check("status", &Some(status.to_string()), &STATUSES)?;
    let task = get(c, id)?;
    let mut ids: Vec<String> = {
        let mut st = c.prepare("SELECT id FROM tasks WHERE status = ?1 AND id != ?2 ORDER BY position")?;
        st.query_map(params![status, id], |r| r.get(0))?.collect::<Result<_, _>>()?
    };
    ids.insert(index.min(ids.len()), id.to_string());
    let ts = now();
    let completed = match (task.status.as_str(), status) {
        (_, "done") if task.status != "done" => Some(ts.clone()),
        (_, "done") => task.completed_at.clone(),
        _ => None,
    };
    let tx = c.unchecked_transaction()?;
    tx.execute("UPDATE tasks SET status=?2, completed_at=?3, updated_at=?4 WHERE id=?1", params![id, status, completed, ts])?;
    for (pos, tid) in ids.iter().enumerate() {
        tx.execute("UPDATE tasks SET position=?2 WHERE id=?1", params![tid, pos as i64])?;
    }
    tx.commit()?;
    get(c, id)
}

pub fn delete(c: &Connection, id: &str) -> AppResult<()> {
    let n = c.execute("DELETE FROM tasks WHERE id = ?1", [id])?;
    if n == 0 { Err(AppError::NotFound("task not found".into())) } else { Ok(()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Db;

    fn db() -> Db {
        Db::in_memory(&[("board", SCHEMA)]).unwrap()
    }

    fn task(c: &Connection, title: &str) -> Task {
        create(c, TaskInput { title: Some(title.into()), ..Default::default() }).unwrap()
    }

    fn column(c: &Connection, status: &str) -> Vec<String> {
        list(c).unwrap().into_iter().filter(|t| t.status == status).map(|t| t.title).collect()
    }

    #[test]
    fn new_tasks_go_on_top() {
        db().with(|c| {
            task(c, "a");
            task(c, "b");
            assert_eq!(column(c, "todo"), ["b", "a"]);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn move_reorders_and_stamps_done() {
        db().with(|c| {
            let a = task(c, "a");
            task(c, "b");
            task(c, "c");
            let moved = move_to(c, &a.id, "done", 0)?;
            assert!(moved.completed_at.is_some());
            assert_eq!(column(c, "todo"), ["c", "b"]);
            let back = move_to(c, &a.id, "todo", 1)?;
            assert!(back.completed_at.is_none());
            assert_eq!(column(c, "todo"), ["c", "a", "b"]);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn rejects_bad_input() {
        db().with(|c| {
            assert!(create(c, TaskInput { title: Some("  ".into()), ..Default::default() }).is_err());
            let bad = TaskInput { title: Some("x".into()), priority: Some("asap".into()), ..Default::default() };
            assert!(matches!(create(c, bad), Err(AppError::InvalidInput(_))));
            let bad_date = TaskInput { title: Some("x".into()), due_date: Some("friday".into()), ..Default::default() };
            assert!(create(c, bad_date).is_err());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn update_keeps_missing_fields_and_clears_blank_ones() {
        db().with(|c| {
            let t = create(
                c,
                TaskInput { title: Some("x".into()), context: Some("@home".into()), estimate_min: Some(30), ..Default::default() },
            )?;
            let u = update(c, &t.id, TaskInput { context: Some("".into()), ..Default::default() })?;
            assert_eq!(u.context, None);
            assert_eq!(u.estimate_min, Some(30));
            Ok(())
        })
        .unwrap();
    }
}
