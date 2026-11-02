mod autostart;
mod commands;
mod models;
#[cfg(target_os = "macos")]
mod macos_tray;
mod storage;
mod window_interaction;
mod window_lifecycle;
mod window_pinning;

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
    // 初始化存储
    let storage = Storage::new().expect("Failed to initialize storage");
    let close_to_tray = storage
        .load_settings()
        .map(|settings| settings.close_to_tray)
        .unwrap_or(true);

    // 创建系统托盘菜单将在setup中处理

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            show_main_window(app);
        }))
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
            commands::is_primary_mouse_down,
            commands::get_tasks,
            commands::reassert_window_topmost,
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
            #[cfg(target_os = "macos")]
            app.handle().plugin(tauri_nspanel::init())?;
            if let Some(window) = app.get_webview_window("main") {
                window_interaction::install(&window).map_err(std::io::Error::other)?;
                app.state::<WindowPinning>()
                    .start(window)
                    .map_err(std::io::Error::other)?;
            }
            #[cfg(target_os = "macos")]
            app.set_menu(Menu::default(app.handle())?)?;

            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            #[cfg(target_os = "macos")]
            let tray_icon = include_bytes!("../icons/tray-macos.png").as_slice();
            #[cfg(not(target_os = "macos"))]
            let tray_icon = include_bytes!("../icons/tray-logo.png").as_slice();
            let tray = TrayIconBuilder::with_id("main")
                .tooltip("事半·SemiDone")
                .icon(tauri::image::Image::from_bytes(tray_icon)?)
                .icon_as_template(cfg!(target_os = "macos"))
                .menu(&menu)
                // Left press restores immediately on macOS; only right-click opens the menu.
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    let restore_on = if cfg!(target_os = "macos") {
                        tauri::tray::MouseButtonState::Down
                    } else {
                        tauri::tray::MouseButtonState::Up
                    };
                    if matches!(
                            event,
                            TrayIconEvent::Click {
                                button: tauri::tray::MouseButton::Left,
                                button_state,
                                ..
                            } if button_state == restore_on
                        )
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;
            #[cfg(target_os = "macos")]
            macos_tray::install(&tray)?;
            app.manage(tray);
            if std::env::args().any(|arg| arg == "--hidden") {
                if let Some(window) = app.get_webview_window("main") {
                    app.state::<WindowPinning>().set_hidden(true);
                    window.hide()?;
                }
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if matches!(event, tauri::RunEvent::Reopen { .. }) {
            show_main_window(app);
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (app, event);
    });
}
