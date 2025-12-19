//! Capture: brain dumps saved as notes, autosaved while typing.

pub mod commands;

use crate::core::{AppResult, new_id, now};
use rusqlite::{Connection, OptionalExtension, Row, params};
use serde::Serialize;

pub const SCHEMA: &str = include_str!("schema.sql");

/// How many notes the history keeps showing.
const HISTORY: i64 = 50;

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
    pub processed_at: Option<String>,
    pub item_count: i64,
}

const COLS: &str = "id, body, created_at, updated_at, processed_at, item_count";

fn from_row(r: &Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: r.get(0)?,
        body: r.get(1)?,
        created_at: r.get(2)?,
        updated_at: r.get(3)?,
        processed_at: r.get(4)?,
        item_count: r.get(5)?,
    })
}

pub fn list(c: &Connection) -> AppResult<Vec<Note>> {
    let mut st = c.prepare(&format!("SELECT {COLS} FROM notes ORDER BY updated_at DESC, rowid DESC LIMIT {HISTORY}"))?;
    let rows = st.query_map([], from_row)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn get(c: &Connection, id: &str) -> AppResult<Note> {
    Ok(c.query_row(&format!("SELECT {COLS} FROM notes WHERE id = ?1"), [id], from_row)?)
}

/// Creates the note on first save, updates it after. Blank new notes are not stored.
pub fn save(c: &Connection, id: Option<&str>, body: &str) -> AppResult<Option<Note>> {
    let existing = match id {
        Some(id) => c.query_row("SELECT id FROM notes WHERE id = ?1", [id], |r| r.get::<_, String>(0)).optional()?,
        None => None,
    };
    let ts = now();
    match existing {
        Some(id) => {
            c.execute("UPDATE notes SET body = ?2, updated_at = ?3 WHERE id = ?1", params![id, body, ts])?;
            Ok(Some(get(c, &id)?))
        }
        None if body.trim().is_empty() => Ok(None),
        None => {
            let id = id.map(str::to_string).unwrap_or_else(new_id);
            c.execute("INSERT INTO notes (id, body, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)", params![id, body, ts])?;
            Ok(Some(get(c, &id)?))
        }
    }
}

/// Marks a note as turned into `count` inbox items.
pub fn mark_processed(c: &Connection, id: &str, count: usize) -> AppResult<()> {
    c.execute("UPDATE notes SET processed_at = ?2, item_count = ?3 WHERE id = ?1", params![id, now(), count as i64])?;
    Ok(())
}

pub fn delete(c: &Connection, id: &str) -> AppResult<()> {
    c.execute("DELETE FROM notes WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Db;

    fn db() -> Db {
        Db::in_memory(&[("capture", SCHEMA)]).unwrap()
    }

    #[test]
    fn blank_drafts_are_not_stored() {
        let db = db();
        db.with(|c| {
            assert_eq!(save(c, None, "  \n ")?, None);
            assert!(list(c)?.is_empty());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn saves_then_updates_in_place() {
        let db = db();
        db.with(|c| {
            let n = save(c, None, "call mom")?.unwrap();
            let n2 = save(c, Some(&n.id), "call mom\nbuy milk")?.unwrap();
            assert_eq!(n.id, n2.id);
            assert_eq!(list(c)?.len(), 1);
            assert_eq!(get(c, &n.id)?.body, "call mom\nbuy milk");
            mark_processed(c, &n.id, 2)?;
            let n3 = get(c, &n.id)?;
            assert!(n3.processed_at.is_some());
            assert_eq!(n3.item_count, 2);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn client_id_is_kept_for_new_notes() {
        let db = db();
        db.with(|c| {
            let n = save(c, Some("abc"), "x")?.unwrap();
            assert_eq!(n.id, "abc");
            Ok(())
        })
        .unwrap();
    }
}
