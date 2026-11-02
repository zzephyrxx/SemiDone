import SwiftUI
import AppKit
import SemiDoneCore

struct RootView: View {
    @ObservedObject var controller: WindowController
    @EnvironmentObject private var store: TaskStore
    private var scheme: ColorScheme? { store.preferences.theme == .system ? nil : store.preferences.theme == .dark ? .dark : .light }
    var body: some View {
        Group {
            if controller.mode == .floating { FloatingBallView(controller: controller) }
            else {
                GeometryReader { geometry in
                    VStack(spacing: 0) {
                        titlebar
                        if let message = store.errorMessage {
                            HStack(alignment: .top) { Image(systemName: "exclamationmark.triangle"); Text(message).textSelection(.enabled)
                                Spacer(minLength: 4)
                                if store.isReadOnly { Button("重试") { store.reload() } }
                                else { Button("关闭") { store.errorMessage = nil } }
                            }.font(.system(size: 11)).padding(12).foregroundStyle(.orange)
                        }
                        if controller.mode == .zen { ZenView(controller: controller) }
                        else if geometry.size.width >= 780 {
                            HStack(alignment: .top, spacing: 0) { navigation(vertical: true).frame(width: 126).padding(.leading, 14).padding(.top, 16); pageContent }
                        } else {
                            navigation(vertical: false).padding(.horizontal, 20).padding(.vertical, 10)
                            pageContent
                        }
                    }
                }
                .background(Color.pageBackground.opacity(store.preferences.glassEnabled ? 0.93 : 1))
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .overlay { RoundedRectangle(cornerRadius: 20).strokeBorder(.primary.opacity(0.08), lineWidth: 1).allowsHitTesting(false) }
            }
        }
        .ignoresSafeArea()
        .environment(\.locale, Locale(identifier: "zh_CN"))
        .preferredColorScheme(scheme)
        .tint(.blue)
        .sheet(isPresented: $controller.showingNewTask) { TaskEditorView(store: store, dueDate: controller.newTaskDate).environmentObject(store) }
        .sheet(item: $controller.editor) { task in TaskEditorView(store: store, task: task).environmentObject(store) }
    }
    private var titlebar: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 16)).foregroundStyle(.blue)
            DragBrand().frame(minWidth: 92, maxWidth: .infinity, minHeight: 42, maxHeight: 42)
            IconButton(symbol: "minus", label: "折叠为悬浮球") { controller.collapse() }
            IconButton(symbol: store.preferences.alwaysOnTop ? "pin.fill" : "pin", label: store.preferences.alwaysOnTop ? "取消置顶" : "始终置顶", selected: store.preferences.alwaysOnTop) { controller.togglePin() }
            IconButton(symbol: controller.mode == .zen ? "moon.fill" : "moon", label: controller.mode == .zen ? "退出 Zen 模式" : "进入 Zen 模式", selected: controller.mode == .zen) { controller.toggleZen() }
            IconButton(symbol: "xmark", label: "关闭窗口") { controller.hideWindow() }
        }.padding(.horizontal, 16).padding(.top, 4)
    }
    @ViewBuilder private var pageContent: some View {
        Group {
            switch controller.page {
            case .tasks: TasksView(controller: controller)
            case .calendar: CalendarPage(controller: controller)
            case .statistics: StatisticsPage(clock: controller.focus)
            case .settings: SettingsPage(controller: controller)
            }
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    @ViewBuilder private func navigation(vertical: Bool) -> some View {
        let layout = vertical ? AnyLayout(VStackLayout(alignment: .leading, spacing: 5)) : AnyLayout(HStackLayout(spacing: 4))
        layout {
            ForEach(Page.allCases) { page in
                Button {
                    withAnimation(controller.motion) { controller.page = page }
                } label: {
                    HStack(spacing: 7) { AppSymbol(name: page.symbol); Text(page.title).font(.system(size: 12, weight: controller.page == page ? .semibold : .regular)) }
                        .frame(maxWidth: .infinity, alignment: vertical ? .leading : .center).padding(.horizontal, vertical ? 12 : 8).padding(.vertical, 10)
                        .foregroundStyle(controller.page == page ? Color.white : .secondary)
                        .background(controller.page == page ? Color.blue : .clear, in: .rect(cornerRadius: 12))
                        .contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityAddTraits(controller.page == page ? .isSelected : [])
            }
        }.padding(5).glassCard(radius: 17)
    }
}
struct FloatingBallView: View {
    @ObservedObject var controller: WindowController
    @EnvironmentObject private var store: TaskStore
    var body: some View {
        Button { controller.restore() } label: {
            ZStack {
                Circle().fill(Color.blue.gradient)
                Image(systemName: "checkmark").font(.system(size: 22, weight: .semibold)).foregroundStyle(.white)
                let count = store.tasks.filter { !$0.isCompleted }.count
                if count > 0 { Text("\(min(count, 99))").font(.system(size: 8, weight: .bold)).foregroundStyle(.blue).padding(3).background(.white, in: .circle).offset(x: 17, y: -17) }
            }.frame(width: 52, height: 52).contentShape(Circle())
        }.buttonStyle(.plain).accessibilityLabel("展开 SemiDone").help("点击展开，按住周围空白可拖动")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .overlay(BallPointerArea(onClick: { controller.restore() })).contextMenu { Button("显示窗口") { controller.showWindow() }; Button("退出") { NSApp.terminate(nil) } }
    }
}
struct BallPointerArea: NSViewRepresentable {
    var onClick: () -> Void
    func makeNSView(context: Context) -> BallView { let view = BallView(); view.onClick = onClick; return view }
    func updateNSView(_ nsView: BallView, context: Context) { nsView.onClick = onClick }
    final class BallView: NSView {
        var onClick: (() -> Void)?
        override func mouseDown(with event: NSEvent) {
            let origin = event.locationInWindow
            while let next = window?.nextEvent(matching: [.leftMouseDragged, .leftMouseUp]) {
                if next.type == .leftMouseUp { onClick?(); return }
                let point = next.locationInWindow
                if hypot(point.x - origin.x, point.y - origin.y) > 4 {
                    window?.performDrag(with: next); return
                }
            }
        }
    }
}
