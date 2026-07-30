use crate::models::*;
use crate::storage::Storage;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex, MutexGuard,
};
use tauri::{Manager, State, WebviewWindow};
use tauri_plugin_autostart::ManagerExt;

type StorageState<'a> = State<'a, Mutex<Storage>>;

pub(crate) struct TopmostState {
    enabled: AtomicBool,
    transition_lock: Mutex<()>,
}

impl TopmostState {
    pub(crate) fn new(enabled: bool) -> Self {
        Self {
            enabled: AtomicBool::new(enabled),
            transition_lock: Mutex::new(()),
        }
    }

    pub(crate) fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::Acquire)
    }

    fn lock_transition(&self) -> Result<MutexGuard<'_, ()>, String> {
        self.transition_lock
            .lock()
            .map_err(|error| error.to_string())
    }

    fn swap_unlocked(&self, enabled: bool) -> bool {
        self.enabled.swap(enabled, Ordering::AcqRel)
    }

    fn set_unlocked(&self, enabled: bool) {
        self.enabled.store(enabled, Ordering::Release);
    }

    fn set(&self, enabled: bool) {
        let _transition = self
            .transition_lock
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        self.set_unlocked(enabled);
    }
}

fn set_native_window_topmost(window: &WebviewWindow, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{
            SetWindowPos, HWND_NOTOPMOST, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        };

        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        let insert_after = if enabled {
            HWND_TOPMOST
        } else {
            HWND_NOTOPMOST
        };
        unsafe {
            // 同步更新 Z 序，确保取消置顶返回前 HWND_NOTOPMOST 已真正生效。
            SetWindowPos(
                hwnd,
                Some(insert_after),
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
            )
            .map_err(|error| error.to_string())?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub(crate) fn force_window_topmost(window: &WebviewWindow) -> Result<(), String> {
    set_native_window_topmost(window, true)
}

pub(crate) fn clear_window_topmost(window: &WebviewWindow) -> Result<(), String> {
    set_native_window_topmost(window, false)
}

fn apply_configured_window_topmost(
    window: &WebviewWindow,
    topmost_state: &TopmostState,
) -> Result<(), String> {
    if topmost_state.is_enabled() {
        force_window_topmost(window)
    } else {
        clear_window_topmost(window)
    }
}

pub(crate) fn restore_configured_window_topmost(
    app: &tauri::AppHandle,
    window: &WebviewWindow,
) -> Result<(), String> {
    let topmost_state = app
        .try_state::<TopmostState>()
        .ok_or_else(|| "topmost state is unavailable".to_string())?;
    let _transition = topmost_state.lock_transition()?;
    apply_configured_window_topmost(window, &topmost_state)
}

#[cfg(target_os = "windows")]
fn maintain_window_topmost(window: &WebviewWindow) -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::{
        IsIconic, IsWindowVisible, ShowWindowAsync, SW_SHOWNOACTIVATE,
    };

    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    unsafe {
        // 关闭按钮会将窗口隐藏到托盘；隐藏状态下不应被守卫重新显示。
        if !IsWindowVisible(hwnd).as_bool() {
            return Ok(());
        }

        // Win+D 会将窗口置为 iconic。用不激活的方式恢复，避免抢走键盘焦点。
        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindowAsync(hwnd, SW_SHOWNOACTIVATE);
        }
    }

    // 即使系统仍报告 topmost，也重新确认 Z 序，修复显示桌面后的层级漂移。
    force_window_topmost(window)
}

#[cfg(target_os = "windows")]
pub(crate) fn start_topmost_watchdog(app: tauri::AppHandle) -> std::io::Result<()> {
    use std::thread;
    use std::time::Duration;

    thread::Builder::new()
        .name("semidone-topmost-watchdog".to_string())
        .spawn(move || loop {
            if let Some(topmost_state) = app.try_state::<TopmostState>() {
                if topmost_state.is_enabled() {
                    // 与取消置顶命令串行，并在拿到锁后重新读取状态，避免旧的一轮
                    // 看门狗在 HWND_NOTOPMOST 之后又写回 HWND_TOPMOST。
                    if let Ok(_transition) = topmost_state.lock_transition() {
                        if topmost_state.is_enabled() {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = maintain_window_topmost(&window);
                            }
                        }
                    }
                }
            }

            thread::sleep(Duration::from_millis(500));
        })
        .map(|_| ())
}

#[tauri::command]
pub fn set_window_topmost(
    window: WebviewWindow,
    topmost_state: State<'_, TopmostState>,
    enabled: bool,
) -> Result<(), String> {
    let _transition = topmost_state.lock_transition()?;
    let previous = topmost_state.swap_unlocked(enabled);
    let result = set_native_window_topmost(&window, enabled);

    if result.is_err() {
        topmost_state.set_unlocked(previous);
    }

    result
}

#[tauri::command]
pub fn reassert_window_topmost(
    window: WebviewWindow,
    topmost_state: State<'_, TopmostState>,
) -> Result<(), String> {
    let _transition = topmost_state.lock_transition()?;
    apply_configured_window_topmost(&window, &topmost_state)
}

#[tauri::command]
pub async fn get_tasks(storage: StorageState<'_>) -> Result<ApiResponse<Vec<Task>>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.load_tasks() {
        Ok(tasks) => Ok(ApiResponse::success(tasks)),
        Err(e) => Ok(ApiResponse::error(format!("加载待办失败: {}", e))),
    }
}

#[tauri::command]
pub async fn create_task(
    request: CreateTaskRequest,
    storage: StorageState<'_>,
) -> Result<ApiResponse<Task>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    let priority = request
        .priority
        .map(|p| Priority::from_string(&p))
        .unwrap_or(Priority::Medium);

    let task = Task::new(
        request.title,
        request.description,
        Some(priority),
        request.due_date,
        request.attachments,
        request.recurrence,
        false, // is_recurrence_child
        None,  // parent_task_id
    );

    match storage.add_task(task) {
        Ok(task) => Ok(ApiResponse::success(task)),
        Err(e) => Ok(ApiResponse::error(format!("创建待办失败: {}", e))),
    }
}

#[tauri::command]
pub async fn update_task(
    id: String,
    updates: UpdateTaskRequest,
    storage: StorageState<'_>,
) -> Result<ApiResponse<Option<Task>>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.update_task(&id, &updates) {
        Ok(task) => Ok(ApiResponse::success(task)),
        Err(e) => Ok(ApiResponse::error(format!("更新待办失败: {}", e))),
    }
}

#[tauri::command]
pub async fn delete_task(
    id: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.delete_task(&id) {
        Ok(deleted) => {
            if deleted {
                Ok(ApiResponse::success(true))
            } else {
                Ok(ApiResponse::error("待办不存在".to_string()))
            }
        }
        Err(e) => Ok(ApiResponse::error(format!("删除待办失败: {}", e))),
    }
}

#[tauri::command]
pub async fn get_task_stats(storage: StorageState<'_>) -> Result<ApiResponse<TaskStats>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.load_tasks() {
        Ok(tasks) => {
            let stats = storage.get_task_stats(&tasks);
            Ok(ApiResponse::success(stats))
        }
        Err(e) => Ok(ApiResponse::error(format!("获取统计信息失败: {}", e))),
    }
}

#[tauri::command]
pub async fn get_settings(
    storage: StorageState<'_>,
    topmost_state: State<'_, TopmostState>,
) -> Result<ApiResponse<Settings>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.load_settings() {
        Ok(settings) => {
            topmost_state.set(settings.is_pinned);
            Ok(ApiResponse::success(settings))
        }
        Err(e) => Ok(ApiResponse::error(format!("加载设置失败: {}", e))),
    }
}

#[tauri::command]
pub async fn update_settings(
    settings: Settings,
    storage: StorageState<'_>,
    topmost_state: State<'_, TopmostState>,
) -> Result<ApiResponse<Settings>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.save_settings(&settings) {
        Ok(_) => {
            topmost_state.set(settings.is_pinned);
            Ok(ApiResponse::success(settings))
        }
        Err(e) => Ok(ApiResponse::error(format!("保存设置失败: {}", e))),
    }
}

#[tauri::command]
pub async fn get_usage_data(
    storage: StorageState<'_>,
) -> Result<ApiResponse<Option<serde_json::Value>>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    match storage.load_usage_data() {
        Ok(data) => Ok(ApiResponse::success(data)),
        Err(e) => Ok(ApiResponse::error(format!("加载使用数据失败: {}", e))),
    }
}

#[tauri::command]
pub async fn save_usage_data(
    usage_data: serde_json::Value,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    match storage.save_usage_data(&usage_data) {
        Ok(_) => Ok(ApiResponse::success(true)),
        Err(e) => Ok(ApiResponse::error(format!("保存使用数据失败: {}", e))),
    }
}

#[tauri::command]
pub async fn clear_usage_data(storage: StorageState<'_>) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    match storage.clear_usage_data() {
        Ok(_) => Ok(ApiResponse::success(true)),
        Err(e) => Ok(ApiResponse::error(format!("清除使用数据失败: {}", e))),
    }
}

#[tauri::command]
pub async fn export_data(storage: StorageState<'_>) -> Result<ApiResponse<String>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.load_tasks() {
        Ok(tasks) => match serde_json::to_string_pretty(&tasks) {
            Ok(json_data) => Ok(ApiResponse::success(json_data)),
            Err(e) => Ok(ApiResponse::error(format!("导出数据失败: {}", e))),
        },
        Err(e) => Ok(ApiResponse::error(format!("加载待办失败: {}", e))),
    }
}

#[tauri::command]
pub async fn import_data(
    json_data: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match serde_json::from_str::<Vec<Task>>(&json_data) {
        Ok(tasks) => match storage.save_tasks(&tasks) {
            Ok(_) => Ok(ApiResponse::success(true)),
            Err(e) => Ok(ApiResponse::error(format!("导入数据失败: {}", e))),
        },
        Err(e) => Ok(ApiResponse::error(format!("解析数据失败: {}", e))),
    }
}

#[tauri::command]
pub async fn clear_all_data(storage: StorageState<'_>) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    // 1. 清空 tasks.json
    if let Err(e) = storage.save_tasks(&[]) {
        return Ok(ApiResponse::error(format!("清空待办失败: {}", e)));
    }
    println!("[Clear] tasks.json 已清空");

    // 2. 重置 settings.json 为默认值
    let default_settings = crate::models::Settings::default();
    if let Err(e) = storage.save_settings(&default_settings) {
        return Ok(ApiResponse::error(format!("重置设置失败: {}", e)));
    }
    println!("[Clear] settings.json 已重置");

    if let Err(e) = storage.clear_usage_data() {
        return Ok(ApiResponse::error(format!("清空使用数据失败: {}", e)));
    }
    println!("[Clear] usage.json 已清空");

    // 3. 删除 attachments 目录
    let attachments_dir = storage.get_attachments_dir();
    if attachments_dir.exists() {
        match std::fs::remove_dir_all(&attachments_dir) {
            Ok(_) => println!("[Clear] attachments 目录已删除"),
            Err(e) => println!("[Clear] 删除 attachments 目录失败: {}", e),
        }
        // 重新创建空的 attachments 目录
        if let Err(e) = storage.ensure_attachments_dir() {
            println!("[Clear] 重建 attachments 目录失败: {}", e);
        }
    }
    println!("[Clear] 所有数据已清除");

    Ok(ApiResponse::success(true))
}

#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub async fn get_data_dir_path(storage: StorageState<'_>) -> Result<ApiResponse<String>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    let path = storage.get_data_dir_path();
    Ok(ApiResponse::success(path))
}

#[tauri::command]
pub async fn open_file_with_system(
    file_name: String,
    file_data: String,
    _file_type: String,
) -> Result<ApiResponse<bool>, String> {
    use base64::{engine::general_purpose, Engine as _};
    use std::fs;

    // 创建临时文件
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(&file_name);

    // 解码 base64 数据
    match general_purpose::STANDARD.decode(&file_data) {
        Ok(decoded_data) => {
            // 写入临时文件
            match fs::write(&file_path, decoded_data) {
                Ok(_) => {
                    // 使用系统默认应用打开文件
                    #[cfg(target_os = "windows")]
                    {
                        match std::process::Command::new("cmd")
                            .args(&["/C", "start", "", file_path.to_str().unwrap()])
                            .spawn()
                        {
                            Ok(_) => Ok(ApiResponse::success(true)),
                            Err(e) => Ok(ApiResponse::error(format!("打开文件失败: {}", e))),
                        }
                    }

                    #[cfg(target_os = "macos")]
                    {
                        match std::process::Command::new("open").arg(&file_path).spawn() {
                            Ok(_) => Ok(ApiResponse::success(true)),
                            Err(e) => Ok(ApiResponse::error(format!("打开文件失败: {}", e))),
                        }
                    }

                    #[cfg(target_os = "linux")]
                    {
                        match std::process::Command::new("xdg-open")
                            .arg(&file_path)
                            .spawn()
                        {
                            Ok(_) => Ok(ApiResponse::success(true)),
                            Err(e) => Ok(ApiResponse::error(format!("打开文件失败: {}", e))),
                        }
                    }
                }
                Err(e) => Ok(ApiResponse::error(format!("写入临时文件失败: {}", e))),
            }
        }
        Err(e) => Ok(ApiResponse::error(format!("解码文件数据失败: {}", e))),
    }
}

#[tauri::command]
pub async fn open_file_by_path(file_path: String) -> Result<ApiResponse<bool>, String> {
    use std::path::Path;

    let path = Path::new(&file_path);
    if !path.exists() {
        return Ok(ApiResponse::error(format!("文件不存在: {}", file_path)));
    }

    // 使用系统默认应用打开文件
    #[cfg(target_os = "windows")]
    {
        match std::process::Command::new("cmd")
            .args(&["/C", "start", "", &file_path])
            .spawn()
        {
            Ok(_) => Ok(ApiResponse::success(true)),
            Err(e) => Ok(ApiResponse::error(format!("打开文件失败: {}", e))),
        }
    }

    #[cfg(target_os = "macos")]
    {
        match std::process::Command::new("open").arg(&file_path).spawn() {
            Ok(_) => Ok(ApiResponse::success(true)),
            Err(e) => Ok(ApiResponse::error(format!("打开文件失败: {}", e))),
        }
    }

    #[cfg(target_os = "linux")]
    {
        match std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
        {
            Ok(_) => Ok(ApiResponse::success(true)),
            Err(e) => Ok(ApiResponse::error(format!("打开文件失败: {}", e))),
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok(ApiResponse::error("不支持的平台".to_string()))
    }
}

#[tauri::command]
pub async fn open_folder_in_explorer(folder_path: String) -> Result<ApiResponse<bool>, String> {
    use std::path::Path;

    println!(
        "[Rust] open_folder_in_explorer 被调用，folder_path: {}",
        folder_path
    );

    // 规范化路径：统一使用正斜杠
    let normalized_path = folder_path.replace('\\', "/");
    let path = Path::new(&normalized_path);
    println!("[Rust] normalized path: {}", normalized_path);
    println!("[Rust] path exists: {}", path.exists());
    println!("[Rust] path is_dir: {}", path.is_dir());

    // 确保目录存在
    if !path.exists() {
        // 尝试创建目录
        println!("[Rust] 目录不存在，尝试创建...");
        match std::fs::create_dir_all(path) {
            Ok(_) => println!("[Rust] 目录创建成功"),
            Err(e) => {
                println!("[Rust] 目录创建失败: {}", e);
                return Ok(ApiResponse::error(format!("目录不存在且创建失败: {}", e)));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // 使用 explorer.exe 打开文件夹
        // Windows 需要反斜杠路径
        let target_for_explorer = normalized_path.replace('/', "\\");
        let target = if path.is_dir() {
            println!("[Rust] 打开目录: {}", target_for_explorer);
            target_for_explorer.clone()
        } else {
            println!("[Rust] 路径不是目录，获取父目录");
            path.parent()
                .map(|p| p.to_string_lossy().replace('/', "\\"))
                .unwrap_or(target_for_explorer.clone())
        };

        println!("[Rust] explorer.exe target path: {}", target);

        match std::process::Command::new("explorer.exe")
            .arg(&target)
            .spawn()
        {
            Ok(_) => {
                println!("[Rust] explorer.exe 启动成功");
                Ok(ApiResponse::success(true))
            }
            Err(e) => {
                println!("[Rust] explorer.exe 启动失败: {}", e);
                Ok(ApiResponse::error(format!("打开文件夹失败: {}", e)))
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        match std::process::Command::new("open").arg(&folder_path).spawn() {
            Ok(_) => Ok(ApiResponse::success(true)),
            Err(e) => Ok(ApiResponse::error(format!("打开文件夹失败: {}", e))),
        }
    }

    #[cfg(target_os = "linux")]
    {
        match std::process::Command::new("xdg-open")
            .arg(&folder_path)
            .spawn()
        {
            Ok(_) => Ok(ApiResponse::success(true)),
            Err(e) => Ok(ApiResponse::error(format!("打开文件夹失败: {}", e))),
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Ok(ApiResponse::error("不支持的平台".to_string()))
    }
}

fn move_data_file(
    old_dir: &std::path::Path,
    new_dir: &std::path::Path,
    file_name: &str,
) -> Result<(), String> {
    let old_file = old_dir.join(file_name);
    if !old_file.exists() {
        return Ok(());
    }

    let new_file = new_dir.join(file_name);
    if let Err(rename_error) = std::fs::rename(&old_file, &new_file) {
        if let Err(copy_error) = std::fs::copy(&old_file, &new_file) {
            return Err(format!(
                "移动 {file_name} 失败: {rename_error} / {copy_error}"
            ));
        }
        let _ = std::fs::remove_file(&old_file);
    }
    println!("[Storage] {file_name} moved");
    Ok(())
}

fn migrate_core_data_files(
    old_dir: &std::path::Path,
    new_dir: &std::path::Path,
) -> Result<(), String> {
    for file_name in ["tasks.json", "settings.json", "usage.json"] {
        move_data_file(old_dir, new_dir, file_name)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn migrate_data_dir(
    new_path: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    println!("[Storage] migrate_data_dir called, new_path: {}", new_path);

    let mut storage = storage.lock().map_err(|e| e.to_string())?;
    let old_path = storage.get_data_dir_path();
    println!("[Storage] old_path: {}", old_path);

    let new_path_buf = std::path::PathBuf::from(&new_path);

    // 创建新目录
    if let Err(e) = std::fs::create_dir_all(&new_path_buf) {
        return Ok(ApiResponse::error(format!("创建新目录失败: {}", e)));
    }

    // 移动核心数据文件（跨盘符时 rename 可能失败，用 copy+delete 兜底）
    if let Err(error) = migrate_core_data_files(std::path::Path::new(&old_path), &new_path_buf) {
        return Ok(ApiResponse::error(error));
    }

    // 更新新目录 settings 中的 data_dir
    let new_settings = new_path_buf.join("settings.json");
    if new_settings.exists() {
        // 更新新目录 settings 中的 data_dir
        if let Ok(settings_content) = std::fs::read_to_string(&new_settings) {
            if let Ok(mut settings) =
                serde_json::from_str::<crate::models::Settings>(&settings_content)
            {
                settings.data_dir = Some(new_path.clone());
                if let Ok(new_settings_content) = serde_json::to_string_pretty(&settings) {
                    if let Err(e) = std::fs::write(&new_settings, &new_settings_content) {
                        println!("[Storage] 更新 settings data_dir 失败: {}", e);
                    } else {
                        println!("[Storage] settings data_dir 已更新为: {}", new_path);
                    }
                }
            }
        }
    }

    // 移动 attachments 目录
    let old_attachments = std::path::Path::new(&old_path).join("attachments");
    if old_attachments.exists() {
        let new_attachments = new_path_buf.join("attachments");
        // 跨盘符时 rename 可能失败，用 copy+delete 兜底
        if let Err(e) = std::fs::rename(&old_attachments, &new_attachments) {
            if let Err(e2) = copy_dir_recursive(&old_attachments, &new_attachments) {
                return Ok(ApiResponse::error(format!(
                    "移动 attachments 目录失败: {} / {}",
                    e, e2
                )));
            }
            let _ = std::fs::remove_dir_all(&old_attachments);
        }
        println!("[Storage] attachments moved");
    }

    // 删除旧数据目录（如果为空）
    let old_dir = std::path::Path::new(&old_path);
    if old_dir.exists() {
        let _ = std::fs::remove_dir_all(old_dir);
        println!("[Storage] 旧数据目录已删除: {}", old_path);
    }

    // 更新 storage 的数据目录
    if let Err(e) = storage.set_data_dir(new_path_buf) {
        return Ok(ApiResponse::error(format!("更新数据目录失败: {}", e)));
    }

    if let Err(e) = storage.sync_bootstrap_settings() {
        return Ok(ApiResponse::error(format!("同步启动配置失败: {}", e)));
    }

    println!("[Storage] migrate_data_dir completed successfully");
    Ok(ApiResponse::success(true))
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_autostart_enabled(app: tauri::AppHandle) -> Result<ApiResponse<bool>, String> {
    println!("[Autostart] get_autostart_enabled called");
    let autostart_manager = app.autolaunch();
    match autostart_manager.is_enabled() {
        Ok(enabled) => {
            println!("[Autostart] is_enabled = {}", enabled);
            Ok(ApiResponse::success(enabled))
        }
        Err(e) => {
            println!("[Autostart] is_enabled error: {}", e);
            Ok(ApiResponse::error(format!("获取自启动状态失败: {}", e)))
        }
    }
}

#[tauri::command]
pub async fn set_autostart_enabled(
    app: tauri::AppHandle,
    enabled: bool,
) -> Result<ApiResponse<bool>, String> {
    println!(
        "[Autostart] set_autostart_enabled called with enabled = {}",
        enabled
    );
    let autostart_manager = app.autolaunch();
    let result = if enabled {
        println!("[Autostart] calling enable()");
        autostart_manager.enable()
    } else {
        println!("[Autostart] calling disable()");
        autostart_manager.disable()
    };
    match result {
        Ok(_) => {
            println!("[Autostart] success!");
            Ok(ApiResponse::success(enabled))
        }
        Err(e) => {
            println!("[Autostart] error: {}", e);
            Ok(ApiResponse::error(format!("设置自启动状态失败: {}", e)))
        }
    }
}

#[tauri::command]
pub async fn save_attachment(
    task_id: String,
    attachment_id: String,
    file_name: String,
    file_data: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<String>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.save_attachment(&task_id, &attachment_id, &file_name, &file_data) {
        Ok(relative_path) => Ok(ApiResponse::success(relative_path)),
        Err(e) => Ok(ApiResponse::error(format!("保存附件失败: {}", e))),
    }
}

#[tauri::command]
pub async fn get_attachment_path(
    relative_path: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<String>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.get_attachment_path(&relative_path) {
        Ok(full_path) => Ok(ApiResponse::success(
            full_path.to_string_lossy().to_string(),
        )),
        Err(e) => Ok(ApiResponse::error(format!("获取附件路径失败: {}", e))),
    }
}

#[tauri::command]
pub async fn get_attachment_as_base64(
    relative_path: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<String>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.get_attachment_as_base64(&relative_path) {
        Ok(base64_data) => Ok(ApiResponse::success(base64_data)),
        Err(e) => Ok(ApiResponse::error(format!("读取附件失败: {}", e))),
    }
}

#[tauri::command]
pub async fn delete_attachment(
    relative_path: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.delete_attachment(&relative_path) {
        Ok(_) => Ok(ApiResponse::success(true)),
        Err(e) => Ok(ApiResponse::error(format!("删除附件失败: {}", e))),
    }
}

#[tauri::command]
pub async fn delete_task_attachments(
    task_id: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.delete_task_attachments(&task_id) {
        Ok(_) => Ok(ApiResponse::success(true)),
        Err(e) => Ok(ApiResponse::error(format!("删除任务附件失败: {}", e))),
    }
}

#[tauri::command]
pub async fn set_data_dir(
    path: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    let mut storage = storage.lock().map_err(|e| e.to_string())?;

    match storage.set_data_dir(std::path::PathBuf::from(path)) {
        Ok(_) => Ok(ApiResponse::success(true)),
        Err(e) => Ok(ApiResponse::error(format!("设置数据目录失败: {}", e))),
    }
}

#[cfg(test)]
mod tests {
    use super::{migrate_core_data_files, TopmostState};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn data_directory_migration_moves_usage_with_tasks_and_settings() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be valid")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("semidone-migration-{unique}"));
        let old_dir = root.join("old");
        let new_dir = root.join("new");
        fs::create_dir_all(&old_dir).expect("old test directory should be created");
        fs::create_dir_all(&new_dir).expect("new test directory should be created");

        for file_name in ["tasks.json", "settings.json", "usage.json"] {
            fs::write(old_dir.join(file_name), format!("{file_name} content"))
                .expect("test data should be written");
        }

        migrate_core_data_files(&old_dir, &new_dir).expect("core data migration should succeed");

        for file_name in ["tasks.json", "settings.json", "usage.json"] {
            assert!(
                new_dir.join(file_name).exists(),
                "{file_name} should be migrated"
            );
            assert!(
                !old_dir.join(file_name).exists(),
                "old {file_name} should be removed"
            );
        }

        fs::remove_dir_all(root).expect("test directory should be cleaned up");
    }

    #[test]
    fn topmost_state_tracks_runtime_pin_changes() {
        let state = TopmostState::new(false);

        assert!(!state.is_enabled());
        state.set(true);
        assert!(state.is_enabled());
        state.set(false);
        assert!(!state.is_enabled());
    }

    #[test]
    fn watchdog_rechecks_pin_state_after_waiting_for_a_transition() {
        use std::sync::Arc;

        let state = Arc::new(TopmostState::new(true));
        let transition = state
            .lock_transition()
            .expect("transition lock should be available");
        let watchdog_state = Arc::clone(&state);
        let watchdog = std::thread::spawn(move || {
            let _transition = watchdog_state
                .lock_transition()
                .expect("watchdog should acquire transition lock");
            watchdog_state.is_enabled()
        });

        state.set_unlocked(false);
        drop(transition);

        assert!(!watchdog.join().expect("watchdog thread should finish"));
    }
}
