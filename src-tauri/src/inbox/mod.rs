//! Inbox: what the AI proposed, waiting for the user to accept, edit or dismiss.
//! Nothing reaches the board or calendar without passing through here.

pub mod commands;

use crate::board::{self, Strategy, Subtask, TaskInput};
use crate::calendar::{self, EventInput};
use crate::core::{AppError, AppResult, new_id, now, required};
use rusqlite::{Connection, Row, params};
use serde::{Deserialize, Serialize};

pub const SCHEMA: &str = include_str!("schema.sql");

/// One proposed item. Holds both task and event fields so the user can flip its kind.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Proposal {
    /// "task" or "event".
    pub kind: String,
    pub title: String,
    pub notes: Option<String>,
    pub priority: Option<String>,
    pub work_type: Option<String>,
    pub energy: Option<String>,
    pub estimate_min: Option<i64>,
    pub context: Option<String>,
    pub due_date: Option<String>,
    pub next_action: Option<String>,
    pub subtasks: Vec<Subtask>,
    /// meeting, time_block or reminder.
    pub event_kind: Option<String>,
    pub date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub deep_work: bool,
    pub strategies: Vec<Strategy>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub note_id: Option<String>,
    pub proposal: Proposal,
    pub created_at: String,
}

/// Where an accepted item went.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Placed {
    pub kind: String,
    pub id: String,
}

fn from_row(r: &Row) -> rusqlite::Result<Item> {
    Ok(Item {
        id: r.get(0)?,
        note_id: r.get(1)?,
        proposal: serde_json::from_str(&r.get::<_, String>(2)?).unwrap_or_default(),
        created_at: r.get(3)?,
    })
}

fn check(p: &Proposal) -> AppResult<()> {
    required("title", &p.title)?;
    if p.kind != "task" && p.kind != "event" {
        return Err(AppError::InvalidInput("kind must be task or event".into()));
    }
    Ok(())
}

pub fn add(c: &Connection, note_id: Option<&str>, proposals: &[Proposal]) -> AppResult<usize> {
    let ts = now();
    for p in proposals {
        check(p)?;
        c.execute(
            "INSERT INTO inbox_items (id, note_id, data, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![new_id(), note_id, serde_json::to_string(p)?, ts],
        )?;
    }
    Ok(proposals.len())
}

pub fn pending(c: &Connection) -> AppResult<Vec<Item>> {
    let mut st =
        c.prepare("SELECT id, note_id, data, created_at FROM inbox_items WHERE status = 'pending' ORDER BY created_at DESC, rowid")?;
    let rows = st.query_map([], from_row)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

fn get_pending(c: &Connection, id: &str) -> AppResult<Item> {
    Ok(c.query_row("SELECT id, note_id, data, created_at FROM inbox_items WHERE id = ?1 AND status = 'pending'", [id], from_row)?)
}

pub fn update(c: &Connection, id: &str, p: Proposal) -> AppResult<Item> {
    check(&p)?;
    get_pending(c, id)?;
    c.execute("UPDATE inbox_items SET data = ?2 WHERE id = ?1", params![id, serde_json::to_string(&p)?])?;
    get_pending(c, id)
}

fn decide(c: &Connection, id: &str, status: &str, target: Option<&str>) -> AppResult<()> {
    c.execute("UPDATE inbox_items SET status = ?2, target_id = ?3, decided_at = ?4 WHERE id = ?1", params![id, status, target, now()])?;
    Ok(())
}

/// Copies the proposal onto the board (task) or calendar (event).
fn place(c: &Connection, item: &Item) -> AppResult<Placed> {
    let p = item.proposal.clone();
    if p.kind == "event" {
        let date =
            p.date.or(p.due_date).ok_or_else(|| AppError::InvalidInput(format!("\"{}\" needs a date to go on the calendar", p.title)))?;
        let e = calendar::create(
            c,
            EventInput {
                title: p.title,
                notes: p.notes,
                kind: p.event_kind,
                date,
                start_time: p.start_time,
                end_time: p.end_time,
                deep_work: p.deep_work,
                strategies: p.strategies,
                confidence: p.confidence,
                source_note: item.note_id.clone(),
            },
        )?;
        return Ok(Placed { kind: "event".into(), id: e.id });
    }
    let t = board::create(
        c,
        TaskInput {
            title: Some(p.title),
            notes: p.notes,
            status: Some("todo".into()),
            priority: p.priority,
            work_type: p.work_type,
            energy: p.energy,
            estimate_min: p.estimate_min,
            context: p.context,
            due_date: p.due_date.or(p.date),
            next_action: p.next_action,
            subtasks: Some(p.subtasks),
            strategies: Some(p.strategies),
            confidence: p.confidence,
            source_note: item.note_id.clone(),
        },
    )?;
    Ok(Placed { kind: "task".into(), id: t.id })
}

pub fn accept(c: &Connection, id: &str) -> AppResult<Placed> {
    let tx = c.unchecked_transaction()?;
    let item = get_pending(&tx, id)?;
    let placed = place(&tx, &item)?;
    decide(&tx, id, "accepted", Some(&placed.id))?;
    tx.commit()?;
    Ok(placed)
}

/// Accepts every pending item of a note; all or nothing.
pub fn accept_note(c: &Connection, note_id: &str) -> AppResult<Vec<Placed>> {
    let tx = c.unchecked_transaction()?;
    let items: Vec<Item> = pending(&tx)?.into_iter().filter(|i| i.note_id.as_deref() == Some(note_id)).collect();
    let mut out = Vec::with_capacity(items.len());
    for item in &items {
        let placed = place(&tx, item)?;
        decide(&tx, &item.id, "accepted", Some(&placed.id))?;
        out.push(placed);
    }
    tx.commit()?;
    Ok(out)
}

pub fn dismiss(c: &Connection, id: &str) -> AppResult<()> {
    get_pending(c, id)?;
    decide(c, id, "dismissed", None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Db;

    fn db() -> Db {
        Db::in_memory(&[("board", board::SCHEMA), ("calendar", calendar::SCHEMA), ("inbox", SCHEMA)]).unwrap()
    }

    fn task(title: &str) -> Proposal {
        Proposal { kind: "task".into(), title: title.into(), priority: Some("high".into()), estimate_min: Some(30), ..Default::default() }
    }

    fn event(title: &str, date: Option<&str>) -> Proposal {
        Proposal {
            kind: "event".into(),
            title: title.into(),
            event_kind: Some("meeting".into()),
            date: date.map(str::to_string),
            start_time: Some("10:00".into()),
            ..Default::default()
        }
    }

    #[test]
    fn accepting_places_items_and_clears_them() {
        let db = db();
        db.with(|c| {
            add(c, Some("n1"), &[task("Call mom"), event("Dentist", Some("2026-01-13"))])?;
            let items = pending(c)?;
            assert_eq!(items.len(), 2);
            for i in &items {
                accept(c, &i.id)?;
            }
            assert!(pending(c)?.is_empty());
            let tasks = board::list(c)?;
            assert_eq!(tasks[0].title, "Call mom");
            assert_eq!(tasks[0].source_note.as_deref(), Some("n1"));
            assert_eq!(calendar::list(c, "2026-01-01", "2026-01-31")?[0].start_time.as_deref(), Some("10:00"));
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn event_without_date_is_refused_and_stays_pending() {
        let db = db();
        db.with(|c| {
            add(c, None, &[event("Meeting", None)])?;
            let id = pending(c)?[0].id.clone();
            assert!(matches!(accept(c, &id), Err(AppError::InvalidInput(_))));
            assert_eq!(pending(c)?.len(), 1);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn accept_note_is_all_or_nothing() {
        let db = db();
        db.with(|c| {
            add(c, Some("n1"), &[task("A"), event("B", None)])?;
            assert!(accept_note(c, "n1").is_err());
            assert!(board::list(c)?.is_empty());
            let b = pending(c)?.into_iter().find(|i| i.proposal.title == "B").unwrap();
            update(c, &b.id, event("B", Some("2026-01-14")))?;
            assert_eq!(accept_note(c, "n1")?.len(), 2);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn flipping_kind_keeps_the_date() {
        let db = db();
        db.with(|c| {
            add(c, None, &[event("Report", Some("2026-01-16"))])?;
            let i = pending(c)?.remove(0);
            update(c, &i.id, Proposal { kind: "task".into(), ..i.proposal })?;
            accept(c, &i.id)?;
            assert_eq!(board::list(c)?[0].due_date.as_deref(), Some("2026-01-16"));
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn dismissed_items_leave_the_inbox() {
        let db = db();
        db.with(|c| {
            add(c, None, &[task("Maybe")])?;
            let id = pending(c)?[0].id.clone();
            dismiss(c, &id)?;
            assert!(pending(c)?.is_empty());
            assert!(matches!(dismiss(c, &id), Err(AppError::NotFound(_))));
            Ok(())
        })
        .unwrap();
    }
}
