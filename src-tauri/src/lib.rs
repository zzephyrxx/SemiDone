mod models;
mod storage;
mod commands;
mod single_instance;

use std::sync::Mutex;
use storage::Storage;
use single_instance::ensure_single_instance;
use tauri::{Manager, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // 检查单实例
  if let Err(e) = ensure_single_instance("SemiDone") {
    eprintln!("Application is already running: {}", e);
    std::process::exit(1);
  }
  
  // 初始化存储
  let storage = Storage::new().expect("Failed to initialize storage");
  
  // 创建系统托盘菜单将在setup中处理
  
  tauri::Builder::default()
    .manage(Mutex::new(storage))
    .on_window_event(|_window, event| match event {
      WindowEvent::CloseRequested { api, .. } => {
        _window.hide().unwrap();
        api.prevent_close();
      }
      _ => {}
    })
    .invoke_handler(tauri::generate_handler![
      commands::get_tasks,
      commands::create_task,
      commands::update_task,
      commands::delete_task,
      commands::get_task_stats,
      commands::get_settings,
      commands::update_settings,
      commands::export_data,
      commands::import_data,
      commands::clear_all_data,
      commands::exit_app,
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
    .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
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
        .on_menu_event(|app, event| {
          println!("🔔 托盘菜单事件: {}", event.id.as_ref());
          match event.id.as_ref() {
            "show" => {
              println!("  └─ 显示窗口");
              if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_always_on_top(true);
                let _ = window.set_focus();
                let _ = window.set_always_on_top(false);
                println!("  └─ ✅ 窗口已显示并聚焦");
              }
            }
            "quit" => {
              println!("  └─ 退出应用");
              app.exit(0);
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
          match event {
            TrayIconEvent::Click { button, button_state, .. } => {
              println!("🔔 托盘点击事件 - 按钮: {:?}, 状态: {:?}", button, button_state);
              
              // 只响应左键释放事件
              if button == tauri::tray::MouseButton::Left && button_state == tauri::tray::MouseButtonState::Up {
                println!("  └─ ✅ 左键释放，立即处理（无阻塞）");
                
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                  println!("  ├─ 找到窗口: main");
                  
                  // 检查窗口是否可见
                  match window.is_visible() {
                    Ok(is_visible) => {
                      println!("  ├─ 窗口可见性: {}", is_visible);
                      
                      if is_visible {
                        // 窗口已显示：聚焦并置顶到前台
                        println!("  ├─ 📍 窗口已显示，强制聚焦到前台");
                        
                        // 先取消最小化
                        if let Err(e) = window.unminimize() {
                          println!("  │  ├─ ⚠️ 取消最小化失败: {:?}", e);
                        } else {
                          println!("  │  ├─ ✅ 取消最小化成功");
                        }
                        
                        // 临时置顶（Windows需要这样才能强制前台）
                        if let Err(e) = window.set_always_on_top(true) {
                          println!("  │  ├─ ⚠️ 临时置顶失败: {:?}", e);
                        } else {
                          println!("  │  ├─ ✅ 临时置顶成功");
                        }
                        
                        // 聚焦
                        if let Err(e) = window.set_focus() {
                          println!("  │  ├─ ⚠️ 聚焦失败: {:?}", e);
                        } else {
                          println!("  │  ├─ ✅ 聚焦成功");
                        }
                        
                        // 立即取消置顶
                        if let Err(e) = window.set_always_on_top(false) {
                          println!("  │  └─ ⚠️ 取消置顶失败: {:?}", e);
                        } else {
                          println!("  │  └─ ✅ 取消置顶成功");
                        }
                      } else {
                        // 窗口隐藏：显示并聚焦
                        println!("  ├─ 👁️ 窗口隐藏，重新显示并聚焦");
                        
                        // 先显示
                        if let Err(e) = window.show() {
                          println!("  │  ├─ ⚠️ 显示窗口失败: {:?}", e);
                        } else {
                          println!("  │  ├─ ✅ 显示窗口成功");
                        }
                        
                        // 取消最小化
                        if let Err(e) = window.unminimize() {
                          println!("  │  ├─ ⚠️ 取消最小化失败: {:?}", e);
                        } else {
                          println!("  │  ├─ ✅ 取消最小化成功");
                        }
                        
                        // 临时置顶以强制前台
                        if let Err(e) = window.set_always_on_top(true) {
                          println!("  │  ├─ ⚠️ 临时置顶失败: {:?}", e);
                        } else {
                          println!("  │  ├─ ✅ 临时置顶成功");
                        }
                        
                        // 聚焦
                        if let Err(e) = window.set_focus() {
                          println!("  │  ├─ ⚠️ 聚焦失败: {:?}", e);
                        } else {
                          println!("  │  ├─ ✅ 聚焦成功");
                        }
                        
                        // 取消置顶
                        if let Err(e) = window.set_always_on_top(false) {
                          println!("  │  └─ ⚠️ 取消置顶失败: {:?}", e);
                        } else {
                          println!("  │  └─ ✅ 取消置顶成功");
                        }
                      }
                      
                      println!("✅ [处理完成] 托盘单击处理完成（无阻塞）\n");
                    }
                    Err(e) => {
                      println!("  └─ ❌ 检查窗口可见性失败: {:?}", e);
                    }
                  }
                } else {
                  println!("  └─ ❌ 未找到窗口: main");
                }
              }
              // 不输出忽略消息，减少日志噪音
            }
            _ => {
              // 忽略其他事件（Move, Enter, Leave等），不输出任何日志
            }
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
