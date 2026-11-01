use std::sync::{mpsc, Arc, Mutex};
#[cfg(windows)]
use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tauri::{Manager, WebviewWindow};

#[derive(Clone, Copy, Default)]
struct PinPolicy {
    enabled: bool,
    compact: bool,
    hidden_by_user: bool,
}

#[cfg(any(windows, test))]
impl PinPolicy {
    fn tool_window(self) -> bool {
        self.enabled && self.compact
    }

    fn keep_visible(self) -> bool {
        self.enabled && !self.hidden_by_user
    }
}

#[derive(Default)]
struct PinState {
    policy: PinPolicy,
    original: Option<native::OriginalStyles>,
    running: bool,
    #[cfg(windows)]
    last_error: Option<String>,
}

#[derive(Clone, Default)]
pub struct WindowPinning {
    inner: Arc<Mutex<PinState>>,
    #[cfg(windows)]
    tick_queued: Arc<AtomicBool>,
}

impl WindowPinning {
    pub fn start(&self, window: WebviewWindow) -> Result<(), String> {
        {
            let mut state = self.inner.lock().map_err(|e| e.to_string())?;
            state.original = Some(native::capture(&window)?);
            // Startup visibility can be transient; only an explicit hidden startup
            // configuration counts as user intent to keep the window hidden.
            state.policy.hidden_by_user = window
                .app_handle()
                .config()
                .app
                .windows
                .iter()
                .find(|config| config.label == window.label())
                .map(|config| !config.visible)
                .unwrap_or(false);
            state.running = true;
        }

        #[cfg(windows)]
        {
            let pinning = self.clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_millis(250));
                let active = match pinning.inner.lock() {
                    Ok(state) if state.running => state.policy.keep_visible(),
                    _ => break,
                };
                if !active || pinning.tick_queued.swap(true, Ordering::AcqRel) {
                    continue;
                }
                let queued = pinning.clone();
                let target = window.clone();
                if window
                    .run_on_main_thread(move || {
                        if let Ok(mut state) = queued.inner.lock() {
                            if state.running && state.policy.keep_visible() {
                                if let Some(original) = state.original {
                                    match native::guard(&target, original, state.policy) {
                                        Ok(()) => state.last_error = None,
                                        Err(error) => {
                                            if state.last_error.as_ref() != Some(&error) {
                                                log::warn!("Pinned window guard: {error}");
                                            }
                                            state.last_error = Some(error);
                                        }
                                    }
                                }
                            }
                        }
                        queued.tick_queued.store(false, Ordering::Release);
                    })
                    .is_err()
                {
                    pinning.tick_queued.store(false, Ordering::Release);
                    break;
                }
            });
        }
        Ok(())
    }

    // Commands execute off the UI thread; all Win32 changes are serialized on it.
    pub fn configure(
        &self,
        window: WebviewWindow,
        enabled: Option<bool>,
        compact: Option<bool>,
    ) -> Result<(), String> {
        let (send, receive) = mpsc::sync_channel(1);
        let pinning = self.clone();
        let target = window.clone();
        window
            .run_on_main_thread(move || {
                let result = (|| {
                    let mut state = pinning.inner.lock().map_err(|e| e.to_string())?;
                    let original = match state.original {
                        Some(original) => original,
                        None => native::capture(&target)?,
                    };
                    let previous = state.policy;
                    let next = PinPolicy {
                        enabled: enabled.unwrap_or(previous.enabled),
                        compact: compact.unwrap_or(previous.compact),
                        ..previous
                    };
                    // Delayed focus/visibility events must not touch a window
                    // explicitly hidden by the user. Restoration applies the
                    // latest policy when the user chooses Show again.
                    if !next.hidden_by_user {
                        if let Err(error) = native::configure(&target, original, next, previous) {
                            let _ = native::configure(&target, original, previous, next);
                            return Err(error);
                        }
                    }
                    state.original = Some(original);
                    state.policy = next;
                    Ok(())
                })();
                let _ = send.send(result);
            })
            .map_err(|e| e.to_string())?;
        receive.recv().map_err(|e| e.to_string())?
    }

    pub fn set_hidden(&self, hidden: bool) {
        if let Ok(mut state) = self.inner.lock() {
            state.policy.hidden_by_user = hidden;
        }
    }

    pub fn stop(&self) {
        if let Ok(mut state) = self.inner.lock() {
            state.running = false;
        }
    }
}

/// Only an explicit user action brings the window to the foreground.
pub fn show_main_window(app: &tauri::AppHandle) {
    let handle = app.clone();
    // Single-instance callbacks may arrive off the main thread. Keep AppKit
    // access and the pin policy update together on the event-loop thread.
    if let Err(error) = app.run_on_main_thread(move || {
        let Some(window) = handle.get_webview_window("main") else {
            log::error!("Restore failed: main window no longer exists");
            return;
        };
        let pinning = handle.state::<WindowPinning>();
        let result = (|| -> Result<(), String> {
            window.unminimize().map_err(|e| e.to_string())?;
            window.show().map_err(|e| e.to_string())?;
            {
                let mut state = pinning.inner.lock().map_err(|e| e.to_string())?;
                if let Some(original) = state.original {
                    native::configure(&window, original, state.policy, state.policy)?;
                }
                state.policy.hidden_by_user = false;
            }
            #[cfg(target_os = "macos")]
            native::focus(&window).map_err(|e| e.to_string())?;
            #[cfg(not(target_os = "macos"))]
            window.set_focus().map_err(|e| e.to_string())?;
            Ok(())
        })();
        if let Err(error) = result {
            log::error!("Failed to restore main window: {error}");
        }
    }) {
        log::error!("Failed to queue main window restore: {error}");
    }
}

#[cfg(windows)]
#[path = "platform/windows.rs"]
mod native;

#[cfg(target_os = "macos")]
#[path = "platform/macos.rs"]
mod native;

#[cfg(not(any(windows, target_os = "macos")))]
mod native {
    use super::PinPolicy;
    use tauri::WebviewWindow;

    #[derive(Clone, Copy)]
    pub struct OriginalStyles;

    pub fn capture(_: &WebviewWindow) -> Result<OriginalStyles, String> {
        Ok(OriginalStyles)
    }

    pub fn configure(
        window: &WebviewWindow,
        _: OriginalStyles,
        policy: PinPolicy,
        _: PinPolicy,
    ) -> Result<(), String> {
        window
            .set_always_on_top(policy.enabled)
            .map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::PinPolicy;

    #[test]
    fn only_pinned_compact_views_are_tool_windows() {
        for enabled in [false, true] {
            for compact in [false, true] {
                let policy = PinPolicy {
                    enabled,
                    compact,
                    ..Default::default()
                };
                assert_eq!(policy.tool_window(), enabled && compact);
            }
        }
    }

    #[test]
    fn closing_to_tray_suspends_visibility_recovery_until_explicitly_shown() {
        let mut policy = PinPolicy {
            enabled: true,
            ..Default::default()
        };
        assert!(policy.keep_visible());
        policy.hidden_by_user = true;
        assert!(!policy.keep_visible());
        policy.hidden_by_user = false;
        assert!(policy.keep_visible());
    }

    #[test]
    fn disabling_pin_prevents_queued_guard_from_restoring_a_window() {
        let mut policy = PinPolicy {
            enabled: true,
            compact: true,
            ..Default::default()
        };
        policy.enabled = false;
        assert!(!policy.keep_visible());
        assert!(!policy.tool_window());
    }
}
