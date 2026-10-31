//! AppKit policy for the shared main/Zen/floating window. Called on the UI thread.
use super::PinPolicy;
use tauri::WebviewWindow;
use tauri_nspanel::objc2_app_kit::{
    NSApplication, NSApplicationActivationPolicy, NSWindowCollectionBehavior, NSWindowStyleMask,
};
use tauri_nspanel::{tauri_panel, ManagerExt, WebviewWindowExt};

tauri_panel!(SemiDonePanel {
    config: {
        can_become_key_window: true,
        can_become_main_window: false,
        hides_on_deactivate: false,
        is_floating_panel: true
    }
});

#[derive(Clone, Copy)]
pub struct OriginalStyles {
    behavior: NSWindowCollectionBehavior,
    level: isize,
    style: NSWindowStyleMask,
    activation_policy: NSApplicationActivationPolicy,
}

fn native_window(window: &WebviewWindow) -> Result<&NSWindow, String> {
    let pointer = window.ns_window().map_err(|error| error.to_string())?;
    // Tauri owns this NSWindow. It stays alive for the duration of these calls,
    // which WindowPinning serializes on the main thread.
    unsafe { (pointer as *const NSWindow).as_ref() }
        .ok_or_else(|| "macOS window is unavailable".to_string())
}

pub fn capture(window: &WebviewWindow) -> Result<OriginalStyles, String> {
    let native = native_window(window)?;
    Ok(OriginalStyles {
        behavior: native.collectionBehavior(),
        level: native.level(),
        style: native.styleMask(),
        activation_policy: NSApplication::sharedApplication(
            MainThreadMarker::new().ok_or("AppKit requires the main thread")?,
        )
        .activationPolicy(),
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
    let application = NSApplication::sharedApplication(
        MainThreadMarker::new().ok_or("AppKit requires the main thread")?,
    );
    if policy.enabled {
        // Accessory applications can join another app's fullscreen space without
        // activating a regular app and switching the user back to its desktop.
        // The persistent status menu remains the restoration entry point.
        if application.activationPolicy() != NSApplicationActivationPolicy::Accessory
            && !application.setActivationPolicy(NSApplicationActivationPolicy::Accessory)
        {
            return Err("Failed to enable macOS fullscreen overlay policy".into());
        }
        let panel = match window.get_webview_panel(window.label()) {
            Ok(panel) => panel,
            Err(_) => window
                .to_panel::<SemiDonePanel>()
                .map_err(|e| e.to_string())?,
        };
        panel
            .add_style_mask(NSWindowStyleMask::NonactivatingPanel)
            .map_err(|e| e.to_string())?;
        panel.set_released_when_closed(false);
        // These groups are mutually exclusive; don't retain Primary/Managed
        // flags from the ordinary window while enabling the overlay policy.
        let mut behavior = original.behavior;
        behavior.remove(
            NSWindowCollectionBehavior::MoveToActiveSpace
                | NSWindowCollectionBehavior::Managed
                | NSWindowCollectionBehavior::Transient
                | NSWindowCollectionBehavior::FullScreenPrimary
                | NSWindowCollectionBehavior::FullScreenNone
                | NSWindowCollectionBehavior::Primary
                | NSWindowCollectionBehavior::Auxiliary,
        );
        behavior.insert(
            NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::CanJoinAllApplications
                | NSWindowCollectionBehavior::FullScreenAuxiliary
                | NSWindowCollectionBehavior::Stationary,
        );
        panel.set_collection_behavior(behavior);
        panel.set_hides_on_deactivate(false);
        // Fullscreen overlays require a level above fullscreen content. The
        // panel plugin also keeps WebKit input-method candidates above it.
        panel.set_level(1000);
    } else {
        if application.activationPolicy() != original.activation_policy
            && !application.setActivationPolicy(original.activation_policy)
        {
            return Err("Failed to restore macOS Dock policy".into());
        }
        if let Ok(panel) = window.get_webview_panel(window.label()) {
            panel
                .set_style_mask(original.style)
                .map_err(|e| e.to_string())?;
            panel.to_window().ok_or("Failed to restore macOS window")?;
            window.remove_webview_panel(window.label());
        }
        let native = native_window(window)?;
        native.setCollectionBehavior(original.behavior);
        native.setLevel(original.level);
    }
    Ok(())
}

pub fn focus(window: &WebviewWindow) -> Result<(), tauri::Error> {
    if let Ok(panel) = window.get_webview_panel(window.label()) {
        panel.show_and_make_key();
        Ok(())
    } else {
        window.set_focus()
    }
}
