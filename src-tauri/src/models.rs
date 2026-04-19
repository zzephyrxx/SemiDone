use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    High,
    Medium,
    Low,
}

#[allow(dead_code)]
impl Priority {
    pub fn to_string(&self) -> String {
        match self {
            Priority::High => "high".to_string(),
            Priority::Medium => "medium".to_string(),
            Priority::Low => "low".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            "high" => Priority::High,
            "medium" => Priority::Medium,
            "low" => Priority::Low,
            _ => Priority::Medium,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecurrenceType {
    Day,
    Week,
    Month,
}

#[allow(dead_code)]
impl RecurrenceType {
    pub fn to_string(&self) -> String {
        match self {
            RecurrenceType::Day => "day".to_string(),
            RecurrenceType::Week => "week".to_string(),
            RecurrenceType::Month => "month".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            "day" => RecurrenceType::Day,
            "week" => RecurrenceType::Week,
            "month" => RecurrenceType::Month,
            _ => RecurrenceType::Day,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecurrenceRule {
    #[serde(rename = "type")]
    pub recurrence_type: RecurrenceType,
    pub interval: u32,
    #[serde(rename = "daysOfWeek", skip_serializing_if = "Option::is_none")]
    pub days_of_week: Option<Vec<u32>>,  // 周几重复 (0=周日, 1=周一...6=周六)
    #[serde(rename = "daysOfMonth", skip_serializing_if = "Option::is_none")]
    pub days_of_month: Option<Vec<u32>>, // 每月几天 (1-31)，支持多选
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Pink,
}

#[allow(dead_code)]
impl Theme {
    pub fn to_string(&self) -> String {
        match self {
            Theme::Light => "light".to_string(),
            Theme::Pink => "pink".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            "light" => Theme::Light,
            "pink" => Theme::Pink,
            _ => Theme::Light,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub priority: Priority,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<Attachment>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recurrence: Option<RecurrenceRule>,
    #[serde(rename = "isRecurrenceChild", default)]
    pub is_recurrence_child: bool,
    #[serde(rename = "parentTaskId", skip_serializing_if = "Option::is_none")]
    pub parent_task_id: Option<String>,
    #[serde(rename = "recurrenceChildCreated", default)]
    pub recurrence_child_created: bool,
}

impl Task {
    pub fn new(
        title: String,
        description: Option<String>,
        priority: Option<Priority>,
        due_date: Option<String>,
        attachments: Option<Vec<Attachment>>,
        recurrence: Option<RecurrenceRule>,
        is_recurrence_child: bool,
        parent_task_id: Option<String>,
    ) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            description,
            completed: false,
            priority: priority.unwrap_or(Priority::Medium),
            due_date,
            created_at: now.clone(),
            updated_at: now,
            attachments,
            recurrence,
            is_recurrence_child,
            parent_task_id,
            recurrence_child_created: false,
        }
    }

    pub fn update(&mut self) {
        self.updated_at = Utc::now().to_rfc3339();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub notifications: bool,
    #[serde(rename = "autoSave")]
    pub auto_save: bool,
    #[serde(rename = "isPinned")]
    pub is_pinned: bool,
    #[serde(rename = "isCollapsed")]
    pub is_collapsed: bool,
    #[serde(rename = "collapseMode", default = "default_collapse_mode")]
    pub collapse_mode: String,
    #[serde(rename = "useCapsuleMode", default)]
    pub use_capsule_mode: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar: Option<String>,
    #[serde(rename = "transparentEnabled", default)]
    pub transparent_enabled: bool,
    #[serde(rename = "transparentLevel", default = "default_transparent_level")]
    pub transparent_level: u8,
    #[serde(rename = "isEdgeSnapped", default)]
    pub is_edge_snapped: bool,
    #[serde(rename = "edgePosition", default = "default_edge_position")]
    pub edge_position: String,
    #[serde(rename = "autoStart", default)]
    pub auto_start: bool,
    #[serde(rename = "dataDir", skip_serializing_if = "Option::is_none")]
    pub data_dir: Option<String>,
}

fn default_collapse_mode() -> String {
    "expanded".to_string()
}

fn default_transparent_level() -> u8 {
    100
}

fn default_edge_position() -> String {
    "right".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            notifications: true,
            auto_save: true,
            is_pinned: false,
            is_collapsed: false,
            collapse_mode: default_collapse_mode(),
            use_capsule_mode: false,
            username: None,
            avatar: None,
            transparent_enabled: false,
            transparent_level: default_transparent_level(),
            is_edge_snapped: false,
            edge_position: default_edge_position(),
            auto_start: false,
            data_dir: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    pub attachments: Option<Vec<Attachment>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recurrence: Option<RecurrenceRule>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub completed: Option<bool>,
    pub priority: Option<String>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    pub attachments: Option<Vec<Attachment>>,
    #[serde(default, rename = "recurrence")]
    pub recurrence: Option<Option<RecurrenceRule>>,
    #[serde(rename = "clearRecurrence", default)]
    pub clear_recurrence: bool,
    #[serde(rename = "isRecurrenceChild", default)]
    pub is_recurrence_child: bool,
    #[serde(rename = "parentTaskId", skip_serializing_if = "Option::is_none")]
    pub parent_task_id: Option<String>,
    #[serde(rename = "recurrenceChildCreated", default)]
    pub recurrence_child_created: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskStats {
    pub total: usize,
    pub completed: usize,
    pub pending: usize,
    pub overdue: usize,
    pub today: usize,
    #[serde(rename = "highPriority")]
    pub high_priority: usize,
    #[serde(rename = "mediumPriority")]
    pub medium_priority: usize,
    #[serde(rename = "lowPriority")]
    pub low_priority: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}