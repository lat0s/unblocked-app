//! JSON schemas the providers must answer with.

use serde_json::{Value, json};

fn nullable(t: &str) -> Value {
    json!({ "type": [t, "null"] })
}

fn strategies() -> Value {
    json!({
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "book": { "type": "string", "enum": ["gtd", "deep_work", "atomic_habits", "adhd", "personal_kanban"] },
                "principle": { "type": "string" },
                "explanation": { "type": "string" }
            },
            "required": ["book", "principle", "explanation"]
        }
    })
}

pub fn draft() -> Value {
    json!({
        "type": "object",
        "properties": {
            "wizard": { "type": "boolean" },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "kind": { "type": "string", "enum": ["task", "event"] },
                        "title": { "type": "string" },
                        "summary": nullable("string"),
                        "confidence": { "type": "number" },
                        "refs": { "type": "array", "items": { "type": "string" } }
                    },
                    "required": ["id", "kind", "title", "confidence", "refs"]
                }
            },
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "kind": { "type": "string", "enum": ["context", "item_type", "due_date", "due_time", "context_tag", "card_count"] },
                        "label": { "type": "string" },
                        "placeholder": nullable("string"),
                        "required": { "type": "boolean" },
                        "refs": { "type": "array", "items": { "type": "string" } },
                        "options": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": { "label": { "type": "string" }, "value": { "type": "string" } },
                                "required": ["label", "value"]
                            }
                        }
                    },
                    "required": ["id", "kind", "label", "refs", "options"]
                }
            },
            "cards": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "title": { "type": "string" },
                        "rationale": { "type": "string" },
                        "count": nullable("integer")
                    },
                    "required": ["id", "title", "rationale"]
                }
            },
            "insights": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["wizard", "items", "questions", "cards"]
    })
}

pub fn finalize() -> Value {
    json!({
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "kind": { "type": "string", "enum": ["task", "event"] },
                        "title": { "type": "string" },
                        "description": nullable("string"),
                        "priority": { "type": ["string", "null"], "enum": ["low", "medium", "high", "urgent", null] },
                        "workType": { "type": ["string", "null"], "enum": ["deep", "shallow", null] },
                        "energy": { "type": ["string", "null"], "enum": ["low", "medium", "high", null] },
                        "estimatedMinutes": nullable("integer"),
                        "context": nullable("string"),
                        "dueDate": nullable("string"),
                        "nextAction": nullable("string"),
                        "subtasks": { "type": "array", "items": { "type": "string" } },
                        "eventType": { "type": ["string", "null"], "enum": ["meeting", "time_block", "reminder", null] },
                        "date": nullable("string"),
                        "startTime": nullable("string"),
                        "endTime": nullable("string"),
                        "deepWork": { "type": "boolean" },
                        "strategies": strategies(),
                        "confidence": { "type": "number" }
                    },
                    "required": ["kind", "title", "strategies", "confidence"]
                }
            },
            "insights": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["items"]
    })
}
