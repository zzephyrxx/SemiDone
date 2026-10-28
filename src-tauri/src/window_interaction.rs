/// Disable native WebView menus as well as caption menus, which bypass DOM handlers.
pub fn install(window: &tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(windows)]
    {
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        use tauri::Emitter;
        let target = window.clone();
        native::install(
            windows::Win32::Foundation::HWND(hwnd.0),
            Some(Box::new(move || {
                let _ = target.emit_to(target.label(), "semidone:window-drag-ended", ());
            })),
        )?;
        window
            .with_webview(|webview| unsafe {
                let result = webview
                    .controller()
                    .CoreWebView2()
                    .and_then(|core| core.Settings())
                    .and_then(|settings| settings.SetAreDefaultContextMenusEnabled(false));
                if let Err(error) = result {
                    log::error!("Failed to disable native WebView context menus: {error}");
                }
            })
            .map_err(|error| error.to_string())?;
    }
    #[cfg(not(windows))]
    let _ = window;
    Ok(())
}

#[cfg(windows)]
mod native {
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass};
    use windows::Win32::UI::WindowsAndMessaging::{
        SC_KEYMENU, SC_MOUSEMENU, WM_CONTEXTMENU, WM_EXITSIZEMOVE, WM_NCDESTROY,
        WM_NCRBUTTONDBLCLK, WM_NCRBUTTONDOWN, WM_NCRBUTTONUP, WM_SYSCOMMAND,
    };

    const SUBCLASS_ID: usize = 0x53444D43;
    struct DragCallback(Box<dyn Fn() + Send + Sync>);

    unsafe extern "system" fn context_guard(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        id: usize,
        data: usize,
    ) -> LRESULT {
        if message == WM_SYSCOMMAND
            && matches!((wparam.0 as u32) & 0xfff0, SC_MOUSEMENU | SC_KEYMENU)
        {
            return LRESULT(0);
        }
        if matches!(
            message,
            WM_CONTEXTMENU | WM_NCRBUTTONDOWN | WM_NCRBUTTONUP | WM_NCRBUTTONDBLCLK
        ) {
            return LRESULT(0);
        }
        if message == WM_NCDESTROY {
            let _ = RemoveWindowSubclass(hwnd, Some(context_guard), id);
            if data != 0 {
                drop(Box::from_raw(data as *mut DragCallback));
            }
        } else if message == WM_EXITSIZEMOVE && data != 0 {
            ((*(data as *const DragCallback)).0)();
        }
        DefSubclassProc(hwnd, message, wparam, lparam)
    }

    pub fn install(
        hwnd: HWND,
        on_drag_end: Option<Box<dyn Fn() + Send + Sync>>,
    ) -> Result<(), String> {
        // setup() runs on the owning UI thread. No styles, focus or Z-order are changed.
        unsafe {
            let data = on_drag_end
                .map(|callback| Box::into_raw(Box::new(DragCallback(callback))) as usize)
                .unwrap_or(0);
            if !SetWindowSubclass(hwnd, Some(context_guard), SUBCLASS_ID, data).as_bool() {
                if data != 0 {
                    drop(Box::from_raw(data as *mut DragCallback));
                }
                return Err(windows::core::Error::from_win32().to_string());
            }
        }
        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::sync::atomic::{AtomicUsize, Ordering};
        use windows::core::w;
        use windows::Win32::Foundation::HINSTANCE;
        use windows::Win32::UI::WindowsAndMessaging::{
            CreateWindowExW, DestroyWindow, GetWindowLongW, IsWindowVisible, SendMessageW,
            GWL_EXSTYLE, HMENU, WINDOW_EX_STYLE, WM_LBUTTONDOWN, WM_LBUTTONUP, WS_OVERLAPPEDWINDOW,
        };

        unsafe extern "system" fn probe(
            hwnd: HWND,
            message: u32,
            wparam: WPARAM,
            lparam: LPARAM,
            _: usize,
            data: usize,
        ) -> LRESULT {
            if matches!(
                message,
                WM_CONTEXTMENU
                    | WM_NCRBUTTONDOWN
                    | WM_NCRBUTTONUP
                    | WM_NCRBUTTONDBLCLK
                    | WM_LBUTTONDOWN
                    | WM_LBUTTONUP
                    | WM_SYSCOMMAND
            ) {
                (*(data as *const AtomicUsize)).fetch_add(1, Ordering::SeqCst);
                return LRESULT(7);
            }
            DefSubclassProc(hwnd, message, wparam, lparam)
        }

        #[test]
        fn blocks_native_right_clicks_but_preserves_left_input_and_window_styles() {
            unsafe {
                let hwnd = CreateWindowExW(
                    WINDOW_EX_STYLE::default(),
                    w!("STATIC"),
                    w!("SemiDone context test"),
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
                .unwrap();
                let count = AtomicUsize::new(0);
                assert!(
                    SetWindowSubclass(hwnd, Some(probe), 1, &count as *const _ as usize).as_bool()
                );
                let styles = GetWindowLongW(hwnd, GWL_EXSTYLE);
                let completed = std::sync::Arc::new(AtomicUsize::new(0));
                let callback_count = completed.clone();
                install(
                    hwnd,
                    Some(Box::new(move || {
                        callback_count.fetch_add(1, Ordering::SeqCst);
                    })),
                )
                .unwrap();
                for message in [
                    WM_CONTEXTMENU,
                    WM_NCRBUTTONDOWN,
                    WM_NCRBUTTONUP,
                    WM_NCRBUTTONDBLCLK,
                ] {
                    assert_eq!(SendMessageW(hwnd, message, WPARAM(0), LPARAM(0)).0, 0);
                }
                assert_eq!(count.load(Ordering::SeqCst), 0);
                for command in [SC_MOUSEMENU, SC_KEYMENU] {
                    for low_bits in [0, 5] {
                        assert_eq!(
                            SendMessageW(
                                hwnd,
                                WM_SYSCOMMAND,
                                WPARAM((command | low_bits) as usize),
                                LPARAM(0)
                            )
                            .0,
                            0
                        );
                    }
                }
                assert_eq!(count.load(Ordering::SeqCst), 0);
                for command in [
                    windows::Win32::UI::WindowsAndMessaging::SC_MOVE | 2,
                    windows::Win32::UI::WindowsAndMessaging::SC_CLOSE,
                ] {
                    assert_eq!(
                        SendMessageW(hwnd, WM_SYSCOMMAND, WPARAM(command as usize), LPARAM(0)).0,
                        7
                    );
                }
                for message in [WM_LBUTTONDOWN, WM_LBUTTONUP] {
                    assert_eq!(SendMessageW(hwnd, message, WPARAM(0), LPARAM(0)).0, 7);
                }
                assert_eq!(count.load(Ordering::SeqCst), 4);
                SendMessageW(hwnd, WM_EXITSIZEMOVE, WPARAM(0), LPARAM(0));
                assert_eq!(completed.load(Ordering::SeqCst), 1);
                assert_eq!(GetWindowLongW(hwnd, GWL_EXSTYLE), styles);
                assert!(!IsWindowVisible(hwnd).as_bool());
                let _ = DestroyWindow(hwnd);
                assert_eq!(std::sync::Arc::strong_count(&completed), 1);
            }
        }
    }
}
