import SwiftUI
import AppKit
import SemiDoneCore

extension Color {
    static let pageBackground = Color(nsColor: NSColor(name: nil) { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            ? NSColor(calibratedWhite: 0.075, alpha: 1)
            : NSColor(calibratedRed: 0.952, green: 0.962, blue: 0.977, alpha: 1)
    })
    static let cardBackground = Color(nsColor: .controlBackgroundColor)
}
struct GlassCard: ViewModifier {
    @EnvironmentObject private var store: TaskStore
    var radius: CGFloat = 20
    func body(content: Content) -> some View {
        content.background {
            if store.preferences.glassEnabled {
                RoundedRectangle(cornerRadius: radius).fill(.clear).glassEffect(.regular, in: .rect(cornerRadius: radius))
            } else { RoundedRectangle(cornerRadius: radius).fill(Color.cardBackground) }
        }
    }
}
extension View {
    func glassCard(radius: CGFloat = 20) -> some View { modifier(GlassCard(radius: radius)) }
}
struct AppSymbol: View {
    @EnvironmentObject private var store: TaskStore
    let name: String
    @State private var hovered = false
    var body: some View {
        if store.preferences.animationsEnabled {
            Image(systemName: name).symbolRenderingMode(.hierarchical)
                .symbolEffect(.bounce, options: .nonRepeating, value: hovered)
                .onHover { hovered = $0 }
        } else { Image(systemName: name).symbolRenderingMode(.hierarchical) }
    }
}
struct IconButton: View {
    let symbol: String
    let label: String
    var selected = false
    var action: () -> Void
    var body: some View {
        Button(action: action) { AppSymbol(name: symbol).font(.system(size: 13, weight: .medium)).frame(width: 30, height: 30)
                .foregroundStyle(selected ? Color.accentColor : Color.secondary)
                .background(selected ? Color.accentColor.opacity(0.12) : .clear, in: .rect(cornerRadius: 9)) }
            .buttonStyle(.plain).help(label).accessibilityLabel(label)
    }
}
struct DragBrand: NSViewRepresentable {
    func makeNSView(context: Context) -> BrandView { BrandView() }
    func updateNSView(_ nsView: BrandView, context: Context) {}
    final class BrandView: NSView {
        override var mouseDownCanMoveWindow: Bool { true }
        override func mouseDown(with event: NSEvent) { window?.performDrag(with: event) }
        override func draw(_ dirtyRect: NSRect) {
            let text = NSAttributedString(string: "SemiDone", attributes: [.font: NSFont.systemFont(ofSize: 14, weight: .semibold), .foregroundColor: NSColor.labelColor])
            text.draw(at: NSPoint(x: 0, y: (bounds.height - text.size().height) / 2))
        }
        override func accessibilityLabel() -> String? { "拖动 SemiDone 窗口" }
        override func isAccessibilityElement() -> Bool { true }
        override func accessibilityRole() -> NSAccessibility.Role? { .group }
    }
}
struct SectionHeading: View {
    var eyebrow: String = ""
    var title: String
    var subtitle: String = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !eyebrow.isEmpty { Text(eyebrow).font(.system(size: 9, weight: .semibold)).tracking(2).foregroundStyle(.secondary) }
            Text(title).font(.system(size: 23, weight: .semibold, design: .rounded)).tracking(-0.6)
            if !subtitle.isEmpty { Text(subtitle).font(.system(size: 11)).foregroundStyle(.secondary) }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
