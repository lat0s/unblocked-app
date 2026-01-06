//! Unblocked: brain dump in, plan out.
//! Each feature is a vertical slice (domain logic, schema and its Tauri commands); `core` is the shared kernel.

pub mod ai;
pub mod board;
pub mod calendar;
pub mod capture;
pub mod core;
pub mod inbox;

use std::sync::Arc;
use tauri::Manager;

/// Every slice's schema, in the order it was introduced.
pub fn migrations() -> Vec<core::db::Migration> {
    vec![("board", board::SCHEMA), ("calendar", calendar::SCHEMA), ("capture", capture::SCHEMA), ("inbox", inbox::SCHEMA)]
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
            ai::commands::ai_status,
            ai::commands::ai_save_settings,
            ai::commands::ai_set_key,
            ai::commands::ai_clear_key,
            ai::commands::ai_models,
            ai::commands::ai_test,
            board::commands::tasks_list,
            board::commands::task_create,
            board::commands::task_update,
            board::commands::task_move,
            board::commands::task_delete,
            capture::commands::notes_list,
            capture::commands::note_save,
            capture::commands::note_delete,
            inbox::commands::inbox_list,
            inbox::commands::inbox_update,
            inbox::commands::inbox_accept,
            inbox::commands::inbox_accept_note,
            inbox::commands::inbox_dismiss,
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
