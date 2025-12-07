fn main() {
    // WebKitGTK's DMA-BUF renderer breaks on some GPU/driver combinations; the fallback is safe everywhere.
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // SAFETY: still single-threaded here, before Tauri starts any threads.
        unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1") };
    }
    unblocked_lib::run();
}
