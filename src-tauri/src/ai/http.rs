//! Raw HTTP calls to the providers. Blocking; callers run them off the UI thread.

use super::JsonRequest;
use crate::core::{AppError, AppResult};
use serde_json::{Value, json};
use std::time::Duration;

const GEMINI: &str = "https://generativelanguage.googleapis.com/v1beta";
const OPENROUTER: &str = "https://openrouter.ai/api/v1";

fn agent() -> ureq::Agent {
    ureq::Agent::config_builder().timeout_global(Some(Duration::from_secs(120))).http_status_as_error(false).build().into()
}

/// Turns a non-2xx answer into a readable error, keeping the provider's own message.
fn check(mut res: ureq::http::Response<ureq::Body>) -> AppResult<Value> {
    let status = res.status().as_u16();
    let body: Value = res.body_mut().read_json().unwrap_or(Value::Null);
    if (200..300).contains(&status) {
        return Ok(body);
    }
    let msg = body["error"]["message"].as_str().unwrap_or("no details").to_string();
    Err(match status {
        401 | 403 => AppError::NotConfigured(format!("the API key was rejected: {msg}")),
        _ => AppError::Provider(format!("HTTP {status}: {msg}")),
    })
}

fn net(e: ureq::Error) -> AppError {
    AppError::Provider(format!("network: {e}"))
}

pub fn gemini(key: &str, model: &str, store: Option<&str>, req: &JsonRequest) -> AppResult<String> {
    let mut body = json!({
        "systemInstruction": { "parts": [{ "text": req.system }] },
        "contents": [{ "role": "user", "parts": [{ "text": req.prompt }] }],
        "generationConfig": { "temperature": 0.3, "responseMimeType": "application/json", "responseJsonSchema": req.schema },
    });
    // File Search can't be combined with a response schema on every model, so the schema moves into the prompt.
    if let Some(store) = store {
        body["tools"] = json!([{ "fileSearch": { "fileSearchStoreNames": [store] } }]);
        body["generationConfig"] = json!({ "temperature": 0.3 });
        body["contents"][0]["parts"][0]["text"] =
            json!(format!("{}\n\nReply with JSON only, matching this schema:\n{}", req.prompt, req.schema));
    }
    let res =
        agent().post(format!("{GEMINI}/models/{model}:generateContent")).header("x-goog-api-key", key).send_json(&body).map_err(net)?;
    let v = check(res)?;
    let parts = v["candidates"][0]["content"]["parts"].as_array().cloned().unwrap_or_default();
    let text: String = parts.iter().filter_map(|p| p["text"].as_str()).collect();
    if text.is_empty() {
        let why = v["candidates"][0]["finishReason"].as_str().or(v["promptFeedback"]["blockReason"].as_str()).unwrap_or("empty answer");
        return Err(AppError::Provider(format!("Gemini returned no text ({why})")));
    }
    Ok(text)
}

pub fn openrouter(key: &str, model: &str, req: &JsonRequest) -> AppResult<String> {
    let body = json!({
        "model": model,
        "temperature": 0.3,
        "messages": [{ "role": "system", "content": req.system }, { "role": "user", "content": req.prompt }],
        "response_format": { "type": "json_schema", "json_schema": { "name": req.name, "strict": false, "schema": req.schema } },
    });
    let res = agent()
        .post(format!("{OPENROUTER}/chat/completions"))
        .header("Authorization", &format!("Bearer {key}"))
        .header("X-Title", "Unblocked")
        .send_json(&body)
        .map_err(net)?;
    let v = check(res)?;
    v["choices"][0]["message"]["content"]
        .as_str()
        .filter(|t| !t.trim().is_empty())
        .map(str::to_string)
        .ok_or_else(|| AppError::Provider("OpenRouter returned no text".into()))
}

pub fn gemini_models(key: &str) -> AppResult<Vec<String>> {
    let res = agent().get(format!("{GEMINI}/models?pageSize=200")).header("x-goog-api-key", key).call().map_err(net)?;
    let v = check(res)?;
    let mut out: Vec<String> = v["models"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|m| m["supportedGenerationMethods"].as_array().is_some_and(|a| a.iter().any(|x| x == "generateContent")))
        .filter_map(|m| m["name"].as_str()?.strip_prefix("models/").map(str::to_string))
        .filter(|n| n.starts_with("gemini"))
        .collect();
    out.sort();
    Ok(out)
}

pub fn openrouter_models(key: &str) -> AppResult<Vec<String>> {
    let res = agent().get(format!("{OPENROUTER}/models")).header("Authorization", &format!("Bearer {key}")).call().map_err(net)?;
    let v = check(res)?;
    let mut out: Vec<String> = v["data"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|m| m["supported_parameters"].as_array().is_some_and(|a| a.iter().any(|x| x == "structured_outputs")))
        .filter_map(|m| m["id"].as_str().map(str::to_string))
        .collect();
    out.sort();
    Ok(out)
}
