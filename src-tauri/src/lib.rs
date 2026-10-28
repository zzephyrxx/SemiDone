mod autostart;
mod commands;
mod models;
mod single_instance;
mod storage;
mod window_interaction;
mod window_lifecycle;
mod window_pinning;

use single_instance::ensure_single_instance;
use std::sync::Mutex;
use storage::Storage;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use window_lifecycle::WindowLifecycle;
use window_pinning::{show_main_window, WindowPinning};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 检查单实例
    if let Err(e) = ensure_single_instance("SemiDone") {
        eprintln!("Application is already running: {}", e);
        std::process::exit(1);
    }

    // 初始化存储
    let storage = Storage::new().expect("Failed to initialize storage");
    let close_to_tray = storage
        .load_settings()
        .map(|settings| settings.close_to_tray)
        .unwrap_or(true);

    // 创建系统托盘菜单将在setup中处理

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .manage(Mutex::new(storage))
        .manage(WindowPinning::default())
        .manage(WindowLifecycle::new(close_to_tray))
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            let pinning = window.state::<WindowPinning>();
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    if !window.state::<WindowLifecycle>().close_to_tray() {
                        return;
                    }
                    // Keep the window/WebView alive. Only the explicit quit
                    // action exits the process while this preference is on.
                    api.prevent_close();
                    pinning.set_hidden(true);
                    if let Err(error) = window.hide() {
                        log::warn!("Failed to hide window: {error}");
                        pinning.set_hidden(false);
                    }
                }
                WindowEvent::Destroyed => pinning.stop(),
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_window_topmost,
            commands::set_window_pin_mode,
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::get_task_stats,
            commands::get_settings,
            commands::update_settings,
            commands::get_usage_data,
            commands::save_usage_data,
            commands::clear_usage_data,
            commands::export_data,
            commands::import_data,
            commands::clear_all_data,
            commands::exit_app,
            commands::close_main_window,
            commands::get_data_dir_path,
            commands::open_file_with_system,
            commands::open_file_by_path,
            commands::open_folder_in_explorer,
            commands::get_autostart_enabled,
            commands::set_autostart_enabled,
            commands::save_attachment,
            commands::get_attachment_path,
            commands::get_attachment_as_base64,
            commands::delete_attachment,
            commands::delete_task_attachments,
            commands::set_data_dir,
            commands::migrate_data_dir
        ])
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if let Err(error) = autostart::refresh_existing_registration(app.handle()) {
                log::warn!("Failed to refresh autostart registration: {error}");
            }
            if let Some(window) = app.get_webview_window("main") {
                window_interaction::install(&window).map_err(std::io::Error::other)?;
                app.state::<WindowPinning>()
                    .start(window)
                    .map_err(std::io::Error::other)?;
            }
            // 创建托盘右键菜单
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 创建系统托盘（左键单击唤醒，右键显示菜单）
            // 重要：必须保存托盘对象到应用状态，否则会被释放导致功能失效
            let tray = TrayIconBuilder::with_id("main")
                .tooltip("事半·SemiDone")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // 关键修复：将托盘对象保存到应用状态中，防止被释放
            app.manage(tray);
            println!("托盘对象已保存到应用状态，生命周期已绑定到应用\n");

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
