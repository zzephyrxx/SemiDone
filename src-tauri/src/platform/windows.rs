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
            Some(if policy.enabled {
                HWND_TOPMOST
            } else {
                HWND_NOTOPMOST
            }),
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
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, GetForegroundWindow, WS_EX_LAYERED, WS_EX_TOPMOST,
        WS_OVERLAPPEDWINDOW,
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
                None,
                None,
                None,
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
