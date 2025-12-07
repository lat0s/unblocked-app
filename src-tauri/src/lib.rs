//! Unblocked: brain dump in, plan out.

use tauri::Manager;

pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .run(tauri::generate_context!());

    if let Err(e) = result {
        eprintln!("unblocked could not start: {e}");
        std::process::exit(1);
    }
}
