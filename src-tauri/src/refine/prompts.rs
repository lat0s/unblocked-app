//! Prompts for the two AI passes. Adapted from the course prototype, trimmed to what the model needs.

use super::{Answer, Card, Draft};

/// Shared by both passes: how to classify and which book ideas to apply.
const COACH: &str = r#"You are a calm productivity coach. You turn a messy brain dump into clear tasks and calendar events, using ideas from five books:
- gtd (Getting Things Done, David Allen): next action, contexts (@phone, @computer, @errands, @home, @office), two-minute rule, projects need a first step.
- deep_work (Deep Work, Cal Newport): deep vs shallow work, time blocks of 60-90 minutes, batching shallow work.
- atomic_habits (Atomic Habits, James Clear): two-minute version, habit stacking, make it easy, environment design.
- adhd (ADHD self-help strategies): externalize memory, break it down, make starting easy, add buffers to estimates.
- personal_kanban (Personal Kanban, Jim Benson): visualize work, limit work in progress, pull don't push.
If a file search tool is available, look the ideas up in the books and quote them briefly.

Task or event:
- A task is work the user does whenever they choose, even with a deadline ("finish report by Friday" is a task due Friday).
- An event is a commitment at a set time, usually with other people ("dentist Tuesday 10am", "team dinner at 7").
- "Block time for X" is an event of kind time_block with deepWork true.
- When unsure, choose a task. The user can still schedule it.

Resolve relative dates ("friday", "next week", "tomorrow") against the current date given below. Never invent times the note does not mention."#;

pub const DRAFT_SYSTEM: &str = r#"First pass. Do NOT produce final items yet.

Read the numbered note, list the items you see, and decide if a few quick questions would clearly improve the result.
- Be conservative. If the note is clear enough, set wizard to false and ask nothing.
- Only ask when the answer changes the outcome: task vs event, a missing date or time for something that clearly has one, what a vague line means, or how many cards to split a big item into.
- At most 5 questions and 3 card suggestions, most useful first. Never ask twice about the same thing.
- Each question points at the lines it is about (refs like "line-3") and offers 2-4 quick options as {label, value}.
  For due_date the value is YYYY-MM-DD; for due_time it is HH:MM (24h). For other kinds label and value can match.
- Question kinds: context (what is this about), item_type (task or event), due_date, due_time, context_tag (@phone, @computer...), card_count (how many pieces).
- Card suggestions are optional transformations the user can switch on, like "Split the thesis into starter tasks" or "Batch the calls"."#;

pub const FINAL_SYSTEM: &str = r#"Final pass. Turn the note plus the user's answers into final items.
- The user's answers beat your own guesses. Keep their exact dates and times.
- Apply the selected cards (for example, split into the suggested number of tasks).
- Titles are short and start with a verb. Tasks get a concrete first step in nextAction ("Open the doc and write three headings", not "work on report").
- Estimate minutes honestly and add a small buffer. Anything over 90 minutes gets 2-6 subtasks.
- Every item gets 1-2 strategies: which book, which principle, and one sentence on how it applies here.
- confidence is 0..1: 0.9 clear and specific, 0.7 small assumptions, 0.5 rough interpretation, below 0.4 a guess.
- Use null for anything you do not know. Do not add filler text.
- insights: up to 3 short, practical observations about the whole note (for example "Batch the three @phone calls")."#;

pub fn system(pass: &str) -> String {
    format!("{COACH}\n\n{pass}")
}

/// Non-empty lines, numbered as in the editor, so refs like "line-3" match what the user sees.
pub fn lines(body: &str) -> Vec<(usize, &str)> {
    body.lines().enumerate().map(|(i, l)| (i + 1, l.trim())).filter(|(_, l)| !l.is_empty()).collect()
}

fn numbered(body: &str) -> String {
    lines(body).iter().map(|(n, l)| format!("line-{n}: {l}\n")).collect()
}

pub fn draft(body: &str, now: &str) -> String {
    format!("Current date and time: {now}\n\n## Note\n{}", numbered(body))
}

pub fn finalize(body: &str, now: &str, draft: Option<&Draft>, answers: &[Answer], cards: &[&Card]) -> String {
    let mut p = format!("Current date and time: {now}\n\n## Note\n{}", numbered(body));
    if let Some(d) = draft
        && !d.items.is_empty()
    {
        p.push_str("\n## Your first-pass reading\n");
        for i in &d.items {
            p.push_str(&format!("- {} ({}) [{}]: {}\n", i.title, i.kind, i.refs.join(", "), i.summary.as_deref().unwrap_or("")));
        }
    }
    if !answers.is_empty() {
        p.push_str("\n## The user's answers\n");
        for a in answers {
            let q = draft.and_then(|d| d.questions.iter().find(|q| q.id == a.question_id));
            match q {
                Some(q) => p.push_str(&format!("- Q ({}, about {}): {}\n  A: {}\n", q.kind, q.refs.join(", "), q.label, a.value)),
                None => p.push_str(&format!("- {}\n", a.value)),
            }
        }
    }
    if !cards.is_empty() {
        p.push_str("\n## Cards the user switched on\n");
        for c in cards {
            let n = c.count.map(|n| format!(" (about {n})")).unwrap_or_default();
            p.push_str(&format!("- {}{n}: {}\n", c.title, c.rationale));
        }
    }
    p
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers_match_editor_lines() {
        assert_eq!(lines("a\n\n  b \n"), vec![(1, "a"), (3, "b")]);
        assert!(draft("a\n\nb", "Mon").contains("line-3: b"));
    }
}
