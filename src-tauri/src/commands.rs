use tauri::State;
use std::sync::Mutex;
use crate::models::*;
use crate::storage::Storage;
use tauri_plugin_autostart::ManagerExt;

type StorageState<'a> = State<'a, Mutex<Storage>>;

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
    
    let priority = request.priority
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
pub async fn get_settings(storage: StorageState<'_>) -> Result<ApiResponse<Settings>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    
    match storage.load_settings() {
        Ok(settings) => Ok(ApiResponse::success(settings)),
        Err(e) => Ok(ApiResponse::error(format!("加载设置失败: {}", e))),
    }
}

#[tauri::command]
pub async fn update_settings(
    settings: Settings,
    storage: StorageState<'_>,
) -> Result<ApiResponse<Settings>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    
    match storage.save_settings(&settings) {
        Ok(_) => Ok(ApiResponse::success(settings)),
        Err(e) => Ok(ApiResponse::error(format!("保存设置失败: {}", e))),
    }
}

#[tauri::command]
pub async fn export_data(storage: StorageState<'_>) -> Result<ApiResponse<String>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    
    match storage.load_tasks() {
        Ok(tasks) => {
            match serde_json::to_string_pretty(&tasks) {
                Ok(json_data) => Ok(ApiResponse::success(json_data)),
                Err(e) => Ok(ApiResponse::error(format!("导出数据失败: {}", e))),
            }
        }
        Err(e) => Ok(ApiResponse::error(format!("加载待办失败: {}", e))),
    }
}

#[tauri::command]
pub async fn import_data(
    data: String,
    storage: StorageState<'_>,
) -> Result<ApiResponse<bool>, String> {
    let storage = storage.lock().map_err(|e| e.to_string())?;
    
    match serde_json::from_str::<Vec<Task>>(&data) {
        Ok(tasks) => {
            match storage.save_tasks(&tasks) {
                Ok(_) => Ok(ApiResponse::success(true)),
                Err(e) => Ok(ApiResponse::error(format!("导入数据失败: {}", e))),
            }
        }
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
pub async fn open_file_with_system(file_name: String, file_data: String, _file_type: String) -> Result<ApiResponse<bool>, String> {
    use std::fs;
    use base64::{Engine as _, engine::general_purpose};

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
                        match std::process::Command::new("open")
                            .arg(&file_path)
                            .spawn()
                        {
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
        match std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
        {
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

    println!("[Rust] open_folder_in_explorer 被调用，folder_path: {}", folder_path);

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
            },
            Err(e) => {
                println!("[Rust] explorer.exe 启动失败: {}", e);
                Ok(ApiResponse::error(format!("打开文件夹失败: {}", e)))
            },
        }
    }

    #[cfg(target_os = "macos")]
    {
        match std::process::Command::new("open")
            .arg(&folder_path)
            .spawn()
        {
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

    // 移动 tasks.json（跨盘符时 rename 可能失败，用 copy+delete 兜底）
    let old_tasks = std::path::Path::new(&old_path).join("tasks.json");
    if old_tasks.exists() {
        let new_tasks = new_path_buf.join("tasks.json");
        if let Err(e) = std::fs::rename(&old_tasks, &new_tasks) {
            if let Err(e2) = std::fs::copy(&old_tasks, &new_tasks) {
                return Ok(ApiResponse::error(format!("移动 tasks.json 失败: {} / {}", e, e2)));
            }
            let _ = std::fs::remove_file(&old_tasks);
        }
        println!("[Storage] tasks.json moved");
    }

    // 移动 settings.json 并更新 data_dir（跨盘符时 rename 可能失败，用 copy+delete 兜底）
    let old_settings = std::path::Path::new(&old_path).join("settings.json");
    if old_settings.exists() {
        let new_settings = new_path_buf.join("settings.json");
        if let Err(e) = std::fs::rename(&old_settings, &new_settings) {
            if let Err(e2) = std::fs::copy(&old_settings, &new_settings) {
                return Ok(ApiResponse::error(format!("移动 settings.json 失败: {} / {}", e, e2)));
            }
            let _ = std::fs::remove_file(&old_settings);
        }
        println!("[Storage] settings.json moved");

        // 更新新目录 settings 中的 data_dir
        if let Ok(settings_content) = std::fs::read_to_string(&new_settings) {
            if let Ok(mut settings) = serde_json::from_str::<crate::models::Settings>(&settings_content) {
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
                return Ok(ApiResponse::error(format!("移动 attachments 目录失败: {} / {}", e, e2)));
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
        },
        Err(e) => {
            println!("[Autostart] is_enabled error: {}", e);
            Ok(ApiResponse::error(format!("获取自启动状态失败: {}", e)))
        }
    }
}

#[tauri::command]
pub async fn set_autostart_enabled(app: tauri::AppHandle, enabled: bool) -> Result<ApiResponse<bool>, String> {
    println!("[Autostart] set_autostart_enabled called with enabled = {}", enabled);
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
        },
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
        Ok(full_path) => Ok(ApiResponse::success(full_path.to_string_lossy().to_string())),
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