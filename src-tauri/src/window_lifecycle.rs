use std::sync::atomic::{AtomicBool, Ordering};

/// Cached only after settings have been saved. Native close events must not
/// wait for a storage lock or depend on a running WebView callback.
pub struct WindowLifecycle {
    close_to_tray: AtomicBool,
}

impl WindowLifecycle {
    pub fn new(close_to_tray: bool) -> Self {
        Self {
            close_to_tray: AtomicBool::new(close_to_tray),
        }
    }

    pub fn close_to_tray(&self) -> bool {
        self.close_to_tray.load(Ordering::Acquire)
    }

    pub fn set_close_to_tray(&self, enabled: bool) {
        self.close_to_tray.store(enabled, Ordering::Release);
    }
}

#[cfg(test)]
mod tests {
    use crate::models::Settings;

    #[test]
    fn old_settings_close_to_tray_unless_explicitly_disabled() {
        let mut old = serde_json::to_value(Settings::default()).unwrap();
        old.as_object_mut().unwrap().remove("closeToTray");
        let settings: Settings = serde_json::from_value(old.clone()).unwrap();
        assert!(settings.close_to_tray);
        old["closeToTray"] = serde_json::json!(false);
        let disabled: Settings = serde_json::from_value(old).unwrap();
        assert!(!disabled.close_to_tray);
        let saved = serde_json::to_value(disabled).unwrap();
        assert_eq!(saved["closeToTray"], false);
    }
}
