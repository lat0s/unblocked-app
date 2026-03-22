//! JSON schemas the providers must answer with.

use serde_json::{Value, json};

/// An object whose properties are all required; Gemini leaves optional ones out.
fn obj(props: Value) -> Value {
    let required: Vec<String> = props.as_object().map(|m| m.keys().cloned().collect()).unwrap_or_default();
    json!({ "type": "object", "properties": props, "required": required })
}

fn list(items: Value) -> Value {
    json!({ "type": "array", "items": items })
}

fn nullable(t: &str) -> Value {
    json!({ "type": [t, "null"] })
}

fn one_of(values: &[&str]) -> Value {
    json!({ "type": ["string", "null"], "enum": values.iter().map(|v| json!(v)).chain([Value::Null]).collect::<Vec<_>>() })
}

fn strategies() -> Value {
    list(obj(json!({
        "method": { "type": "string", "enum": ["gtd", "deep_work", "atomic_habits", "adhd", "personal_kanban"] },
        "principle": { "type": "string" },
        "explanation": { "type": "string" }
    })))
}

pub fn draft() -> Value {
    obj(json!({
        "wizard": { "type": "boolean" },
        "items": list(obj(json!({
            "id": { "type": "string" },
            "kind": { "type": "string", "enum": ["task", "event"] },
            "title": { "type": "string" },
            "summary": nullable("string"),
            "confidence": { "type": "number" },
            "refs": list(json!({ "type": "string" }))
        }))),
        "questions": list(obj(json!({
            "id": { "type": "string" },
            "kind": { "type": "string", "enum": ["context", "item_type", "due_date", "due_time", "context_tag", "card_count"] },
            "label": { "type": "string" },
            "placeholder": nullable("string"),
            "required": { "type": "boolean" },
            "refs": list(json!({ "type": "string" })),
            "options": list(obj(json!({ "label": { "type": "string" }, "value": { "type": "string" } })))
        }))),
        "cards": list(obj(json!({
            "id": { "type": "string" },
            "title": { "type": "string" },
            "rationale": { "type": "string" },
            "count": nullable("integer")
        }))),
        "insights": list(json!({ "type": "string" }))
    }))
}

pub fn finalize() -> Value {
    obj(json!({
        "items": list(obj(json!({
            "kind": { "type": "string", "enum": ["task", "event"] },
            "title": { "type": "string" },
            "description": nullable("string"),
            "priority": one_of(&["low", "medium", "high", "urgent"]),
            "workType": one_of(&["deep", "shallow"]),
            "energy": one_of(&["low", "medium", "high"]),
            "estimatedMinutes": nullable("integer"),
            "context": nullable("string"),
            "dueDate": nullable("string"),
            "nextAction": nullable("string"),
            "subtasks": list(json!({ "type": "string" })),
            "eventType": one_of(&["meeting", "time_block", "reminder"]),
            "date": nullable("string"),
            "startTime": nullable("string"),
            "endTime": nullable("string"),
            "deepWork": { "type": "boolean" },
            "strategies": strategies(),
            "confidence": { "type": "number" }
        }))),
        "insights": list(json!({ "type": "string" }))
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_property_is_required() {
        let item = &finalize()["properties"]["items"]["items"];
        assert_eq!(item["required"].as_array().unwrap().len(), item["properties"].as_object().unwrap().len());
    }
}
