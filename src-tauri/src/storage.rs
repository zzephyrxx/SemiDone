use std::fs;
use std::path::PathBuf;
use serde_json;
use chrono::{Local, NaiveDate};
use crate::models::{Task, Settings, TaskStats, Priority};

pub struct Storage {
    data_dir: PathBuf,
}

impl Storage {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // 首先尝试从 settings.json 读取 data_dir
        let default_dir = Self::get_default_data_dir()?;
        let settings_path = default_dir.join("settings.json");

        let data_dir = if settings_path.exists() {
            if let Ok(content) = fs::read_to_string(&settings_path) {
                if let Ok(settings) = serde_json::from_str::<Settings>(&content) {
                    if let Some(data_dir) = settings.data_dir {
                        println!("[Storage] 从 settings 读取 data_dir: {}", data_dir);
                        PathBuf::from(data_dir)
                    } else {
                        default_dir
                    }
                } else {
                    default_dir
                }
            } else {
                default_dir
            }
        } else {
            default_dir
        };

        println!("[Storage] 最终使用 data_dir: {}", data_dir.display());

        // 确保数据目录存在
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir)?;
        }

        Ok(Self { data_dir })
    }

    fn get_default_data_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
        // 使用 APPDATA 路径（用户配置目录）
        let app_data = dirs::data_dir()
            .ok_or("无法获取 APPDATA 目录")?;

        Ok(app_data.join("SemiDone").join("SemiDoneData"))
    }

    fn get_bootstrap_settings_file() -> Result<PathBuf, Box<dyn std::error::Error>> {
        Ok(Self::get_default_data_dir()?.join("settings.json"))
    }

    pub fn get_data_dir_path(&self) -> String {
        self.data_dir.to_string_lossy().to_string()
    }

    pub fn set_data_dir(&mut self, path: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        if !path.exists() {
            fs::create_dir_all(&path)?;
        }
        self.data_dir = path;
        // 确保附件目录也存在
        self.ensure_attachments_dir()?;
        Ok(())
    }

    fn get_tasks_file(&self) -> PathBuf {
        self.data_dir.join("tasks.json")
    }

    pub fn get_settings_file(&self) -> PathBuf {
        self.data_dir.join("settings.json")
    }

    pub fn get_attachments_dir(&self) -> PathBuf {
        self.data_dir.join("attachments")
    }

    pub fn ensure_attachments_dir(&self) -> Result<(), Box<dyn std::error::Error>> {
        let attachments_dir = self.get_attachments_dir();
        if !attachments_dir.exists() {
            fs::create_dir_all(&attachments_dir)?;
        }
        Ok(())
    }

    // ==================== 附件存储方法 ====================

    pub fn save_attachment(
        &self,
        task_id: &str,
        attachment_id: &str,
        file_name: &str,
        file_data: &str, // Base64 encoded
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.ensure_attachments_dir()?;

        // 创建任务附件目录: {attachments}/{task_id}/
        let task_attachments_dir = self.get_attachments_dir().join(task_id);
        if !task_attachments_dir.exists() {
            fs::create_dir_all(&task_attachments_dir)?;
        }

        // 解码 Base64 数据
        use base64::{Engine as _, engine::general_purpose};
        let decoded_data = general_purpose::STANDARD.decode(file_data)?;

        // 确定文件扩展名
        let ext = std::path::Path::new(file_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin");
        let safe_file_name = format!("{}.{}", attachment_id, ext);
        let file_path = task_attachments_dir.join(&safe_file_name);

        // 写入文件
        fs::write(&file_path, decoded_data)?;

        // 返回相对于 attachments 目录的路径
        Ok(format!("{}/{}", task_id, safe_file_name))
    }

    pub fn get_attachment_path(&self, relative_path: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
        // 规范化路径分隔符：统一使用正斜杠
        let normalized_relative = relative_path.replace('\\', "/");
        let full_path = self.get_attachments_dir().join(&normalized_relative);
        if !full_path.exists() {
            return Err(format!("附件不存在: {}", relative_path).into());
        }
        // 返回时将路径转换为正斜杠格式，确保跨平台一致
        Ok(PathBuf::from(full_path.to_string_lossy().replace('\\', "/")))
    }

    pub fn get_attachment_as_base64(&self, relative_path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let full_path = self.get_attachments_dir().join(relative_path);
        if !full_path.exists() {
            return Err(format!("附件不存在: {}", relative_path).into());
        }
        let data = fs::read(&full_path)?;
        use base64::{Engine as _, engine::general_purpose};
        Ok(general_purpose::STANDARD.encode(&data))
    }

    pub fn delete_attachment(&self, relative_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let full_path = self.get_attachments_dir().join(relative_path);
        if full_path.exists() {
            fs::remove_file(&full_path)?;
        }
        Ok(())
    }

    pub fn delete_task_attachments(&self, task_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let task_attachments_dir = self.get_attachments_dir().join(task_id);
        if task_attachments_dir.exists() {
            fs::remove_dir_all(&task_attachments_dir)?;
        }
        Ok(())
    }

    // ==================== 任务存储方法 ====================

    pub fn load_tasks(&self) -> Result<Vec<Task>, Box<dyn std::error::Error>> {
        let file_path = self.get_tasks_file();

        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(file_path)?;
        let tasks: Vec<Task> = serde_json::from_str(&content)
            .unwrap_or_else(|_| Vec::new());

        Ok(tasks)
    }

    pub fn save_tasks(&self, tasks: &[Task]) -> Result<(), Box<dyn std::error::Error>> {
        let file_path = self.get_tasks_file();
        let content = serde_json::to_string_pretty(tasks)?;
        fs::write(file_path, content)?;
        Ok(())
    }

    pub fn load_settings(&self) -> Result<Settings, Box<dyn std::error::Error>> {
        let file_path = self.get_settings_file();

        if !file_path.exists() {
            let default_settings = Settings::default();
            self.save_settings(&default_settings)?;
            return Ok(default_settings);
        }

        let content = fs::read_to_string(file_path)?;
        let settings: Settings = serde_json::from_str(&content)
            .unwrap_or_else(|_| Settings::default());

        Ok(settings)
    }

    pub fn save_settings(&self, settings: &Settings) -> Result<(), Box<dyn std::error::Error>> {
        let file_path = self.get_settings_file();
        let content = serde_json::to_string_pretty(settings)?;
        fs::write(file_path, content)?;
        self.sync_bootstrap_settings()?;
        Ok(())
    }

    pub fn sync_bootstrap_settings(&self) -> Result<(), Box<dyn std::error::Error>> {
        let bootstrap_settings_file = Self::get_bootstrap_settings_file()?;

        if let Some(parent) = bootstrap_settings_file.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut bootstrap_settings = if bootstrap_settings_file.exists() {
            match fs::read_to_string(&bootstrap_settings_file) {
                Ok(content) => serde_json::from_str::<Settings>(&content).unwrap_or_else(|_| Settings::default()),
                Err(_) => Settings::default(),
            }
        } else {
            Settings::default()
        };

        bootstrap_settings.data_dir = Some(self.data_dir.to_string_lossy().replace('\\', "/"));

        let content = serde_json::to_string_pretty(&bootstrap_settings)?;
        fs::write(bootstrap_settings_file, content)?;
        Ok(())
    }

    pub fn get_task_stats(&self, tasks: &[Task]) -> TaskStats {
        let total = tasks.len();
        let completed = tasks.iter().filter(|t| t.completed).count();
        let pending = total - completed;

        let today = Local::now().date_naive();

        let overdue = tasks.iter()
            .filter(|t| {
                if t.completed || t.due_date.is_none() {
                    return false;
                }
                if let Ok(due) = NaiveDate::parse_from_str(&t.due_date.as_ref().unwrap(), "%Y-%m-%dT%H:%M:%S%.f") {
                    return due < today;
                }
                if let Ok(due) = NaiveDate::parse_from_str(&t.due_date.as_ref().unwrap()[..10], "%Y-%m-%d") {
                    return due < today;
                }
                false
            })
            .count();

        let today_count = tasks.iter()
            .filter(|t| {
                if t.completed || t.due_date.is_none() {
                    return false;
                }
                if let Ok(due) = NaiveDate::parse_from_str(&t.due_date.as_ref().unwrap(), "%Y-%m-%dT%H:%M:%S%.f") {
                    return due == today;
                }
                if let Ok(due) = NaiveDate::parse_from_str(&t.due_date.as_ref().unwrap()[..10], "%Y-%m-%d") {
                    return due == today;
                }
                false
            })
            .count();

        let high_priority = tasks.iter()
            .filter(|t| matches!(t.priority, Priority::High))
            .count();
        let medium_priority = tasks.iter()
            .filter(|t| matches!(t.priority, Priority::Medium))
            .count();
        let low_priority = tasks.iter()
            .filter(|t| matches!(t.priority, Priority::Low))
            .count();

        TaskStats {
            total,
            completed,
            pending,
            overdue,
            today: today_count,
            high_priority,
            medium_priority,
            low_priority,
        }
    }

    pub fn add_task(&self, mut task: Task) -> Result<Task, Box<dyn std::error::Error>> {
        let mut tasks = self.load_tasks()?;
        task.update();
        tasks.push(task.clone());
        self.save_tasks(&tasks)?;
        Ok(task)
    }

    pub fn update_task(&self, id: &str, updates: &crate::models::UpdateTaskRequest) -> Result<Option<Task>, Box<dyn std::error::Error>> {
        let mut tasks = self.load_tasks()?;

        if let Some(task) = tasks.iter_mut().find(|t| t.id == id) {
            if let Some(title) = &updates.title {
                task.title = title.clone();
            }
            if let Some(description) = &updates.description {
                task.description = Some(description.clone());
            }
            if let Some(completed) = updates.completed {
                task.completed = completed;
            }
            if let Some(priority_str) = &updates.priority {
                task.priority = Priority::from_string(priority_str);
            }
            if let Some(due_date) = &updates.due_date {
                task.due_date = Some(due_date.clone());
            }
            if let Some(attachments) = &updates.attachments {
                task.attachments = Some(attachments.clone());
            }
            if let Some(recurrence) = &updates.recurrence {
                task.recurrence = Some(recurrence.clone());
            }
            task.is_recurrence_child = updates.is_recurrence_child;
            if let Some(parent_id) = &updates.parent_task_id {
                task.parent_task_id = Some(parent_id.clone());
            }

            task.update();
            let updated_task = task.clone();
            self.save_tasks(&tasks)?;
            Ok(Some(updated_task))
        } else {
            Ok(None)
        }
    }

    pub fn delete_task(&self, id: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // 先删除该任务的所有附件
        let _ = self.delete_task_attachments(id);

        let mut tasks = self.load_tasks()?;
        let initial_len = tasks.len();
        tasks.retain(|t| t.id != id);

        if tasks.len() < initial_len {
            self.save_tasks(&tasks)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }
}