#import <AppKit/AppKit.h>
#import <WebKit/WebKit.h>
#include <assert.h>

extern bool semidone_set_zen_panel(void *webview, const char *json);
static NSButton *buttonWithLabel(NSView *view, NSString *label) {
    if ([view isKindOfClass:NSButton.class] && [[view accessibilityLabel] isEqualToString:label]) return (NSButton *)view;
    for (NSView *child in view.subviews) { NSButton *result = buttonWithLabel(child, label); if (result) return result; }
    return nil;
}
static NSTextField *taskLabel(NSView *view) {
    if ([view isKindOfClass:NSTextField.class] && [((NSTextField *)view).stringValue isEqualToString:@"Test task"]) return (NSTextField *)view;
    for (NSView *child in view.subviews) {
        NSTextField *result = taskLabel(child);
        if (result) return result;
    }
    return nil;
}
int main(void) {
    @autoreleasepool {
        [NSApplication sharedApplication];
        NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 380, 360)
            styleMask:NSWindowStyleMaskBorderless backing:NSBackingStoreBuffered defer:NO];
        window.releasedWhenClosed = NO;
        window.opaque = NO; window.backgroundColor = NSColor.clearColor;
        WKWebView *webview = [[WKWebView alloc] initWithFrame:window.contentView.bounds];
        [window.contentView addSubview:webview];
        const char *payload = "{\"appearance\":{\"backgroundColor\":\"#112233\",\"backgroundOpacity\":25,\"textColor\":\"#ffffff\",\"rowColor\":\"#ffffff\",\"rowOpacity\":8,\"fontSize\":15},\"pinned\":false,\"tasks\":[{\"id\":\"one\",\"title\":\"Test task\",\"busy\":false}]}";
        assert(semidone_set_zen_panel((__bridge void *)webview, payload));
        assert(webview.hidden);
        NSView *panel = window.contentView.subviews.lastObject;
        assert(!panel.opaque);
        assert(buttonWithLabel(panel, @"Zen 模式配置"));
        assert(buttonWithLabel(panel, @"完成：Test task"));
        NSButton *complete = buttonWithLabel(panel, @"完成：Test task");
        [complete performClick:nil];
        assert(!complete.enabled);
        assert(semidone_set_zen_panel((__bridge void *)webview, payload));
        assert(buttonWithLabel(panel, @"完成：Test task").enabled);
        for (NSNumber *width in @[@280, @380, @650]) {
            [panel setFrameSize:NSMakeSize(width.doubleValue, 360)];
            [panel layout];
            NSArray *labels = @[@"Zen 模式配置", @"置顶窗口", @"返回完整模式", @"关闭应用"];
            CGFloat previousRight = 0;
            for (NSString *label in labels) {
                NSButton *button = buttonWithLabel(panel, label);
                assert(button && button.frame.size.width == 27 && button.frame.size.height == 27);
                assert(NSMinX(button.frame) >= previousRight && NSMaxX(button.frame) <= width.doubleValue);
                previousRight = NSMaxX(button.frame);
            }
        }
        // Verify the native label preserves the frontend's scaled font size.
        for (NSNumber *size in @[@10.8, @15, @36.4]) {
            NSString *scaledPayload = [[NSString stringWithUTF8String:payload]
                stringByReplacingOccurrencesOfString:@"\"fontSize\":15"
                withString:[NSString stringWithFormat:@"\"fontSize\":%@", size]];
            assert(semidone_set_zen_panel((__bridge void *)webview, scaledPayload.UTF8String));
            NSTextField *label = taskLabel(panel);
            assert(label && fabs(label.font.pointSize - size.doubleValue) < .001);
            assert(label.frame.size.height >= label.font.pointSize);
        }
        assert(semidone_set_zen_panel((__bridge void *)webview, NULL));
        assert(!webview.hidden);
        assert(window.contentView.subviews.count == 1);
        [window close];
        puts("Native Zen panel lifecycle passed");
    }
    return 0;
}
