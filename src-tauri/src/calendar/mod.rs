//! Calendar: events on a date, either all day (no start time) or in a time slot.

pub mod commands;

use crate::board::Strategy;
use crate::core::{AppError, AppResult, new_id, now, required};
use chrono::{NaiveDate, NaiveTime};
use rusqlite::{Connection, Row, params};
use serde::{Deserialize, Serialize};

pub const SCHEMA: &str = include_str!("schema.sql");

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub title: String,
    pub notes: Option<String>,
    pub kind: String,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub deep_work: bool,
    pub strategies: Vec<Strategy>,
    pub confidence: Option<f64>,
    pub source_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct EventInput {
    pub title: String,
    pub notes: Option<String>,
    pub kind: Option<String>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub deep_work: bool,
    pub strategies: Vec<Strategy>,
    pub confidence: Option<f64>,
    pub source_note: Option<String>,
}

const COLS: &str =
    "id, title, notes, kind, date, start_time, end_time, deep_work, strategies, confidence, source_note, created_at, updated_at";

fn from_row(r: &Row) -> rusqlite::Result<Event> {
    Ok(Event {
        id: r.get(0)?,
        title: r.get(1)?,
        notes: r.get(2)?,
        kind: r.get(3)?,
        date: r.get(4)?,
        start_time: r.get(5)?,
        end_time: r.get(6)?,
        deep_work: r.get(7)?,
        strategies: serde_json::from_str(&r.get::<_, String>(8)?).unwrap_or_default(),
        confidence: r.get(9)?,
        source_note: r.get(10)?,
        created_at: r.get(11)?,
        updated_at: r.get(12)?,
    })
}

fn time(field: &str, v: Option<String>) -> AppResult<Option<String>> {
    match v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()) {
        None => Ok(None),
        Some(s) => NaiveTime::parse_from_str(&s, "%H:%M")
            .map(|t| Some(t.format("%H:%M").to_string()))
            .map_err(|_| AppError::InvalidInput(format!("{field} must be HH:MM"))),
    }
}

/// Normalizes and validates; an end time needs a start time and must come after it.
fn clean(i: EventInput) -> AppResult<EventInput> {
    let title = required("title", &i.title)?;
    NaiveDate::parse_from_str(&i.date, "%Y-%m-%d").map_err(|_| AppError::InvalidInput("date must be YYYY-MM-DD".into()))?;
    let kind = i.kind.unwrap_or_else(|| "meeting".into());
    if !["meeting", "time_block", "reminder"].contains(&kind.as_str()) {
        return Err(AppError::InvalidInput("kind must be meeting, time_block or reminder".into()));
    }
    let start = time("startTime", i.start_time)?;
    let mut end = time("endTime", i.end_time)?;
    if start.is_none() {
        end = None;
    }
    if let (Some(s), Some(e)) = (&start, &end)
        && e <= s
    {
        return Err(AppError::InvalidInput("the event has to end after it starts".into()));
    }
    Ok(EventInput { title, kind: Some(kind), start_time: start, end_time: end, notes: i.notes.filter(|n| !n.trim().is_empty()), ..i })
}

/// Events with `from <= date <= to`, all-day first, then by start time.
pub fn list(c: &Connection, from: &str, to: &str) -> AppResult<Vec<Event>> {
    let mut st =
        c.prepare(&format!("SELECT {COLS} FROM events WHERE date BETWEEN ?1 AND ?2 ORDER BY date, start_time IS NOT NULL, start_time"))?;
    let rows = st.query_map([from, to], from_row)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn get(c: &Connection, id: &str) -> AppResult<Event> {
    Ok(c.query_row(&format!("SELECT {COLS} FROM events WHERE id = ?1"), [id], from_row)?)
}

pub fn create(c: &Connection, i: EventInput) -> AppResult<Event> {
    let i = clean(i)?;
    let id = new_id();
    let ts = now();
    c.execute(
        &format!("INSERT INTO events ({COLS}) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?12)"),
        params![
            id,
            i.title,
            i.notes,
            i.kind,
            i.date,
            i.start_time,
            i.end_time,
            i.deep_work,
            serde_json::to_string(&i.strategies)?,
            i.confidence,
            i.source_note,
            ts
        ],
    )?;
    get(c, &id)
}

pub fn update(c: &Connection, id: &str, i: EventInput) -> AppResult<Event> {
    let i = clean(i)?;
    let n = c.execute(
        "UPDATE events SET title=?2, notes=?3, kind=?4, date=?5, start_time=?6, end_time=?7, deep_work=?8, updated_at=?9 WHERE id=?1",
        params![id, i.title, i.notes, i.kind, i.date, i.start_time, i.end_time, i.deep_work, now()],
    )?;
    if n == 0 {
        return Err(AppError::NotFound("event not found".into()));
    }
    get(c, id)
}

pub fn delete(c: &Connection, id: &str) -> AppResult<()> {
    let n = c.execute("DELETE FROM events WHERE id = ?1", [id])?;
    if n == 0 { Err(AppError::NotFound("event not found".into())) } else { Ok(()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Db;

    fn ev(title: &str, date: &str, start: Option<&str>, end: Option<&str>) -> EventInput {
        EventInput {
            title: title.into(),
            date: date.into(),
            start_time: start.map(Into::into),
            end_time: end.map(Into::into),
            ..Default::default()
        }
    }

    #[test]
    fn lists_range_all_day_first() {
        let db = Db::in_memory(&[("calendar", SCHEMA)]).unwrap();
        db.with(|c| {
            create(c, ev("lunch", "2026-03-12", Some("12:30"), Some("13:30")))?;
            create(c, ev("standup", "2026-03-12", Some("9:00"), None))?;
            create(c, ev("birthday", "2026-03-12", None, None))?;
            create(c, ev("later", "2026-03-20", None, None))?;
            let titles: Vec<_> = list(c, "2026-03-09", "2026-03-15")?.into_iter().map(|e| e.title).collect();
            assert_eq!(titles, ["birthday", "standup", "lunch"]);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn validates_times() {
        let db = Db::in_memory(&[("calendar", SCHEMA)]).unwrap();
        db.with(|c| {
            assert!(create(c, ev("x", "2026-03-12", Some("14:00"), Some("13:00"))).is_err());
            assert!(create(c, ev("x", "12/03/2026", None, None)).is_err());
            assert!(create(c, ev("x", "2026-03-12", Some("2pm"), None)).is_err());
            // An end time alone is dropped.
            assert_eq!(create(c, ev("x", "2026-03-12", None, Some("10:00")))?.end_time, None);
            Ok(())
        })
        .unwrap();
    }
}
