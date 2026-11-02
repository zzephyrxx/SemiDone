import AppKit
import SwiftUI
import Combine
import SemiDoneCore

@main enum SemiDoneLauncher {
    @MainActor static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.run()
        withExtendedLifetime(delegate) {}
    }
}
@MainActor final class AppDelegate: NSObject, NSApplicationDelegate {
    var controller: WindowController?
    func applicationDidFinishLaunching(_ notification: Notification) {
        if let bundleID = Bundle.main.bundleIdentifier,
           let existing = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).first(where: { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }) {
            DistributedNotificationCenter.default().postNotificationName(.init("com.semidone.native.showWindow"), object: nil, userInfo: nil, deliverImmediately: true)
            existing.activate(options: [])
            NSApp.terminate(nil); return
        }
        let store: TaskStore
        if let index = CommandLine.arguments.firstIndex(of: "--data-file"), CommandLine.arguments.count > index + 1 {
            store = TaskStore(storage: JSONStorage(fileURL: URL(fileURLWithPath: CommandLine.arguments[index + 1])))
        } else { store = TaskStore() }
        controller = WindowController(store: store)
        controller?.start()
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { controller?.showWindow(); return true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func applicationWillTerminate(_ notification: Notification) { controller?.flushUsage() }
}
final class FloatingPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}
enum Page: String, CaseIterable, Identifiable {
    case tasks, calendar, statistics, settings
    var id: String { rawValue }
    var title: String { switch self { case .tasks: "待办"; case .calendar: "日历"; case .statistics: "统计"; case .settings: "设置" } }
    var symbol: String { switch self { case .tasks: "checklist"; case .calendar: "calendar"; case .statistics: "chart.xyaxis.line"; case .settings: "slider.horizontal.3" } }
}
enum WindowMode { case expanded, zen, floating }
@MainActor final class WindowController: NSObject, ObservableObject, NSWindowDelegate {
    let store: TaskStore
    let focus = FocusClock()
    @Published var page: Page = .tasks
    @Published var mode: WindowMode = .expanded
    @Published var editor: Todo?
    @Published var showingNewTask = false
    @Published var newTaskDate: Date?
    private(set) var window: NSWindow
    private var panel: FloatingPanel!
    private var hideAfterFullScreenExit = false
    private var expandedFrame: NSRect?
    private var beforeFloat: WindowMode = .expanded
    private var statusItem: NSStatusItem?
    private var settingsObserver: AnyCancellable?
    private var usageTimer: Timer?
    private var activeSince: Date?
    private var ownFullScreen = false

    init(store: TaskStore) {
        self.store = store
        let panel = FloatingPanel(contentRect: NSRect(x: 0, y: 0, width: 550, height: 780),
                               styleMask: [.titled, .resizable, .closable, .miniaturizable, .fullSizeContentView, .nonactivatingPanel],
                               backing: .buffered, defer: false)
        window = panel
        self.panel = panel
        super.init()
        window.title = "SemiDone Native"; window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true; window.titlebarSeparatorStyle = .none; window.isOpaque = false; window.backgroundColor = .clear
        window.hasShadow = true; panel.hidesOnDeactivate = false; panel.isFloatingPanel = true
        window.isReleasedWhenClosed = false; window.delegate = self
        window.contentMinSize = NSSize(width: 400, height: 500)
        window.animationBehavior = .utilityWindow
        for button in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] { window.standardWindowButton(button)?.isHidden = true }
        window.contentView = NSHostingView(rootView: RootView(controller: self).environmentObject(store))
        window.center()
        settingsObserver = store.$snapshot.map(\.preferences).removeDuplicates().sink { [weak self] _ in
            DispatchQueue.main.async { self?.configureWindow() }
        }
        focus.onComplete = { [weak store] in store?.completeFocus() }
    }
    func start() {
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(showWindow), name: .init("com.semidone.native.showWindow"), object: nil)
        configureMenu(); configureStatusItem(); configureWindow(); showWindow()
        usageTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.flushUsage() }
        }
    }
    func configureWindow() {
        let pinned = store.preferences.alwaysOnTop && !ownFullScreen
        window.level = pinned ? NSWindow.Level(rawValue: 1000) : .normal
        window.collectionBehavior = pinned ? [.canJoinAllSpaces, .canJoinAllApplications, .fullScreenAuxiliary, .stationary] : [.managed, .fullScreenPrimary]
        NSApp.setActivationPolicy(pinned ? .accessory : .regular)
        window.appearance = store.preferences.theme == .system ? nil : NSAppearance(named: store.preferences.theme == .dark ? .darkAqua : .aqua)
    }
    @objc func showWindow() {
        if mode == .floating { restore() }
        configureWindow()
        if let screen = window.screen ?? NSScreen.main, !screen.visibleFrame.intersects(window.frame) { window.center() }
        window.makeKeyAndOrderFront(nil)
        if !store.preferences.alwaysOnTop { NSApp.activate(ignoringOtherApps: true) }
    }
    func hideWindow() {
        flushUsage(); activeSince = nil
        if !store.preferences.closeToHide { NSApp.terminate(nil); return }
        if ownFullScreen {
            hideAfterFullScreenExit = true
            window.toggleFullScreen(nil)
        } else { window.orderOut(nil) }
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool { hideWindow(); return false }
    func windowDidBecomeKey(_ notification: Notification) { activeSince = Date() }
    func windowDidResignKey(_ notification: Notification) { flushUsage(); activeSince = nil }
    func flushUsage() {
        guard let start = activeSince else { return }
        let now = Date()
        // A delayed timer after sleep never credits the entire sleep interval.
        let elapsed = now.timeIntervalSince(start)
        if elapsed > 120 { activeSince = now; return }
        let minutes = Int(elapsed / 60)
        guard minutes > 0 else { return }
        for minute in 0..<minutes { store.recordUsage(minutes: 1, date: start.addingTimeInterval(Double(minute) * 60 + 30)) }
        activeSince = start.addingTimeInterval(Double(minutes) * 60)
    }
    func updatePreference(_ change: (inout Preferences) -> Void) {
        var prefs = store.preferences; change(&prefs); _ = store.setPreferences(prefs)
    }
    func togglePin() { updatePreference { $0.alwaysOnTop.toggle() } }
    func toggleZen() {
        if mode == .floating { restore() }
        withAnimation(motion) { mode = mode == .zen ? .expanded : .zen }
        window.contentMinSize = mode == .zen ? NSSize(width: 300, height: 250) : NSSize(width: 400, height: 500)
        if mode == .expanded && window.frame.height < 500 { resize(to: NSSize(width: max(window.frame.width, 400), height: 600)) }
    }
    var motion: Animation? { store.preferences.animationsEnabled ? .spring(response: 0.32, dampingFraction: 0.88) : nil }
    func collapse() {
        guard !ownFullScreen else { return }
        expandedFrame = window.frame; beforeFloat = mode
        window.styleMask.remove([.titled, .resizable, .closable, .miniaturizable])
        window.contentMinSize = NSSize(width: 56, height: 56)
        withAnimation(motion) { mode = .floating }
        resize(to: NSSize(width: 64, height: 64))
    }
    func restore() {
        guard mode == .floating else { return }
        window.styleMask.insert([.titled, .resizable, .closable, .miniaturizable])
        window.titleVisibility = .hidden; window.titlebarAppearsTransparent = true; window.titlebarSeparatorStyle = .none
        for button in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] { window.standardWindowButton(button)?.isHidden = true }
        let old = expandedFrame ?? NSRect(x: window.frame.minX, y: window.frame.maxY - 780, width: 550, height: 780)
        let size = old.size
        withAnimation(motion) { mode = beforeFloat }
        window.contentMinSize = mode == .zen ? NSSize(width: 300, height: 250) : NSSize(width: 400, height: 500)
        resize(to: size)
    }
    private func resize(to size: NSSize) {
        let frame = window.frame
        var target = NSRect(x: frame.minX, y: frame.maxY - size.height, width: size.width, height: size.height)
        if let screen = window.screen ?? NSScreen.main {
            let bounds = screen.visibleFrame
            target.origin.x = max(bounds.minX, min(bounds.maxX - size.width, target.minX))
            target.origin.y = max(bounds.minY, min(bounds.maxY - size.height, target.minY))
        }
        NSAnimationContext.runAnimationGroup { context in
            context.duration = store.preferences.animationsEnabled ? 0.28 : 0
            window.animator().setFrame(target, display: true)
        }
    }
    @objc func toggleFullScreen() {
        if mode == .floating { restore() }
        if ownFullScreen { window.toggleFullScreen(nil); return }
        // NSPanel is retained for other apps' full-screen Spaces. A standard
        // NSWindow hosts the same SwiftUI view when this app enters full screen.
        // Moving the hosting view preserves page, form and navigation state.
        let fullScreenWindow = NSWindow(contentRect: panel.frame,
            styleMask: [.titled, .resizable, .closable, .miniaturizable, .fullSizeContentView], backing: .buffered, defer: false)
        fullScreenWindow.title = "SemiDone Native"
        fullScreenWindow.titleVisibility = .hidden; fullScreenWindow.titlebarAppearsTransparent = true
        fullScreenWindow.titlebarSeparatorStyle = .none
        fullScreenWindow.isReleasedWhenClosed = false
        fullScreenWindow.isOpaque = false; fullScreenWindow.backgroundColor = .clear
        fullScreenWindow.contentMinSize = NSSize(width: 400, height: 500)
        fullScreenWindow.setFrame(panel.frame, display: false)
        fullScreenWindow.delegate = self
        for button in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] { fullScreenWindow.standardWindowButton(button)?.isHidden = true }
        let content = panel.contentView
        panel.contentView = nil; panel.orderOut(nil)
        fullScreenWindow.contentView = content
        window = fullScreenWindow; ownFullScreen = true; configureWindow()
        NSApp.activate(ignoringOtherApps: true)
        fullScreenWindow.makeKeyAndOrderFront(nil)
        fullScreenWindow.toggleFullScreen(nil)
    }
    private func restorePanelAfterFullScreen() {
        guard ownFullScreen else { return }
        let fullScreenWindow = window
        let content = fullScreenWindow.contentView
        fullScreenWindow.contentView = nil; fullScreenWindow.delegate = nil; fullScreenWindow.close()
        panel.contentView = content; window = panel; ownFullScreen = false; configureWindow()
        if !hideAfterFullScreenExit { panel.makeKeyAndOrderFront(nil) }
        hideAfterFullScreenExit = false
    }
    func windowDidExitFullScreen(_ notification: Notification) { restorePanelAfterFullScreen() }
    func windowDidFailToEnterFullScreen(_ window: NSWindow) { restorePanelAfterFullScreen() }
    @objc private func closeFromMenu() { hideWindow() }
    @objc private func addFromMenu() { showWindow(); newTaskDate = nil; showingNewTask = true }
    @objc private func settingsFromMenu() { showWindow(); page = .settings }
    @objc private func statusClicked() {
        guard let button = statusItem?.button else { return }
        if NSApp.currentEvent?.type == .rightMouseUp {
            let menu = NSMenu()
            menu.addItem(withTitle: "显示窗口", action: #selector(showWindow), keyEquivalent: "").target = self
            menu.addItem(.separator())
            menu.addItem(withTitle: "退出 SemiDone", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
            statusItem?.menu = menu; button.performClick(nil); statusItem?.menu = nil
        } else { showWindow() }
    }
    private func configureStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        item.button?.image = NSImage(systemSymbolName: "checklist", accessibilityDescription: "SemiDone Native")
        item.button?.image?.isTemplate = true
        item.button?.target = self; item.button?.action = #selector(statusClicked)
        item.button?.sendAction(on: [.leftMouseUp, .rightMouseUp]); item.button?.toolTip = "SemiDone Native"
        statusItem = item
    }
    private func configureMenu() {
        let menu = NSMenu()
        let app = NSMenuItem(); menu.addItem(app); let appMenu = NSMenu(); app.submenu = appMenu
        appMenu.addItem(withTitle: "设置…", action: #selector(settingsFromMenu), keyEquivalent: ",").target = self
        appMenu.addItem(.separator()); appMenu.addItem(withTitle: "退出 SemiDone", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let file = NSMenuItem(title: "文件", action: nil, keyEquivalent: ""); menu.addItem(file); let fileMenu = NSMenu(title: "文件"); file.submenu = fileMenu
        fileMenu.addItem(withTitle: "新建待办", action: #selector(addFromMenu), keyEquivalent: "n").target = self
        fileMenu.addItem(withTitle: "关闭窗口", action: #selector(closeFromMenu), keyEquivalent: "w").target = self
        let edit = NSMenuItem(title: "编辑", action: nil, keyEquivalent: ""); menu.addItem(edit); let editMenu = NSMenu(title: "编辑"); edit.submenu = editMenu
        for (title, action, key) in [("撤销", "undo:", "z"), ("剪切", "cut:", "x"), ("拷贝", "copy:", "c"), ("粘贴", "paste:", "v"), ("全选", "selectAll:", "a")] {
            editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        let view = NSMenuItem(title: "窗口", action: nil, keyEquivalent: ""); menu.addItem(view); let viewMenu = NSMenu(title: "窗口"); view.submenu = viewMenu
        let fullScreen = viewMenu.addItem(withTitle: "切换全屏", action: #selector(toggleFullScreen), keyEquivalent: "f"); fullScreen.target = self; fullScreen.keyEquivalentModifierMask = [.control, .command]
        NSApp.mainMenu = menu
    }
}
@MainActor final class FocusClock: ObservableObject {
    @Published var remaining = 25 * 60
    @Published var running = false
    var onComplete: (() -> Void)?
    private var end: Date?
    private var timer: Timer?
    func toggle() {
        if running { tick(); running = false; timer?.invalidate(); timer = nil; end = nil }
        else {
            if remaining <= 0 { remaining = 25 * 60 }
            running = true; end = Date().addingTimeInterval(Double(remaining))
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in Task { @MainActor in self?.tick() } }
        }
    }
    private func tick() {
        guard let end else { return }
        remaining = max(0, Int(ceil(end.timeIntervalSinceNow)))
        if remaining == 0 { running = false; timer?.invalidate(); timer = nil; self.end = nil; onComplete?(); NSSound.beep() }
    }
    func reset() { timer?.invalidate(); timer = nil; running = false; end = nil; remaining = 25 * 60 }
    var display: String { String(format: "%02d:%02d", remaining / 60, remaining % 60) }
}
