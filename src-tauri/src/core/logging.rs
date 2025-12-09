//! File logger with size rotation and a panic hook. No external deps beyond `log`.
//! Logs: $XDG_STATE_HOME/unblocked/logs/unblocked.log (1 MiB, one rotated copy).

use log::{Level, LevelFilter, Log, Metadata, Record};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_BYTES: u64 = 1024 * 1024;

pub fn log_dir() -> PathBuf {
    let state = std::env::var_os("XDG_STATE_HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .unwrap_or_else(|| PathBuf::from(std::env::var_os("HOME").unwrap_or_default()).join(".local/state"));
    state.join("unblocked/logs")
}

pub fn log_file() -> PathBuf {
    log_dir().join("unblocked.log")
}

struct FileLogger {
    file: Mutex<Option<File>>,
    level: LevelFilter,
    stderr: bool,
}

fn open() -> Option<File> {
    fs::create_dir_all(log_dir()).ok()?;
    let path = log_file();
    if fs::metadata(&path).is_ok_and(|m| m.len() > MAX_BYTES) {
        let _ = fs::rename(&path, path.with_extension("log.1"));
    }
    OpenOptions::new().create(true).append(true).open(path).ok()
}

/// UTC timestamp without a date crate (days-from-civil, Howard Hinnant).
pub fn timestamp(secs: u64, millis: u32) -> String {
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}.{millis:03}Z", rem / 3600, rem % 3600 / 60, rem % 60)
}

fn now() -> String {
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    timestamp(t.as_secs(), t.subsec_millis())
}

impl Log for FileLogger {
    fn enabled(&self, m: &Metadata) -> bool {
        m.level() <= self.level && (m.target().starts_with("unblocked") || m.level() <= Level::Warn)
    }

    fn log(&self, r: &Record) {
        if !self.enabled(r.metadata()) {
            return;
        }
        let line = format!("{} {:<5} {}: {}\n", now(), r.level(), r.target(), r.args());
        if self.stderr {
            eprint!("{line}");
        }
        let mut guard = self.file.lock().unwrap_or_else(|p| p.into_inner());
        // Reopen on rotation or if the file was deleted.
        if guard.as_ref().and_then(|f| f.metadata().ok()).is_none_or(|m| m.len() > MAX_BYTES || m.nlink() == 0) {
            *guard = open();
        }
        if let Some(f) = guard.as_mut() {
            let _ = f.write_all(line.as_bytes());
        }
    }

    fn flush(&self) {
        if let Some(f) = self.file.lock().unwrap_or_else(|p| p.into_inner()).as_mut() {
            let _ = f.flush();
        }
    }
}

use std::os::unix::fs::MetadataExt;

/// Installs the logger once. Level from UNBLOCKED_LOG (error|warn|info|debug|trace), default info.
pub fn init() {
    let level = match std::env::var("UNBLOCKED_LOG").unwrap_or_default().to_ascii_lowercase().as_str() {
        "error" => LevelFilter::Error,
        "warn" => LevelFilter::Warn,
        "debug" => LevelFilter::Debug,
        "trace" => LevelFilter::Trace,
        _ => LevelFilter::Info,
    };
    let logger = FileLogger { file: Mutex::new(open()), level, stderr: cfg!(debug_assertions) };
    if log::set_boxed_logger(Box::new(logger)).is_ok() {
        log::set_max_level(level);
    }
    std::panic::set_hook(Box::new(|info| {
        let bt = std::backtrace::Backtrace::force_capture();
        log::error!("panic: {info}\n{bt}");
        log::logger().flush();
        eprintln!("unblocked panicked: {info} (details in {})", log_file().display());
    }));
}

/// One line describing the machine, logged at startup to make bug reports useful.
pub fn system_summary() -> String {
    let os = fs::read_to_string("/etc/os-release")
        .ok()
        .and_then(|s| s.lines().find_map(|l| l.strip_prefix("PRETTY_NAME=").map(|v| v.trim_matches('"').to_string())))
        .unwrap_or_else(|| "unknown distro".into());
    let kernel = fs::read_to_string("/proc/sys/kernel/osrelease").unwrap_or_default();
    let desktop = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_else(|_| "unknown".into());
    let session = std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".into());
    format!("{} v{} on {os}, kernel {}, desktop {desktop} ({session})", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"), kernel.trim())
}

#[cfg(test)]
mod tests {
    use super::timestamp;

    #[test]
    fn formats_utc() {
        assert_eq!(timestamp(0, 0), "1970-01-01T00:00:00.000Z");
        assert_eq!(timestamp(1_793_365_200, 5), "2026-10-30T13:00:00.005Z");
        assert_eq!(timestamp(951_782_400, 0), "2000-02-29T00:00:00.000Z");
    }
}
