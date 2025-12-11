//! Unblocked: brain dump in, plan out.
//! Each feature is a vertical slice (domain logic, schema and its Tauri commands); `core` is the shared kernel.

pub mod board;
pub mod calendar;
pub mod core;

use std::sync::Arc;
use tauri::Manager;

/// Every slice's schema, in the order it was introduced.
pub fn migrations() -> Vec<core::db::Migration> {
    vec![("board", board::SCHEMA), ("calendar", calendar::SCHEMA)]
}

pub fn run() {
    core::logging::init();
    log::info!("starting {}", core::logging::system_summary());

    let path = core::db::db_path();
    let db = match core::Db::open(&path, &migrations()) {
        Ok(db) => Arc::new(db),
        Err(e) => {
            log::error!("cannot open {}: {e}", path.display());
            eprintln!("unblocked could not open its database at {}: {e}", path.display());
            std::process::exit(1);
        }
    };

    let result = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .manage::<core::SharedDb>(db)
        .invoke_handler(tauri::generate_handler![
            core::commands::app_info,
            core::commands::log_client,
            core::commands::pref_get,
            core::commands::pref_set,
            board::commands::tasks_list,
            board::commands::task_create,
            board::commands::task_update,
            board::commands::task_move,
            board::commands::task_delete,
            calendar::commands::events_list,
            calendar::commands::event_create,
            calendar::commands::event_update,
            calendar::commands::event_delete,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = result {
        log::error!("tauri failed to start: {e}");
        eprintln!("unblocked could not start: {e}");
        std::process::exit(1);
    }
}
