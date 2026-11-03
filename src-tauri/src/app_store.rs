use std::ffi::CStr;

unsafe extern "C" {
    fn semidone_login_status() -> i32;
    fn semidone_set_login(enabled: bool, error: *mut std::ffi::c_char, capacity: usize) -> bool;
}

pub fn login_enabled() -> bool {
    unsafe { semidone_login_status() == 1 }
}

pub fn set_login(enabled: bool) -> Result<bool, String> {
    let mut error = [0 as std::ffi::c_char; 1024];
    if !unsafe { semidone_set_login(enabled, error.as_mut_ptr(), error.len()) } {
        return Err(unsafe { CStr::from_ptr(error.as_ptr()) }
            .to_string_lossy()
            .into_owned());
    }
    Ok(login_enabled())
}
