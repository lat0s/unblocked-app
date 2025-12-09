//! SQLite store. One connection behind a mutex; each feature slice brings its own migration.

use super::{AppError, AppResult};
use rusqlite::{Connection, OptionalExtension, params};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// A named schema step. Names are recorded once applied, so order only matters within a run.
pub type Migration = (&'static str, &'static str);

pub struct Db {
    conn: Mutex<Connection>,
}

const CORE_SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
";

pub fn data_dir() -> PathBuf {
    let base = std::env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .unwrap_or_else(|| PathBuf::from(std::env::var_os("HOME").unwrap_or_default()).join(".local/share"));
    base.join("unblocked")
}

/// UNBLOCKED_DB overrides the location (tests, demos, a second profile).
pub fn db_path() -> PathBuf {
    std::env::var_os("UNBLOCKED_DB").map(PathBuf::from).unwrap_or_else(|| data_dir().join("unblocked.db"))
}

impl Db {
    pub fn open(path: &Path, migrations: &[Migration]) -> AppResult<Self> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        Self::init(Connection::open(path)?, migrations)
    }

    pub fn in_memory(migrations: &[Migration]) -> AppResult<Self> {
        Self::init(Connection::open_in_memory()?, migrations)
    }

    fn init(conn: Connection, migrations: &[Migration]) -> AppResult<Self> {
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;")?;
        conn.execute_batch(CORE_SCHEMA)?;
        for (name, sql) in migrations {
            let done: Option<String> = conn.query_row("SELECT name FROM migrations WHERE name = ?1", [name], |r| r.get(0)).optional()?;
            if done.is_some() {
                continue;
            }
            let tx = conn.unchecked_transaction()?;
            tx.execute_batch(sql).map_err(|e| AppError::Failed(format!("migration {name}: {e}")))?;
            tx.execute("INSERT INTO migrations (name, applied_at) VALUES (?1, ?2)", params![name, super::now()])?;
            tx.commit()?;
            log::info!("applied migration {name}");
        }
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn with<T>(&self, f: impl FnOnce(&Connection) -> AppResult<T>) -> AppResult<T> {
        let conn = self.conn.lock().unwrap_or_else(|p| p.into_inner());
        f(&conn)
    }

    pub fn kv_get(&self, key: &str) -> AppResult<Option<String>> {
        self.with(|c| Ok(c.query_row("SELECT value FROM kv WHERE key = ?1", [key], |r| r.get(0)).optional()?))
    }

    pub fn kv_set(&self, key: &str, value: &str) -> AppResult<()> {
        self.with(|c| {
            c.execute("INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value])?;
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_once() {
        let m: &[Migration] = &[("t1", "CREATE TABLE a (x INTEGER)")];
        let db = Db::in_memory(m).unwrap();
        let n: i64 = db.with(|c| Ok(c.query_row("SELECT count(*) FROM migrations", [], |r| r.get(0))?)).unwrap();
        assert_eq!(n, 1);
    }

    #[test]
    fn kv_round_trip() {
        let db = Db::in_memory(&[]).unwrap();
        assert_eq!(db.kv_get("theme").unwrap(), None);
        db.kv_set("theme", "dark").unwrap();
        db.kv_set("theme", "light").unwrap();
        assert_eq!(db.kv_get("theme").unwrap().as_deref(), Some("light"));
    }
}
