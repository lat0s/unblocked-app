//! AI providers: Gemini or OpenRouter, asked for JSON that matches a schema.
//! Keys live in the OS keyring; `GEMINI_API_KEY` / `OPENROUTER_API_KEY` work as a fallback.

pub mod commands;
mod http;

use crate::core::{AppError, AppResult, Db};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Gemini,
    OpenRouter,
}

impl Provider {
    pub fn default_model(self) -> &'static str {
        match self {
            Self::Gemini => "gemini-2.5-flash",
            Self::OpenRouter => "google/gemini-2.5-flash",
        }
    }

    fn env_var(self) -> &'static str {
        match self {
            Self::Gemini => "GEMINI_API_KEY",
            Self::OpenRouter => "OPENROUTER_API_KEY",
        }
    }

    fn keyring_user(self) -> &'static str {
        match self {
            Self::Gemini => "gemini",
            Self::OpenRouter => "openrouter",
        }
    }
}

/// Non-secret AI settings, stored in the kv table.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub provider: Provider,
    pub model: String,
    /// Gemini File Search store with the productivity books; empty means no grounding.
    #[serde(default)]
    pub store: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self { provider: Provider::Gemini, model: Provider::Gemini.default_model().into(), store: None }
    }
}

const SETTINGS_KEY: &str = "ai.settings";

pub fn settings(db: &Db) -> AppResult<Settings> {
    Ok(match db.kv_get(SETTINGS_KEY)? {
        Some(s) => serde_json::from_str(&s).unwrap_or_default(),
        None => Settings::default(),
    })
}

pub fn save_settings(db: &Db, mut s: Settings) -> AppResult<Settings> {
    s.model = s.model.trim().to_string();
    if s.model.is_empty() {
        s.model = s.provider.default_model().into();
    }
    s.store = s.store.map(|x| x.trim().to_string()).filter(|x| !x.is_empty());
    db.kv_set(SETTINGS_KEY, &serde_json::to_string(&s)?)?;
    Ok(s)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum KeySource {
    Keyring,
    Env,
    None,
}

fn entry(p: Provider) -> AppResult<keyring::Entry> {
    keyring::Entry::new("unblocked", p.keyring_user()).map_err(|e| AppError::Failed(format!("keyring: {e}")))
}

/// The key to use and where it came from. Keyring wins over the environment.
pub fn api_key(p: Provider) -> (Option<String>, KeySource) {
    if let Ok(k) = entry(p).and_then(|e| e.get_password().map_err(|e| AppError::Failed(e.to_string())))
        && !k.trim().is_empty()
    {
        return (Some(k), KeySource::Keyring);
    }
    match std::env::var(p.env_var()) {
        Ok(k) if !k.trim().is_empty() => (Some(k.trim().to_string()), KeySource::Env),
        _ => (None, KeySource::None),
    }
}

pub fn set_key(p: Provider, key: &str) -> AppResult<()> {
    let key = crate::core::required("API key", key)?;
    entry(p)?.set_password(&key).map_err(|e| AppError::Failed(format!("keyring: {e}")))
}

pub fn clear_key(p: Provider) -> AppResult<()> {
    match entry(p)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Failed(format!("keyring: {e}"))),
    }
}

/// One structured request: a system prompt, the user prompt and the JSON schema of the answer.
pub struct JsonRequest<'a> {
    pub name: &'a str,
    pub system: &'a str,
    pub prompt: &'a str,
    pub schema: &'a Value,
}

/// Anything that turns a prompt into JSON. Tests use a fake.
pub trait Llm {
    fn json(&self, req: &JsonRequest) -> AppResult<Value>;
}

/// The configured provider, ready to call.
pub struct Client {
    pub settings: Settings,
    key: String,
}

impl Client {
    pub fn from_db(db: &Db) -> AppResult<Self> {
        let settings = settings(db)?;
        match api_key(settings.provider) {
            (Some(key), _) => Ok(Self { settings, key }),
            (None, _) => Err(AppError::NotConfigured(format!(
                "add a {} API key in Settings (or set {})",
                match settings.provider {
                    Provider::Gemini => "Gemini",
                    Provider::OpenRouter => "OpenRouter",
                },
                settings.provider.env_var()
            ))),
        }
    }

    pub fn models(&self) -> AppResult<Vec<String>> {
        match self.settings.provider {
            Provider::Gemini => http::gemini_models(&self.key),
            Provider::OpenRouter => http::openrouter_models(&self.key),
        }
    }
}

impl Llm for Client {
    fn json(&self, req: &JsonRequest) -> AppResult<Value> {
        let s = &self.settings;
        let text = match s.provider {
            Provider::Gemini => http::gemini(&self.key, &s.model, s.store.as_deref(), req)?,
            Provider::OpenRouter => http::openrouter(&self.key, &s.model, req)?,
        };
        parse_json(&text)
    }
}

/// Parses model output, tolerating a ```json fence around it.
pub fn parse_json(text: &str) -> AppResult<Value> {
    let t = text.trim();
    let t = t.strip_prefix("```json").or_else(|| t.strip_prefix("```")).unwrap_or(t);
    let t = t.strip_suffix("```").unwrap_or(t).trim();
    serde_json::from_str(t).map_err(|e| AppError::Provider(format!("the model did not return valid JSON ({e})")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_fenced_json() {
        assert_eq!(parse_json("```json\n{\"a\":1}\n```").unwrap()["a"], 1);
        assert_eq!(parse_json(" {\"a\":2} ").unwrap()["a"], 2);
        assert!(matches!(parse_json("sorry, I can't"), Err(AppError::Provider(_))));
    }

    #[test]
    fn settings_fall_back_to_defaults() {
        let db = Db::in_memory(&[]).unwrap();
        assert_eq!(settings(&db).unwrap(), Settings::default());
        let saved = save_settings(&db, Settings { provider: Provider::OpenRouter, model: " ".into(), store: Some("  ".into()) }).unwrap();
        assert_eq!(saved.model, "google/gemini-2.5-flash");
        assert_eq!(saved.store, None);
        assert_eq!(settings(&db).unwrap(), saved);
    }
}
