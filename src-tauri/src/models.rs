use chrono::Utc;
use serde::{Deserialize, Serialize};

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
    pub days_of_week: Option<Vec<u32>>, // 周几重复 (0=周日, 1=周一...6=周六)
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
    #[serde(
        rename = "completedAt",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub completed_at: Option<String>,
    #[serde(rename = "isPinned", default)]
    pub is_pinned: bool,
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
            completed_at: None,
            is_pinned: false,
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
#[serde(default)]
pub struct LiquidGlassSettings {
    pub enabled: bool,
    pub blur: u8,
    pub refraction: u8,
    pub dispersion: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strength: Option<f64>,
    #[serde(rename = "rimWidth", default, skip_serializing_if = "Option::is_none")]
    pub rim_width: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub magnify: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preset: Option<String>,
}

impl Default for LiquidGlassSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            blur: 9,
            refraction: 0,
            dispersion: false,
            strength: Some(0.0),
            rim_width: Some(0.1),
            magnify: Some(0.0),
            preset: Some("standard".to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ZenModeSettings {
    pub enabled: bool,
    pub active: bool,
    pub font_size: u8,
    pub text_color: String,
    pub row_color: String,
    pub background_color: String,
    pub background_opacity: u8,
    pub row_opacity: u8,
}

impl Default for ZenModeSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            active: false,
            font_size: 15,
            text_color: "#f1f5f9".to_string(),
            row_color: "#ffffff".to_string(),
            background_color: "#0f172a".to_string(),
            background_opacity: 65,
            row_opacity: 8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    #[serde(rename = "fontScale", default = "default_font_scale")]
    pub font_scale: u16,
    #[serde(rename = "animationsEnabled", default = "default_animations_enabled")]
    pub animations_enabled: bool,
    #[serde(rename = "liquidGlass", default)]
    pub liquid_glass: LiquidGlassSettings,
    #[serde(rename = "zenMode", alias = "minimalMode", default)]
    pub zen_mode: ZenModeSettings,
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
    #[serde(rename = "closeToTray", default = "default_close_to_tray")]
    pub close_to_tray: bool,
    #[serde(rename = "dataDir", skip_serializing_if = "Option::is_none")]
    pub data_dir: Option<String>,
}

fn default_collapse_mode() -> String {
    "expanded".to_string()
}

fn default_font_scale() -> u16 {
    100
}
fn default_animations_enabled() -> bool {
    true
}

fn default_close_to_tray() -> bool {
    true
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
            font_scale: default_font_scale(),
            animations_enabled: true,
            liquid_glass: LiquidGlassSettings::default(),
            zen_mode: ZenModeSettings::default(),
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
            close_to_tray: true,
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
    #[serde(rename = "isPinned")]
    pub is_pinned: Option<bool>,
    pub priority: Option<String>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "clearDueDate", default)]
    pub clear_due_date: bool,
    pub attachments: Option<Vec<Attachment>>,
    #[serde(default, rename = "recurrence")]
    pub recurrence: Option<Option<RecurrenceRule>>,
    #[serde(rename = "clearRecurrence", default)]
    pub clear_recurrence: bool,
    #[serde(rename = "isRecurrenceChild")]
    pub is_recurrence_child: Option<bool>,
    #[serde(rename = "parentTaskId", skip_serializing_if = "Option::is_none")]
    pub parent_task_id: Option<String>,
    #[serde(rename = "recurrenceChildCreated")]
    pub recurrence_child_created: Option<bool>,
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

#[cfg(test)]
mod interface_settings_tests {
    use super::*;

    #[test]
    fn glass_preset_identity_survives_native_settings_round_trip() {
        assert_eq!(LiquidGlassSettings::default().preset.as_deref(), Some("standard"));
        let value = serde_json::json!({
            "enabled": true, "preset": "extreme", "blur": 4, "refraction": 0,
            "dispersion": true, "strength": 0.0, "rimWidth": 0.5, "magnify": 0.07
        });
        let loaded: LiquidGlassSettings = serde_json::from_value(value.clone()).unwrap();
        assert_eq!(serde_json::to_value(loaded).unwrap(), value);
    }

    #[test]
    fn glass_optical_parameters_survive_native_round_trip_and_legacy_values_remain_migratable() {
        let old: LiquidGlassSettings = serde_json::from_value(serde_json::json!({
            "enabled": true, "blur": 6, "refraction": 84, "dispersion": true
        })).unwrap();
        assert!(old.strength.is_none());
        let legacy = serde_json::to_value(old).unwrap();
        assert!(legacy.get("strength").is_none());
        assert_eq!(legacy["refraction"], 84);
        let value = serde_json::json!({
            "enabled": true, "blur": 6, "refraction": 42, "dispersion": true,
            "strength": 32.5, "rimWidth": 0.73, "magnify": 0.62
        });
        let loaded: LiquidGlassSettings = serde_json::from_value(value.clone()).unwrap();
        assert_eq!(serde_json::to_value(loaded).unwrap(), value);
    }

    #[test]
    fn old_settings_default_to_normal_text_and_enabled_motion() {
        let mut value = serde_json::to_value(Settings::default()).unwrap();
        value.as_object_mut().unwrap().remove("fontScale");
        value.as_object_mut().unwrap().remove("animationsEnabled");
        let settings: Settings = serde_json::from_value(value).unwrap();
        assert_eq!(settings.font_scale, 100);
        assert!(settings.animations_enabled);
    }

    #[test]
    fn interface_preferences_survive_the_native_settings_round_trip() {
        let settings = Settings {
            font_scale: 130,
            animations_enabled: false,
            ..Settings::default()
        };
        let saved = serde_json::to_value(settings).unwrap();
        assert_eq!(saved["fontScale"], 130);
        assert_eq!(saved["animationsEnabled"], false);
        let loaded: Settings = serde_json::from_value(saved).unwrap();
        assert_eq!(loaded.font_scale, 130);
        assert!(!loaded.animations_enabled);
    }
}

#[cfg(test)]
mod zen_mode_tests {
    use super::*;

    #[test]
    fn legacy_settings_load_without_enabling_zen_mode() {
        let mut legacy = serde_json::to_value(Settings::default()).unwrap();
        legacy.as_object_mut().unwrap().remove("zenMode");
        let settings: Settings = serde_json::from_value(legacy).unwrap();
        assert!(!settings.zen_mode.enabled);
        assert_eq!(settings.zen_mode.background_opacity, 65);
    }

    #[test]
    fn zen_mode_colors_and_transparency_survive_round_trip() {
        let mut value = serde_json::to_value(Settings::default()).unwrap();
        value["zenMode"] = serde_json::json!({
            "enabled": true, "active": true, "fontSize": 24, "textColor": "#aabbcc", "rowColor": "#112233",
            "backgroundColor": "#224466", "backgroundOpacity": 0, "rowOpacity": 100,
        });
        let settings: Settings = serde_json::from_value(value.clone()).unwrap();
        let saved = serde_json::to_value(settings).unwrap();
        assert_eq!(saved["zenMode"], value["zenMode"]);
    }

    #[test]
    fn previous_settings_name_migrates_to_zen_without_losing_colors() {
        let mut value = serde_json::to_value(Settings::default()).unwrap();
        value.as_object_mut().unwrap().remove("zenMode");
        value["minimalMode"] = serde_json::json!({ "enabled": true, "textColor": "#abcdef" });
        let settings: Settings = serde_json::from_value(value).unwrap();
        assert_eq!(settings.zen_mode.text_color, "#abcdef");
        assert_eq!(settings.zen_mode.font_size, 15);
        assert!(!settings.zen_mode.active);
        let saved = serde_json::to_value(settings).unwrap();
        assert!(saved.get("minimalMode").is_none());
        assert!(saved["zenMode"]["enabled"].as_bool().unwrap());
    }
}
