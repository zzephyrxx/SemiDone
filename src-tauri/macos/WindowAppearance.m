#import <AppKit/AppKit.h>
#import <QuartzCore/QuartzCore.h>
#import <objc/runtime.h>
#import "WindowAppearance.generated.h"

// Parameters live in src/config/windowAppearance.json. Keep a single native
// mask: CSS must not round the opaque WebView a second time (it exposes white).
static void updateWindowShape(NSWindow *window) {
    NSView *content = window.contentView;
    if (!content) return;
    CGFloat width = NSWidth(content.bounds), height = NSHeight(content.bounds);
    CGFloat radius = SD_EXPANDED_RADIUS;
    if (width <= 80 && height <= 80) {
        radius = width <= 35 && height <= 35 ? SD_SNAPPED_RADIUS : SD_FLOATING_RADIUS;
    } else if (height <= 90) {
        radius = SD_BAR_RADIUS;
    }
    window.opaque = NO;
    window.backgroundColor = NSColor.clearColor;
    content.wantsLayer = YES;
    // Circular geometry matches rounded rectangles; no continuous/superellipse
    // curve and no automatic half-height radius for compact modes.
    content.layer.cornerRadius = 0;
    content.layer.masksToBounds = YES;
    CAShapeLayer *mask = [content.layer.mask isKindOfClass:CAShapeLayer.class]
        ? (CAShapeLayer *)content.layer.mask : [CAShapeLayer layer];
    CGRect bounds = content.layer.bounds;
    CGFloat inset = MIN(SD_CLIP_INSET, MIN(bounds.size.width, bounds.size.height) / 2);
    CGRect rect = CGRectInset(bounds, inset, inset);
    radius = MIN(radius, MIN(rect.size.width, rect.size.height) / 2);
    CGPathRef path = CGPathCreateWithRoundedRect(rect, radius, radius, NULL);
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    mask.frame = bounds;
    mask.contentsScale = window.backingScaleFactor;
    mask.path = path;
    content.layer.mask = mask;
    [CATransaction commit];
    CGPathRelease(path);
    [window invalidateShadow];
}

@interface SemiDoneWindowShape : NSObject
@property(nonatomic, strong) id resizeObserver;
@property(nonatomic) NSSize expansionSourceSize;
@property(nonatomic) CGFloat expansionSourceAlpha;
@property(nonatomic) BOOL expansionHidden;
@end

@implementation SemiDoneWindowShape
- (void)dealloc {
    if (_resizeObserver) [NSNotificationCenter.defaultCenter removeObserver:_resizeObserver];
}
@end

static char observerKey;

void semidone_install_window_shape(void *pointer) {
    NSCAssert(NSThread.isMainThread, @"Window appearance requires the main thread");
    NSWindow *window = (__bridge NSWindow *)pointer;
    if (!objc_getAssociatedObject(window, &observerKey)) {
        SemiDoneWindowShape *shape = [SemiDoneWindowShape new];
        __weak NSWindow *weakWindow = window;
        shape.resizeObserver = [NSNotificationCenter.defaultCenter
            addObserverForName:NSWindowDidResizeNotification object:window queue:nil
            usingBlock:^(NSNotification *note) {
                (void)note;
                updateWindowShape(weakWindow);
            }];
        objc_setAssociatedObject(window, &observerKey, shape, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    updateWindowShape(window);
}

// Render the destination layout while hidden, then reveal its native mask.
// The white compact WebView is never stretched across the expanded window.
void semidone_window_expansion(void *pointer, unsigned int phase, double durationMs) {
    NSCAssert(NSThread.isMainThread, @"Window expansion requires the main thread");
    NSWindow *window = (__bridge NSWindow *)pointer;
    NSView *content = window.contentView;
    SemiDoneWindowShape *shape = objc_getAssociatedObject(window, &observerKey);
    if (!content || !shape) return;
    if (phase == 0) {
        shape.expansionSourceSize = content.bounds.size;
        if (!shape.expansionHidden) shape.expansionSourceAlpha = window.alphaValue;
        shape.expansionHidden = YES;
        // Hide the complete window, including the WebView's opaque backing and
        // native shadow, while the destination renderer is being prepared.
        window.alphaValue = 0;
        [CATransaction begin];
        [CATransaction setDisableActions:YES];
        content.layer.opacity = 0;
        [CATransaction commit];
        return;
    }
    if (phase == 3) {
        // Gather both the opaque backing and its content toward the future
        // floating block, rather than leaving a full-size rectangle behind.
        CAShapeLayer *mask = (CAShapeLayer *)content.layer.mask;
        CGRect bounds = content.layer.bounds;
        CGFloat inset = SD_CLIP_INSET;
        CGRect target = CGRectMake(inset, inset, 60 - inset * 2, 60 - inset * 2);
        if (!content.layer.isGeometryFlipped) target.origin.y = CGRectGetMaxY(bounds) - target.size.height - inset;
        CGPathRef path = CGPathCreateWithRoundedRect(target, SD_FLOATING_RADIUS, SD_FLOATING_RADIUS, NULL);
        CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:@"path"];
        animation.fromValue = (__bridge id)mask.path;
        animation.toValue = (__bridge id)path;
        animation.duration = MIN(durationMs, 400) / 1000;
        animation.timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.55 :0.05 :0.85 :0.4];
        [CATransaction begin];
        [CATransaction setDisableActions:YES];
        mask.path = path;
        [mask addAnimation:animation forKey:@"SemiDoneCollapse"];
        [CATransaction commit];
        CGPathRelease(path);
        return;
    }
    updateWindowShape(window);
    CAShapeLayer *mask = (CAShapeLayer *)content.layer.mask;
    [mask removeAnimationForKey:@"SemiDoneExpand"];
    [mask removeAnimationForKey:@"SemiDoneCollapse"];
    if (phase == 4 && durationMs > 0) {
        // Track the opening logo instead of exposing the opaque WebView as a
        // full white rectangle before the first glass frame has grown.
        CGRect bounds = content.layer.bounds;
        CGRect from = CGRectMake(CGRectGetMidX(bounds), CGRectGetMidY(bounds), 0.01, 0.01);
        CGPathRef path = CGPathCreateWithEllipseInRect(from, NULL);
        CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:@"path"];
        animation.fromValue = (__bridge id)path;
        animation.toValue = (__bridge id)mask.path;
        animation.duration = MIN(durationMs, 400) / 1000;
        animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseOut];
        [mask addAnimation:animation forKey:@"SemiDoneExpand"];
        CGPathRelease(path);
    } else if (phase == 1 && durationMs > 0) {
        CGRect bounds = content.layer.bounds;
        CGFloat inset = SD_CLIP_INSET;
        NSSize source = shape.expansionSourceSize;
        CGRect from = CGRectMake(inset, inset,
            MAX(0, MIN(source.width, bounds.size.width) - inset * 2),
            MAX(0, MIN(source.height, bounds.size.height) - inset * 2));
        if (!content.layer.isGeometryFlipped) from.origin.y = CGRectGetMaxY(bounds) - from.size.height - inset;
        CGFloat radius = source.width <= 80 ? SD_FLOATING_RADIUS : SD_BAR_RADIUS;
        CGPathRef path = CGPathCreateWithRoundedRect(from, radius, radius, NULL);
        CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:@"path"];
        animation.fromValue = (__bridge id)path;
        animation.toValue = (__bridge id)mask.path;
        animation.duration = MIN(durationMs, 400) / 1000;
        animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseOut];
        [mask addAnimation:animation forKey:@"SemiDoneExpand"];
        CGPathRelease(path);
    }
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    content.layer.opacity = 1;
    [CATransaction commit];
    if (shape.expansionHidden) {
        window.alphaValue = shape.expansionSourceAlpha;
        shape.expansionHidden = NO;
    }
    [window invalidateShadow];
}
