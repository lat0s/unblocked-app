//! One error type for every command; serialized as `{ kind, message }` for the UI.

use serde::Serialize;
use std::fmt;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind", content = "message", rename_all = "camelCase")]
pub enum AppError {
    /// Something the user has to set up first (no API key, no model...).
    NotConfigured(String),
    NotFound(String),
    InvalidInput(String),
    /// The AI provider answered, but not with what we asked for.
    Provider(String),
    Failed(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (k, m) = match self {
            Self::NotConfigured(m) => ("not configured", m),
            Self::NotFound(m) => ("not found", m),
            Self::InvalidInput(m) => ("invalid input", m),
            Self::Provider(m) => ("provider", m),
            Self::Failed(m) => ("failed", m),
        };
        write!(f, "{k}: {m}")
    }
}

impl std::error::Error for AppError {}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        match e {
            rusqlite::Error::QueryReturnedNoRows => Self::NotFound("no such item".into()),
            e => Self::Failed(format!("database: {e}")),
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        Self::Failed(format!("json: {e}"))
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        Self::Failed(e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_for_ui() {
        let j = serde_json::to_string(&AppError::NotConfigured("no key".into())).unwrap();
        assert_eq!(j, r#"{"kind":"notConfigured","message":"no key"}"#);
    }

    #[test]
    fn missing_row_is_not_found() {
        let e: AppError = rusqlite::Error::QueryReturnedNoRows.into();
        assert!(matches!(e, AppError::NotFound(_)));
    }
}
