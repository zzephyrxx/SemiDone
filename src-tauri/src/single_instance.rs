use std::sync::Mutex;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE};
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{CreateMutexW};
#[cfg(target_os = "windows")]
use windows::core::PCWSTR;

#[cfg(target_os = "windows")]
#[derive(Debug)]
struct SafeHandle(HANDLE);

#[cfg(target_os = "windows")]
unsafe impl Send for SafeHandle {}
#[cfg(target_os = "windows")]
unsafe impl Sync for SafeHandle {}

// SingleInstance struct holds the mutex handle
#[derive(Debug)]
pub struct SingleInstance {
    #[cfg(target_os = "windows")]
    mutex_handle: SafeHandle,
}

impl SingleInstance {
    pub fn new(app_name: &str) -> Result<Self, String> {
        #[cfg(target_os = "windows")]
        {
            let mutex_name = format!("Global\\{}_SingleInstance", app_name);
            let wide_name: Vec<u16> = mutex_name.encode_utf16().chain(std::iter::once(0)).collect();

            unsafe {
                let handle = CreateMutexW(None, true, PCWSTR(wide_name.as_ptr()))
                    .map_err(|e| format!("Failed to create mutex: {}", e))?;

                if GetLastError() == ERROR_ALREADY_EXISTS {
                    let _ = CloseHandle(handle);
                    return Err("Another instance is already running".to_string());
                }

                println!("Single instance mutex created successfully");
                Ok(SingleInstance { mutex_handle: SafeHandle(handle) })
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            Ok(SingleInstance {})
        }
    }
}

// The Drop trait ensures the mutex handle is closed when SingleInstance goes out of scope
impl Drop for SingleInstance {
    fn drop(&mut self) {
        #[cfg(target_os = "windows")]
        {
            if !(self.mutex_handle.0).is_invalid() {
                unsafe {
                    let _ = CloseHandle(self.mutex_handle.0);
                }
                println!("Single instance mutex released on drop");
            }
        }
    }
}

// Global mutex holder to manage the lifetime of the SingleInstance object
static SINGLE_INSTANCE: Mutex<Option<SingleInstance>> = Mutex::new(None);

pub fn ensure_single_instance(app_name: &str) -> Result<(), String> {
    let mut instance_guard = SINGLE_INSTANCE.lock().unwrap();

    if instance_guard.is_some() {
        // This case should ideally not be hit if logic is correct, but as a safeguard:
        return Err("Single instance lock already held by this process.".to_string());
    }

    match SingleInstance::new(app_name) {
        Ok(instance) => {
            *instance_guard = Some(instance);
            Ok(())
        }
        Err(e) => {
            // If we failed to create a new instance, it might be because another process is running.
            Err(e)
        }
    }
}

#[allow(dead_code)]
pub fn cleanup_single_instance() {
    let mut instance = SINGLE_INSTANCE.lock().unwrap();
    *instance = None;
    println!("Single instance cleanup completed");
}
