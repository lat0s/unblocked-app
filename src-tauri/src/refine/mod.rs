//! Refine: note → first-pass draft → (optional) wizard questions → final proposals in the inbox.
//! The AI asks before it guesses; the user's answers always win.

pub mod commands;
mod prompts;
mod schema;

use crate::ai::{JsonRequest, Llm};
use crate::board::{Strategy, Subtask};
use crate::capture;
use crate::core::{AppError, AppResult, Db, now};
use crate::inbox::{self, Proposal};
use chrono::{NaiveDate, NaiveTime};
use rusqlite::{OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const SCHEMA: &str = include_str!("schema.sql");

const MAX_QUESTIONS: usize = 5;
const MAX_CARDS: usize = 3;
const MAX_OPTIONS: usize = 4;
const MAX_ITEMS: usize = 25;
const QUESTION_KINDS: [&str; 6] = ["context", "item_type", "due_date", "due_time", "context_tag", "card_count"];

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct DraftItem {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub summary: Option<String>,
    pub confidence: f64,
    pub refs: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Opt {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Question {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub placeholder: Option<String>,
    pub required: bool,
    pub refs: Vec<String>,
    pub options: Vec<Opt>,
    /// The note lines the question is about, filled in from `refs`.
    pub quotes: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Card {
    pub id: String,
    pub title: String,
    pub rationale: String,
    pub count: Option<u32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Draft {
    pub wizard: bool,
    pub items: Vec<DraftItem>,
    pub questions: Vec<Question>,
    pub cards: Vec<Card>,
    pub insights: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Answer {
    pub question_id: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub count: usize,
    pub tasks: usize,
    pub events: usize,
    pub insights: Vec<String>,
}

/// One final item as the model writes it.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct RawItem {
    kind: String,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    work_type: Option<String>,
    energy: Option<String>,
    estimated_minutes: Option<i64>,
    context: Option<String>,
    due_date: Option<String>,
    next_action: Option<String>,
    subtasks: Vec<String>,
    event_type: Option<String>,
    date: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    deep_work: bool,
    strategies: Vec<Strategy>,
    confidence: Option<f64>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct RawFinal {
    items: Vec<RawItem>,
    insights: Vec<String>,
}

fn current_time() -> String {
    chrono::Local::now().format("%A %Y-%m-%d %H:%M (UTC%:z)").to_string()
}

/// Calls the model, retrying once when the answer is not usable JSON.
fn ask(llm: &dyn Llm, req: &JsonRequest) -> AppResult<Value> {
    match llm.json(req) {
        Err(AppError::Provider(e)) => {
            log::warn!("{}: retrying after: {e}", req.name);
            llm.json(req)
        }
        r => r,
    }
}

fn pick(v: Option<String>, allowed: &[&str]) -> Option<String> {
    v.map(|s| s.trim().to_lowercase()).filter(|s| allowed.contains(&s.as_str()))
}

fn date(v: Option<String>) -> Option<String> {
    v.and_then(|s| NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d").ok()).map(|d| d.to_string())
}

fn time(v: Option<String>) -> Option<String> {
    v.and_then(|s| NaiveTime::parse_from_str(s.trim(), "%H:%M").ok()).map(|t| t.format("%H:%M").to_string())
}

fn text(v: Option<String>) -> Option<String> {
    v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty() && s != "null")
}

/// Keeps the wizard small and its options well-formed; adds the quoted lines.
fn tidy_draft(mut d: Draft, body: &str) -> Draft {
    let lines = prompts::lines(body);
    let quote = |r: &str| {
        let n: usize = r.trim_start_matches("line-").parse().ok()?;
        lines.iter().find(|(i, _)| *i == n).map(|(_, l)| l.to_string())
    };
    let mut seen = std::collections::HashSet::new();
    d.questions.retain(|q| QUESTION_KINDS.contains(&q.kind.as_str()) && !q.label.trim().is_empty() && seen.insert(q.id.clone()));
    d.questions.truncate(MAX_QUESTIONS);
    for q in &mut d.questions {
        q.options.retain(|o| match q.kind.as_str() {
            "due_date" => NaiveDate::parse_from_str(&o.value, "%Y-%m-%d").is_ok(),
            "due_time" => NaiveTime::parse_from_str(&o.value, "%H:%M").is_ok(),
            _ => !o.value.trim().is_empty(),
        });
        q.options.truncate(MAX_OPTIONS);
        q.quotes = q.refs.iter().filter_map(|r| quote(r)).collect();
    }
    d.cards.retain(|c| !c.title.trim().is_empty());
    d.cards.truncate(MAX_CARDS);
    d.wizard = d.wizard && !(d.questions.is_empty() && d.cards.is_empty());
    d
}

/// Turns a model item into an inbox proposal, dropping anything malformed.
fn to_proposal(r: RawItem) -> Option<Proposal> {
    let title = r.title.trim().to_string();
    if title.is_empty() {
        return None;
    }
    let date = date(r.date).or_else(|| date(r.due_date.clone()));
    let start = time(r.start_time);
    let end = time(r.end_time).filter(|e| start.as_ref().is_some_and(|s| e > s));
    // An event with no day can't go on a calendar; keep it as a task.
    let kind = if r.kind == "event" && date.is_some() { "event" } else { "task" };
    let mut strategies = r.strategies;
    strategies.retain(|s| !s.explanation.trim().is_empty());
    strategies.truncate(3);
    Some(Proposal {
        kind: kind.into(),
        title,
        notes: text(r.description),
        priority: pick(r.priority, &["low", "medium", "high", "urgent"]),
        work_type: pick(r.work_type, &["deep", "shallow"]),
        energy: pick(r.energy, &["low", "medium", "high"]),
        estimate_min: r.estimated_minutes.filter(|m| *m > 0).map(|m| (m.clamp(5, 600) + 4) / 5 * 5),
        context: text(r.context).map(|c| if c.starts_with('@') { c.to_lowercase() } else { format!("@{}", c.to_lowercase()) }),
        due_date: if kind == "task" { date.clone() } else { None },
        next_action: text(r.next_action),
        subtasks: r
            .subtasks
            .into_iter()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .take(8)
            .map(|title| Subtask { title, done: false })
            .collect(),
        event_kind: pick(r.event_type, &["meeting", "time_block", "reminder"]).or(if kind == "event" {
            Some("meeting".into())
        } else {
            None
        }),
        date: if kind == "event" { date } else { None },
        start_time: if kind == "event" { start } else { None },
        end_time: if kind == "event" { end } else { None },
        deep_work: r.deep_work,
        strategies,
        confidence: r.confidence.map(|c| c.clamp(0.0, 1.0)),
    })
}

fn note_body(db: &Db, note_id: &str) -> AppResult<String> {
    let note = db.with(|c| capture::get(c, note_id))?;
    if note.body.trim().is_empty() {
        return Err(AppError::InvalidInput("the note is empty".into()));
    }
    Ok(note.body)
}

/// First pass. The database is not locked while the model thinks.
pub fn start(db: &Db, llm: &dyn Llm, note_id: &str) -> AppResult<Draft> {
    let body = note_body(db, note_id)?;
    let schema = schema::draft();
    let v = ask(
        llm,
        &JsonRequest {
            name: "note_draft",
            system: &prompts::system(prompts::DRAFT_SYSTEM),
            prompt: &prompts::draft(&body, &current_time()),
            schema: &schema,
        },
    )?;
    let draft = tidy_draft(serde_json::from_value(v).map_err(|e| AppError::Provider(format!("unexpected draft shape: {e}")))?, &body);
    db.with(|c| {
        c.execute(
            "INSERT OR REPLACE INTO note_drafts (note_id, draft, created_at) VALUES (?1, ?2, ?3)",
            params![note_id, serde_json::to_string(&draft)?, now()],
        )?;
        Ok(())
    })?;
    Ok(draft)
}

/// Final pass: answers and chosen cards in, proposals into the inbox.
pub fn finish(db: &Db, llm: &dyn Llm, note_id: &str, answers: &[Answer], card_ids: &[String]) -> AppResult<Outcome> {
    let body = note_body(db, note_id)?;
    let draft: Option<Draft> = db
        .with(|c| Ok(c.query_row("SELECT draft FROM note_drafts WHERE note_id = ?1", [note_id], |r| r.get::<_, String>(0)).optional()?))?
        .and_then(|s| serde_json::from_str(&s).ok());
    let answers: Vec<Answer> = answers.iter().filter(|a| !a.value.trim().is_empty()).cloned().collect();
    let cards: Vec<&Card> = draft.iter().flat_map(|d| d.cards.iter()).filter(|c| card_ids.contains(&c.id)).collect();
    let schema = schema::finalize();
    let v = ask(
        llm,
        &JsonRequest {
            name: "note_items",
            system: &prompts::system(prompts::FINAL_SYSTEM),
            prompt: &prompts::finalize(&body, &current_time(), draft.as_ref(), &answers, &cards),
            schema: &schema,
        },
    )?;
    let raw: RawFinal = serde_json::from_value(v).map_err(|e| AppError::Provider(format!("unexpected items shape: {e}")))?;
    let proposals: Vec<Proposal> = raw.items.into_iter().filter_map(to_proposal).take(MAX_ITEMS).collect();
    let events = proposals.iter().filter(|p| p.kind == "event").count();
    let mut insights = raw.insights;
    insights.retain(|s| !s.trim().is_empty());
    insights.truncate(3);

    db.with(|c| {
        let tx = c.unchecked_transaction()?;
        inbox::add(&tx, Some(note_id), &proposals)?;
        capture::mark_processed(&tx, note_id, proposals.len())?;
        tx.execute("DELETE FROM note_drafts WHERE note_id = ?1", [note_id])?;
        tx.commit()?;
        Ok(())
    })?;
    Ok(Outcome { count: proposals.len(), tasks: proposals.len() - events, events, insights })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{board, calendar};
    use serde_json::json;
    use std::cell::RefCell;

    /// Answers with queued JSON and remembers the prompts.
    struct Fake {
        answers: RefCell<Vec<AppResult<Value>>>,
        prompts: RefCell<Vec<String>>,
    }

    impl Fake {
        fn new(answers: Vec<AppResult<Value>>) -> Self {
            Self { answers: RefCell::new(answers), prompts: RefCell::default() }
        }
    }

    impl Llm for Fake {
        fn json(&self, req: &JsonRequest) -> AppResult<Value> {
            self.prompts.borrow_mut().push(req.prompt.to_string());
            self.answers.borrow_mut().remove(0)
        }
    }

    fn db_with_note(body: &str) -> (Db, String) {
        let db = Db::in_memory(&[
            ("board", board::SCHEMA),
            ("calendar", calendar::SCHEMA),
            ("capture", capture::SCHEMA),
            ("inbox", inbox::SCHEMA),
            ("refine", SCHEMA),
        ])
        .unwrap();
        let id = db.with(|c| capture::save(c, None, body)).unwrap().unwrap().id;
        (db, id)
    }

    #[test]
    fn wizard_round_trip_lands_in_inbox() {
        let (db, note) = db_with_note("prepare slides for the client thing\n\ndentist tue 10");
        let fake = Fake::new(vec![
            Ok(json!({
                "wizard": true,
                "items": [{ "id": "d1", "kind": "task", "title": "Prepare slides", "confidence": 0.6, "refs": ["line-1"] }],
                "questions": [
                    { "id": "q1", "kind": "due_date", "label": "When are the slides due?", "refs": ["line-1"],
                      "options": [{ "label": "Friday", "value": "2026-01-09" }, { "label": "Soon", "value": "soon" }] },
                    { "id": "q1", "kind": "due_date", "label": "duplicate", "refs": [], "options": [] },
                    { "id": "q2", "kind": "mood", "label": "Unknown kind", "refs": [], "options": [] }
                ],
                "cards": [{ "id": "c1", "title": "Split into steps", "rationale": "Big task", "count": 3 }]
            })),
            Ok(json!({
                "items": [
                    { "kind": "task", "title": "Prepare client slides", "priority": "HIGH", "estimatedMinutes": 88, "context": "computer",
                      "dueDate": "2026-01-09", "subtasks": ["Outline", " ", "Draft"], "deepWork": false, "confidence": 1.4,
                      "strategies": [{ "book": "gtd", "principle": "next_action", "explanation": "First step defined." }] },
                    { "kind": "event", "title": "Dentist", "date": "2026-01-13", "startTime": "10:00", "endTime": "09:00",
                      "eventType": "nonsense", "deepWork": false, "confidence": 0.9, "strategies": [] },
                    { "kind": "event", "title": "Meeting someday", "date": "next week", "startTime": "15:00", "confidence": 0.5, "strategies": [] },
                    { "kind": "task", "title": "  ", "confidence": 0.5, "strategies": [] }
                ],
                "insights": ["Do the slides in the morning.", ""]
            })),
        ]);

        let d = start(&db, &fake, &note).unwrap();
        assert!(d.wizard);
        assert_eq!(d.questions.len(), 1, "duplicate and unknown kinds are dropped");
        assert_eq!(d.questions[0].options.len(), 1, "non-date options are dropped");
        assert_eq!(d.questions[0].quotes, vec!["prepare slides for the client thing"]);
        assert!(fake.prompts.borrow()[0].contains("line-3: dentist tue 10"));

        let out = finish(&db, &fake, &note, &[Answer { question_id: "q1".into(), value: "2026-01-09".into() }], &["c1".into()]).unwrap();
        assert_eq!((out.count, out.tasks, out.events), (3, 2, 1));
        assert_eq!(out.insights, vec!["Do the slides in the morning."]);
        let final_prompt = fake.prompts.borrow()[1].clone();
        assert!(final_prompt.contains("A: 2026-01-09"));
        assert!(final_prompt.contains("Split into steps (about 3)"));

        let items = db.with(inbox::pending).unwrap();
        let slides = &items.iter().find(|i| i.proposal.title == "Prepare client slides").unwrap().proposal;
        assert_eq!(slides.priority.as_deref(), Some("high"));
        assert_eq!(slides.estimate_min, Some(90));
        assert_eq!(slides.context.as_deref(), Some("@computer"));
        assert_eq!(slides.subtasks.len(), 2);
        assert_eq!(slides.confidence, Some(1.0));
        let dentist = &items.iter().find(|i| i.proposal.title == "Dentist").unwrap().proposal;
        assert_eq!((dentist.kind.as_str(), dentist.end_time.as_deref()), ("event", None));
        assert_eq!(dentist.event_kind.as_deref(), Some("meeting"));
        let someday = &items.iter().find(|i| i.proposal.title == "Meeting someday").unwrap().proposal;
        assert_eq!(someday.kind, "task", "an event without a real date becomes a task");

        let n = db.with(|c| capture::get(c, &note)).unwrap();
        assert_eq!(n.item_count, 3);
        assert!(n.processed_at.is_some());
    }

    #[test]
    fn clear_notes_skip_the_wizard() {
        let (db, note) = db_with_note("call mom");
        let fake = Fake::new(vec![Ok(json!({ "wizard": true, "items": [], "questions": [], "cards": [] }))]);
        assert!(!start(&db, &fake, &note).unwrap().wizard);
    }

    #[test]
    fn retries_once_on_bad_output() {
        let (db, note) = db_with_note("call mom");
        let fake = Fake::new(vec![
            Err(AppError::Provider("the model did not return valid JSON".into())),
            Ok(json!({ "items": [{ "kind": "task", "title": "Call mom", "confidence": 0.9, "strategies": [] }] })),
        ]);
        assert_eq!(finish(&db, &fake, &note, &[], &[]).unwrap().count, 1);
    }

    #[test]
    fn empty_note_is_refused() {
        let (db, _) = db_with_note("x");
        db.with(|c| capture::save(c, Some("blank"), "   ")).unwrap();
        let fake = Fake::new(vec![]);
        assert!(matches!(start(&db, &fake, "blank"), Err(AppError::NotFound(_) | AppError::InvalidInput(_))));
    }
}
