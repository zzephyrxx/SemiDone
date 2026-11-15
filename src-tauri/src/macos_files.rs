use objc2_app_kit::NSWorkspace;
use objc2_foundation::NSURL;
use std::path::Path;

pub fn open_path(path: &Path) -> Result<(), String> {
    let url = NSURL::from_file_path(path).ok_or("无效文件路径")?;
    if NSWorkspace::sharedWorkspace().openURL(&url) {
        Ok(())
    } else {
        Err("系统无法打开此文件，请确认已安装关联应用".into())
    }
}
