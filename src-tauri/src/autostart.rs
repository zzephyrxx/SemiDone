use tauri_plugin_autostart::ManagerExt;

const DEVELOPMENT_ERROR: &str =
    "开发版不支持开机自启动，请在正式安装版中设置，避免启动时连接 localhost 失败";

pub fn is_supported() -> bool {
    // A Cargo release build can still use devUrl without Tauri's custom protocol.
    // Packaged debug builds also have a console, so neither is suitable for login.
    !tauri::is_dev() && !cfg!(debug_assertions)
}

fn ensure_supported(supported: bool) -> Result<(), String> {
    if supported {
        Ok(())
    } else {
        Err(DEVELOPMENT_ERROR.into())
    }
}

pub fn is_enabled(app: &tauri::AppHandle) -> Result<bool, String> {
    if !is_supported() {
        // A development process must not expose or alter the installed copy's entry.
        return Ok(false);
    }
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

pub fn set_enabled(app: &tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    ensure_supported(is_supported())?;
    let manager = app.autolaunch();
    let previous = manager.is_enabled().map_err(|error| error.to_string())?;
    if enabled {
        // Always register again: an older copy may have left its executable path.
        manager.enable().map_err(|error| error.to_string())?;
    } else if previous {
        manager.disable().map_err(|error| error.to_string())?;
    }
    manager.is_enabled().map_err(|error| error.to_string())
}

pub fn refresh_existing_registration(app: &tauri::AppHandle) -> Result<(), String> {
    if is_enabled(app)? {
        // Repair an enabled entry to point at the installed executable now running.
        // Never re-enable an entry disabled in Windows Task Manager.
        set_enabled(app, true)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_development_before_accessing_system_autostart() {
        let error = ensure_supported(false).unwrap_err();
        assert!(error.contains("正式安装版"));
        assert!(error.contains("localhost"));
        assert!(ensure_supported(true).is_ok());
    }
}
