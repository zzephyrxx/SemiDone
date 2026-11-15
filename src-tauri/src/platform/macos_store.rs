//! Store channel: public NSWindow APIs, with the Dock remaining available.
use super::PinPolicy;
use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
use tauri::WebviewWindow;

unsafe extern "C" {
    fn semidone_install_window_shape(window: *mut std::ffi::c_void);
}

#[derive(Clone, Copy)]
pub struct OriginalStyles {
    behavior: NSWindowCollectionBehavior,
    level: isize,
}

fn native_window(window: &WebviewWindow) -> Result<&NSWindow, String> {
    let pointer = window.ns_window().map_err(|e| e.to_string())?;
    unsafe { (pointer as *const NSWindow).as_ref() }.ok_or("窗口不可用".into())
}

pub fn capture(window: &WebviewWindow) -> Result<OriginalStyles, String> {
    // capture() runs in setup on the AppKit thread, before the first frame.
    let pointer = window.ns_window().map_err(|e| e.to_string())?;
    unsafe { semidone_install_window_shape(pointer.cast()) };
    let window = native_window(window)?;
    Ok(OriginalStyles {
        behavior: window.collectionBehavior(),
        level: window.level(),
    })
}

pub fn configure(
    window: &WebviewWindow,
    original: OriginalStyles,
    policy: PinPolicy,
    _: PinPolicy,
) -> Result<(), String> {
    window
        .set_always_on_top(policy.enabled)
        .map_err(|e| e.to_string())?;
    let native = native_window(window)?;
    if policy.enabled {
        // Tauri sets the documented floating level. Never use a screen-saver level.
        native.setCollectionBehavior(
            NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::FullScreenAuxiliary,
        );
    } else {
        native.setCollectionBehavior(original.behavior);
        native.setLevel(original.level);
    }
    Ok(())
}

pub fn focus(window: &WebviewWindow) -> Result<(), tauri::Error> {
    window.set_focus()
}
