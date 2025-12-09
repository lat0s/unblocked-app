//! Shared kernel: errors, logging, the SQLite store and a few small helpers.

pub mod commands;
pub mod db;
pub mod error;
pub mod logging;

pub use db::Db;
pub use error::{AppError, AppResult};

use std::sync::Arc;

pub type SharedDb = Arc<Db>;

/// Runs blocking work off the UI thread; failures and panics are logged, never fatal.
pub async fn blocking<T: Send + 'static>(name: &'static str, f: impl FnOnce() -> AppResult<T> + Send + 'static) -> AppResult<T> {
    let res = match tauri::async_runtime::spawn_blocking(f).await {
        Ok(r) => r,
        Err(e) => Err(AppError::Failed(format!("{name} crashed: {e}"))),
    };
    if let Err(e) = &res {
        match e {
            AppError::NotConfigured(_) | AppError::NotFound(_) => log::info!("{name}: {e}"),
            _ => log::warn!("{name}: {e}"),
        }
    }
    res
}

/// RFC 3339 UTC timestamp.
pub fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}

/// Trims and rejects empty text.
pub fn required(field: &str, value: &str) -> AppResult<String> {
    let v = value.trim();
    if v.is_empty() { Err(AppError::InvalidInput(format!("{field} is required"))) } else { Ok(v.to_string()) }
}
