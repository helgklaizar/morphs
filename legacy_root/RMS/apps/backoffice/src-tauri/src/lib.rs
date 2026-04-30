mod sync;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Fixes Vulnerability 1 and 3: Start the newly rewritten sync engine
            let app_handle = app.handle().clone();
            // In a real app the path might come from app.path()
            let db_path = "rms_shop.db".to_string(); 
            tauri::async_runtime::spawn(async move {
                sync::start_sync_worker(app_handle, db_path).await;
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
