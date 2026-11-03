#import <ServiceManagement/ServiceManagement.h>
#include <stdbool.h>
#include <stdio.h>

int semidone_login_status(void) {
    @autoreleasepool { return (int)SMAppService.mainAppService.status; }
}

bool semidone_set_login(bool enabled, char *message, size_t capacity) {
    @autoreleasepool {
        SMAppService *service = SMAppService.mainAppService;
        NSError *error = nil;
        BOOL success = enabled ? [service registerAndReturnError:&error]
                               : [service unregisterAndReturnError:&error];
        if (!success) {
            snprintf(message, capacity, "%s", (error.localizedDescription ?: @"无法更新登录项").UTF8String);
            return false;
        }
        if (enabled && service.status == SMAppServiceStatusRequiresApproval) {
            snprintf(message, capacity, "%s", "请在系统设置 → 通用 → 登录项中允许 SemiDone 登录时运行");
            return false;
        }
        return true;
    }
}
