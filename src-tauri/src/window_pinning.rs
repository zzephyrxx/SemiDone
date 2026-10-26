use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Arc, Mutex,
};
use std::time::Duration;
use tauri::{Manager, WebviewWindow};

#[derive(Clone, Copy, Default)]
struct PinPolicy {
    enabled: bool,
    compact: bool,
    hidden_by_user: bool,
}

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
    last_error: Option<String>,
}

#[derive(Clone, Default)]
pub struct WindowPinning {
    inner: Arc<Mutex<PinState>>,
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
                    if let Err(error) = native::configure(&target, original, next, previous) {
                        let _ = native::configure(&target, original, previous, next);
                        return Err(error);
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

    pub fn enabled(&self) -> bool {
        self.inner
            .lock()
            .map(|state| state.policy.enabled)
            .unwrap_or(false)
    }

    pub fn stop(&self) {
        if let Ok(mut state) = self.inner.lock() {
            state.running = false;
        }
    }
}

/// Only an explicit user action brings the window to the foreground.
pub fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let pinning = app.state::<WindowPinning>();
        pinning.set_hidden(false);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_always_on_top(true);
        let _ = window.set_focus();
        // Never undo the user's pin when the tray temporarily raises the window.
        let _ = window.set_always_on_top(pinning.enabled());
    }
}

#[cfg(windows)]
mod native {
    use super::PinPolicy;
    use tauri::WebviewWindow;
    use windows::Win32::Foundation::{GetLastError, SetLastError, ERROR_SUCCESS, HWND};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, IsIconic, IsWindowVisible, SetWindowLongW, SetWindowPos, ShowWindow,
        GWL_EXSTYLE, GWL_STYLE, HWND_NOTOPMOST, HWND_TOPMOST, SWP_FRAMECHANGED, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSIZE, SW_SHOWNOACTIVATE, WINDOW_LONG_PTR_INDEX,
        WS_EX_APPWINDOW, WS_EX_TOOLWINDOW, WS_MINIMIZEBOX,
    };

    #[derive(Clone, Copy)]
    pub struct OriginalStyles {
        shell_bits: u32,
        minimizable: bool,
    }

    fn hwnd(window: &WebviewWindow) -> Result<HWND, String> {
        window
            .hwnd()
            .map(|handle| HWND(handle.0))
            .map_err(|e| e.to_string())
    }

    pub fn capture(window: &WebviewWindow) -> Result<OriginalStyles, String> {
        Ok(capture_handle(hwnd(window)?))
    }

    fn capture_handle(hwnd: HWND) -> OriginalStyles {
        unsafe {
            OriginalStyles {
                shell_bits: GetWindowLongW(hwnd, GWL_EXSTYLE) as u32
                    & (WS_EX_APPWINDOW.0 | WS_EX_TOOLWINDOW.0),
                minimizable: GetWindowLongW(hwnd, GWL_STYLE) as u32 & WS_MINIMIZEBOX.0 != 0,
            }
        }
    }

    fn update_bits(
        hwnd: HWND,
        index: WINDOW_LONG_PTR_INDEX,
        mask: u32,
        bits: u32,
    ) -> Result<bool, String> {
        unsafe {
            let current = GetWindowLongW(hwnd, index) as u32;
            let next = (current & !mask) | (bits & mask);
            if current == next {
                return Ok(false);
            }
            SetLastError(ERROR_SUCCESS);
            let previous = SetWindowLongW(hwnd, index, next as i32);
            if previous == 0 && GetLastError() != ERROR_SUCCESS {
                return Err(windows::core::Error::from_win32().to_string());
            }
            Ok(true)
        }
    }

    fn apply(
        window: &WebviewWindow,
        original: OriginalStyles,
        policy: PinPolicy,
    ) -> Result<(), String> {
        apply_handle(hwnd(window)?, original, policy)
    }

    fn apply_handle(hwnd: HWND, original: OriginalStyles, policy: PinPolicy) -> Result<(), String> {
        let shell_bits = if policy.tool_window() {
            WS_EX_TOOLWINDOW.0
        } else {
            original.shell_bits
        };
        let changed_shell = update_bits(
            hwnd,
            GWL_EXSTYLE,
            WS_EX_APPWINDOW.0 | WS_EX_TOOLWINDOW.0,
            shell_bits,
        )?;
        let min_bits = if !policy.enabled && original.minimizable {
            WS_MINIMIZEBOX.0
        } else {
            0
        };
        let changed_min = update_bits(hwnd, GWL_STYLE, WS_MINIMIZEBOX.0, min_bits)?;
        let mut flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER;
        if changed_shell || changed_min {
            flags |= SWP_FRAMECHANGED;
        }
        unsafe {
            SetWindowPos(
                hwnd,
                if policy.enabled {
                    HWND_TOPMOST
                } else {
                    HWND_NOTOPMOST
                },
                0,
                0,
                0,
                0,
                flags,
            )
            .map_err(|e| e.to_string())
        }
    }

    pub fn configure(
        window: &WebviewWindow,
        original: OriginalStyles,
        policy: PinPolicy,
        previous: PinPolicy,
    ) -> Result<(), String> {
        // Keep Tao's cached flags consistent so resize/restore cannot undo them.
        window
            .set_minimizable(!policy.enabled && original.minimizable)
            .map_err(|e| e.to_string())?;
        window
            .set_always_on_top(policy.enabled)
            .map_err(|e| e.to_string())?;
        if policy.tool_window() != previous.tool_window() {
            window
                .set_skip_taskbar(policy.tool_window())
                .map_err(|e| e.to_string())?;
        }
        apply(window, original, policy)
    }

    pub fn guard(
        window: &WebviewWindow,
        original: OriginalStyles,
        policy: PinPolicy,
    ) -> Result<(), String> {
        if !policy.keep_visible() {
            return Ok(());
        }
        let hwnd = hwnd(window)?;
        unsafe {
            if IsIconic(hwnd).as_bool() || !IsWindowVisible(hwnd).as_bool() {
                // Restore a shell-minimized window without stealing keyboard focus.
                // Explicitly hidden windows are excluded by PinPolicy above.
                let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            }
        }
        apply(window, original, policy)
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use windows::core::w;
        use windows::Win32::Foundation::HINSTANCE;
        use windows::Win32::UI::WindowsAndMessaging::{
            CreateWindowExW, DestroyWindow, GetForegroundWindow, HMENU, WS_EX_LAYERED,
            WS_EX_TOPMOST, WS_OVERLAPPEDWINDOW,
        };

        struct TestWindow(HWND);
        impl Drop for TestWindow {
            fn drop(&mut self) {
                unsafe {
                    let _ = DestroyWindow(self.0);
                }
            }
        }

        #[test]
        fn native_styles_round_trip_without_showing_or_activating_the_window() {
            let window = TestWindow(unsafe {
                CreateWindowExW(
                    WS_EX_APPWINDOW | WS_EX_LAYERED,
                    w!("STATIC"),
                    w!("SemiDone pin test"),
                    WS_OVERLAPPEDWINDOW,
                    0,
                    0,
                    1,
                    1,
                    HWND::default(),
                    HMENU::default(),
                    HINSTANCE::default(),
                    None,
                )
                .unwrap()
            });
            let original = capture_handle(window.0);
            assert!(original.minimizable);
            let pinned = PinPolicy {
                enabled: true,
                compact: true,
                ..Default::default()
            };
            apply_handle(window.0, original, pinned).unwrap();
            unsafe {
                let flags = GetWindowLongW(window.0, GWL_EXSTYLE) as u32;
                assert_ne!(flags & WS_EX_TOOLWINDOW.0, 0);
                assert_eq!(flags & WS_EX_APPWINDOW.0, 0);
                assert_ne!(flags & WS_EX_LAYERED.0, 0);
                assert_ne!(flags & WS_EX_TOPMOST.0, 0);
                assert_eq!(
                    GetWindowLongW(window.0, GWL_STYLE) as u32 & WS_MINIMIZEBOX.0,
                    0
                );
                assert!(!IsWindowVisible(window.0).as_bool());
                assert_ne!(GetForegroundWindow(), window.0);
            }
            apply_handle(
                window.0,
                original,
                PinPolicy {
                    compact: false,
                    ..pinned
                },
            )
            .unwrap();
            unsafe {
                let flags = GetWindowLongW(window.0, GWL_EXSTYLE) as u32;
                assert_eq!(flags & WS_EX_TOOLWINDOW.0, 0);
                assert_ne!(flags & WS_EX_APPWINDOW.0, 0);
            }
            apply_handle(window.0, original, PinPolicy::default()).unwrap();
            unsafe {
                let flags = GetWindowLongW(window.0, GWL_EXSTYLE) as u32;
                assert_eq!(
                    flags & (WS_EX_APPWINDOW.0 | WS_EX_TOOLWINDOW.0),
                    original.shell_bits
                );
                assert_eq!(flags & WS_EX_TOPMOST.0, 0);
                assert_ne!(flags & WS_EX_LAYERED.0, 0);
                assert_ne!(
                    GetWindowLongW(window.0, GWL_STYLE) as u32 & WS_MINIMIZEBOX.0,
                    0
                );
                assert!(!IsWindowVisible(window.0).as_bool());
            }
        }
    }
}

#[cfg(not(windows))]
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
