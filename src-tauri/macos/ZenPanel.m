#import <AppKit/AppKit.h>
#import <WebKit/WebKit.h>
#import <QuartzCore/QuartzCore.h>
#import <objc/runtime.h>

// Zen is a native sibling of WKWebView. The WebView is hidden only while this
// panel is visible, so the window can composite its background with the desktop.
static char SDZenKey;
static char SDTaskKey;
@interface SDZenDocument : NSView
@end
@implementation SDZenDocument
- (BOOL)isFlipped { return YES; }
@end
static NSColor *SDColor(NSString *hex, CGFloat alpha) {
    unsigned value = 0;
    if (![hex isKindOfClass:NSString.class] || hex.length != 7 || ![hex hasPrefix:@"#"] ||
        ![[NSScanner scannerWithString:[hex substringFromIndex:1]] scanHexInt:&value]) value = 0x0f172a;
    return [NSColor colorWithSRGBRed:((value >> 16) & 255) / 255.0 green:((value >> 8) & 255) / 255.0 blue:(value & 255) / 255.0 alpha:MAX(0, MIN(1, alpha))];
}

@interface SDZenPanel : NSView
@property(nonatomic, weak) WKWebView *webview;
@property(nonatomic, strong) NSDictionary *state;
@property(nonatomic, strong) NSScrollView *scroll;
@property(nonatomic, strong) NSView *document;
@property(nonatomic, strong) NSMutableArray<NSButton *> *toolbar;
@property(nonatomic, strong) NSTextField *heading;
@property(nonatomic) CGFloat contentWidth;
- (void)apply:(NSDictionary *)state;
@end

@implementation SDZenPanel
- (BOOL)isFlipped { return YES; }
- (BOOL)isOpaque { return NO; }
- (BOOL)acceptsFirstResponder { return YES; }
- (void)keyDown:(NSEvent *)event {
    if (event.keyCode == 53) [self emit:@"exit" task:nil];
    else [super keyDown:event];
}
- (instancetype)initWithFrame:(NSRect)frame {
    if ((self = [super initWithFrame:frame])) {
        self.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        // Child frames are set by layout; automatic springs/struts otherwise
        // resize the toolbar controls independently while the window moves.
        self.autoresizesSubviews = NO;
        self.wantsLayer = YES;
        self.layer.backgroundColor = NSColor.clearColor.CGColor;
        self.toolbar = [NSMutableArray array];
        _heading = [NSTextField labelWithString:@"SemiDone"];
        _heading.font = [NSFont systemFontOfSize:12];
        [self addSubview:_heading];
        _scroll = [[NSScrollView alloc] initWithFrame:NSZeroRect];
        _scroll.drawsBackground = NO;
        _scroll.hasVerticalScroller = YES;
        _scroll.autohidesScrollers = YES;
        _scroll.borderType = NSNoBorder;
        _document = [[SDZenDocument alloc] initWithFrame:NSZeroRect];
        _document.wantsLayer = YES;
        _document.layer.backgroundColor = NSColor.clearColor.CGColor;
        _scroll.documentView = _document;
        [self addSubview:_scroll];
    }
    return self;
}
- (void)setFrameSize:(NSSize)size {
    [super setFrameSize:size];
    [self layout];
}
- (void)drawRect:(NSRect)dirtyRect {
    [super drawRect:dirtyRect];
    NSDictionary *appearance = self.state[@"appearance"] ?: @{};
    [SDColor(appearance[@"backgroundColor"], [appearance[@"backgroundOpacity"] doubleValue] / 100.0) setFill];
    NSRectFillUsingOperation(self.bounds, NSCompositingOperationSourceOver);
}
- (void)emit:(NSString *)action task:(NSString *)task {
    NSDictionary *detail = task ? @{@"action": action, @"taskId": task} : @{@"action": action};
    NSData *data = [NSJSONSerialization dataWithJSONObject:detail options:0 error:nil];
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    NSString *script = [NSString stringWithFormat:@"window.dispatchEvent(new CustomEvent('semidone-native-zen',{detail:%@}))", json];
    [self.webview evaluateJavaScript:script completionHandler:nil];
}
- (void)clicked:(NSButton *)button {
    NSString *action = button.identifier;
    if ([action isEqualToString:@"task"]) {
        if (!button.enabled) return;
        // Lock the current native controls before the asynchronous WebView
        // callback. The next store snapshot decides when they become usable.
        for (NSView *row in self.document.subviews) for (NSView *control in row.subviews) {
            if ([control isKindOfClass:NSButton.class]) ((NSButton *)control).enabled = NO;
        }
        [self emit:action task:objc_getAssociatedObject(button, &SDTaskKey)];
    }
    else [self emit:action task:nil];
}
- (void)mouseDown:(NSEvent *)event {
    NSPoint point = [self convertPoint:event.locationInWindow fromView:nil];
    if (point.y < 42) [self.window performWindowDragWithEvent:event];
    else [super mouseDown:event];
}
- (NSButton *)button:(NSString *)identifier symbol:(NSString *)symbol label:(NSString *)label color:(NSColor *)color {
    NSButton *button = [NSButton buttonWithTitle:@"" target:self action:@selector(clicked:)];
    button.identifier = identifier;
    button.bordered = NO;
    button.image = [NSImage imageWithSystemSymbolName:symbol accessibilityDescription:label];
    button.contentTintColor = color;
    button.toolTip = label;
    [button setAccessibilityLabel:label];
    return button;
}
- (void)apply:(NSDictionary *)state {
    self.state = state;
    NSDictionary *appearance = state[@"appearance"] ?: @{};
    NSColor *text = SDColor(appearance[@"textColor"], 1);
    self.heading.textColor = text;
    [self.toolbar makeObjectsPerformSelector:@selector(removeFromSuperview)];
    [self.toolbar removeAllObjects];
    NSArray *ids = @[@"settings", @"pin", @"exit", @"close"];
    NSArray *symbols = @[@"paintpalette", [state[@"pinned"] boolValue] ? @"pin.fill" : @"pin", @"moon", @"xmark"];
    NSArray *labels = @[@"Zen 模式配置", [state[@"pinned"] boolValue] ? @"取消置顶" : @"置顶窗口", @"返回完整模式", @"关闭应用"];
    for (NSUInteger i = 0; i < ids.count; i++) {
        NSButton *button = [self button:ids[i] symbol:symbols[i] label:labels[i] color:text];
        NSDictionary *icons = [state[@"toolbarIcons"] isKindOfClass:NSDictionary.class] ? state[@"toolbarIcons"] : @{};
        NSString *source = i == 0 ? icons[@"settings"] : i == 1 ? icons[[state[@"pinned"] boolValue] ? @"pin" : @"pinOff"] : i == 2 ? state[@"exitIcon"] : nil;
        if ([source isKindOfClass:NSString.class]) {
            NSString *svg = [source stringByReplacingOccurrencesOfString:@"currentColor" withString:@"#000000"];
            NSImage *icon = [[NSImage alloc] initWithData:[svg dataUsingEncoding:NSUTF8StringEncoding]];
            if (icon) { icon.template = YES; icon.size = NSMakeSize(i == 2 ? 20 : 16, i == 2 ? 20 : 16); button.image = icon; }
        }
        [self.toolbar addObject:button]; [self addSubview:button];
    }
    BOOL hadRows = self.document.subviews.count > 0;
    CGFloat previousTop = MAX(0, NSMinY(self.scroll.documentVisibleRect));
    [self.document.subviews makeObjectsPerformSelector:@selector(removeFromSuperview)];
    NSArray *tasks = [state[@"tasks"] isKindOfClass:NSArray.class] ? state[@"tasks"] : @[];
    // The frontend already applies the 90–130% interface scale to 12–28px text.
    CGFloat fontSize = MAX(12 * .9, MIN(28 * 1.3, [appearance[@"fontSize"] doubleValue]));
    CGFloat width = MAX(1, self.bounds.size.width - 18);
    self.contentWidth = width;
    CGFloat y = 0;
    for (NSDictionary *task in tasks) {
        NSString *title = [task[@"title"] isKindOfClass:NSString.class] ? task[@"title"] : @"";
        NSTextField *label = [NSTextField wrappingLabelWithString:title];
        label.font = [NSFont systemFontOfSize:fontSize]; label.textColor = text;
        if ([task[@"done"] boolValue]) {
            label.attributedStringValue = [[NSAttributedString alloc] initWithString:title attributes:@{
                NSFontAttributeName: label.font, NSForegroundColorAttributeName: text,
                NSStrikethroughStyleAttributeName: @(NSUnderlineStyleSingle)
            }];
        }
        BOOL recurring = [task[@"recurring"] boolValue];
        CGFloat titleX = recurring ? 58 : 39;
        CGFloat textWidth = MAX(30, width - titleX - 16);
        CGFloat textHeight = ceil([title boundingRectWithSize:NSMakeSize(textWidth, CGFLOAT_MAX)
            options:NSStringDrawingUsesLineFragmentOrigin attributes:@{NSFontAttributeName: label.font}].size.height);
        CGFloat height = MAX(36, textHeight + 16);
        NSView *row = [[NSView alloc] initWithFrame:NSMakeRect(0, y, width, height)];
        row.wantsLayer = YES; row.layer.cornerRadius = 10;
        row.layer.backgroundColor = SDColor(appearance[@"rowColor"], [appearance[@"rowOpacity"] doubleValue] / 100.0).CGColor;
        NSButton *check = [self button:@"task" symbol:[task[@"done"] boolValue] ? @"checkmark.square" : @"square" label:[@"完成：" stringByAppendingString:title] color:text];
        objc_setAssociatedObject(check, &SDTaskKey, task[@"id"], OBJC_ASSOCIATION_COPY_NONATOMIC);
        check.enabled = ![task[@"busy"] boolValue];
        check.frame = NSMakeRect(6, (height - 28) / 2, 28, 28);
        label.frame = NSMakeRect(titleX, (height - textHeight) / 2, textWidth, textHeight);
        if (recurring) {
            NSImageView *repeat = [[NSImageView alloc] initWithFrame:NSMakeRect(38, (height - 14) / 2, 14, 14)];
            repeat.image = [NSImage imageWithSystemSymbolName:@"repeat" accessibilityDescription:@"周期待办"];
            repeat.contentTintColor = [text colorWithAlphaComponent:.7];
            repeat.toolTip = @"周期待办";
            [repeat setAccessibilityLabel:@"周期待办"];
            [row addSubview:repeat];
        }
        [row addSubview:check]; [row addSubview:label]; [self.document addSubview:row];
        if ([task[@"done"] boolValue] && [state[@"motion"] boolValue]) {
            CABasicAnimation *fly = [CABasicAnimation animationWithKeyPath:@"transform.translation.x"];
            fly.fromValue = @0; fly.toValue = @45; fly.duration = .38;
            CABasicAnimation *fade = [CABasicAnimation animationWithKeyPath:@"opacity"];
            fade.fromValue = @1; fade.toValue = @0; fade.duration = .38;
            [row.layer addAnimation:fly forKey:@"zen-completion-fly"];
            [row.layer addAnimation:fade forKey:@"zen-completion-fade"];
        }
        y += height + MAX(4, fontSize * .28);
    }
    if (!tasks.count) {
        NSTextField *empty = [NSTextField labelWithString:[state[@"loading"] boolValue] ? @"正在加载待办…" : @"没有未完成的待办"];
        empty.textColor = [text colorWithAlphaComponent:.7];
        empty.alignment = NSTextAlignmentCenter;
        empty.frame = NSMakeRect(0, 10, width, 24);
        [self.document addSubview:empty];
        y = 44;
    }
    CGFloat docHeight = MAX(y, self.scroll.contentSize.height);
    self.document.frame = NSMakeRect(0, 0, width, docHeight);
    [self.document scrollPoint:NSMakePoint(0, hadRows ? MIN(previousTop, MAX(0, docHeight - self.scroll.contentSize.height)) : 0)];
    [self setNeedsDisplay:YES]; [self setNeedsLayout:YES];
}
- (void)layout {
    [super layout];
    CGFloat width = self.bounds.size.width;
    self.heading.frame = NSMakeRect(12, 12, MAX(0, width - 140), 18);
    for (NSUInteger i = 0; i < self.toolbar.count; i++) self.toolbar[i].frame = NSMakeRect(width - 120 + i * 28, 6, 27, 27);
    self.scroll.frame = NSMakeRect(9, 42, MAX(0, width - 18), MAX(0, self.bounds.size.height - 51));
    if (self.state && fabs(self.contentWidth - MAX(1, width - 18)) > .5) [self apply:self.state];
}
@end

bool semidone_set_zen_panel(void *pointer, const char *json) {
    NSCAssert(NSThread.isMainThread, @"Zen panel requires main thread");
    WKWebView *webview = (__bridge WKWebView *)pointer;
    NSWindow *window = webview.window;
    if (!window || !window.contentView || window.contentView == webview) return false;
    SDZenPanel *panel = objc_getAssociatedObject(window, &SDZenKey);
    if (!json) {
        [panel removeFromSuperview];
        webview.hidden = NO;
        objc_setAssociatedObject(window, &SDZenKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        return true;
    }
    NSData *data = [[NSString stringWithUTF8String:json] dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *state = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    if (![state isKindOfClass:NSDictionary.class]) return false;
    if (!panel) {
        panel = [[SDZenPanel alloc] initWithFrame:window.contentView.bounds];
        panel.webview = webview;
        objc_setAssociatedObject(window, &SDZenKey, panel, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        [window.contentView addSubview:panel positioned:NSWindowAbove relativeTo:nil];
        [window makeFirstResponder:panel];
    }
    [panel apply:state];
    webview.hidden = YES;
    return true;
}
