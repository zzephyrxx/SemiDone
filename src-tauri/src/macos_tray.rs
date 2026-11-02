//! Bind the actual status button: a permanently attached NSMenu can intercept
//! clicks before tray-icon's child view receives them on newer macOS versions.
use std::cell::RefCell;
use tauri::tray::TrayIcon;
use tauri_nspanel::objc2::{
    define_class, msg_send, rc::Retained, sel, DefinedClass, MainThreadMarker, MainThreadOnly,
};
use tauri_nspanel::objc2_app_kit::{
    NSApplication, NSEventMask, NSEventType, NSMenu, NSStatusBarButton,
};
use tauri_nspanel::objc2_foundation::{NSObject, NSPoint};

struct TrayState {
    app: tauri::AppHandle,
    menu: Retained<NSMenu>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "SemiDoneTrayActionTarget"]
    #[thread_kind = MainThreadOnly]
    #[ivars = TrayState]
    struct TrayActionTarget;

    impl TrayActionTarget {
        #[unsafe(method(handleClick:))]
        fn handle_click(&self, sender: &NSStatusBarButton) {
            let app = NSApplication::sharedApplication(MainThreadMarker::from(self));
            if app.currentEvent().is_some_and(|event| event.r#type() == NSEventType::RightMouseUp) {
                // Popup without assigning statusItem.menu: left clicks always
                // remain actions, including after this context menu closes.
                let bounds = sender.bounds();
                self.ivars().menu.popUpMenuPositioningItem_atLocation_inView(
                    None,
                    NSPoint::new(bounds.origin.x, bounds.origin.y + bounds.size.height),
                    Some(sender),
                );
            } else {
                crate::window_pinning::show_main_window(&self.ivars().app);
            }
        }
    }
);

thread_local! {
    // NSControl.target is non-owning. Keep its target alive on the AppKit thread.
    static TARGET: RefCell<Option<Retained<TrayActionTarget>>> = const { RefCell::new(None) };
}

pub fn install(tray: &TrayIcon) -> tauri::Result<()> {
    let app = tray.app_handle().clone();
    tray.with_inner_tray_icon(move |inner| -> Result<(), String> {
        let mtm = MainThreadMarker::new().ok_or("Status button requires the AppKit thread")?;
        let item = inner.ns_status_item().ok_or("Missing native status item")?;
        let menu = item.menu(mtm).ok_or("Missing tray context menu")?;
        let button = item.button(mtm).ok_or("Missing native status button")?;
        let target = TrayActionTarget::alloc(mtm).set_ivars(TrayState { app, menu });
        let target: Retained<TrayActionTarget> = unsafe { msg_send![super(target), init] };
        item.setMenu(None);
        // Replace only tray-icon's input overlay, preserving AppKit's own
        // status-button contents. The icon and tooltip remain owned by Tauri.
        for view in button.subviews() {
            if view.class().name().to_bytes() == b"TaoTrayTarget" {
                view.removeFromSuperview();
            }
        }
        unsafe {
            button.setTarget(Some(&*target));
            button.setAction(Some(sel!(handleClick:)));
        }
        button.sendActionOn(NSEventMask::LeftMouseUp | NSEventMask::RightMouseUp);
        TARGET.with(|slot| *slot.borrow_mut() = Some(target));
        Ok(())
    })?
    .map_err(|error| tauri::Error::Io(std::io::Error::other(error)))
}
