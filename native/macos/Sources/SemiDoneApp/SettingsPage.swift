import SwiftUI
import AppKit
import UniformTypeIdentifiers
import SemiDoneCore

struct SettingsPage: View {
    @ObservedObject var controller: WindowController
    @EnvironmentObject private var store: TaskStore
    @State private var importURL: URL?
    @State private var confirmImport = false
    @State private var notice: String?
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                SectionHeading(eyebrow: "MAKE IT YOURS", title: "适合你的样子", subtitle: "少一些打扰，多一点从容。")
                section("外观", symbol: "paintpalette") {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("主题").font(.system(size: 12))
                        Picker("主题", selection: binding(\.theme)) { ForEach(AppTheme.allCases) { Text($0.label).tag($0) } }.pickerStyle(.segmented).labelsHidden()
                        Divider().opacity(0.5)
                        Toggle("界面动效", isOn: binding(\.animationsEnabled))
                        Text("开启动效后，图标反馈、页面与窗口过渡才会播放。").font(.system(size: 10)).foregroundStyle(.secondary)
                        Toggle("液态玻璃", isOn: binding(\.glassEnabled))
                        Text("使用 macOS 原生玻璃材质，文字保持清晰。").font(.system(size: 10)).foregroundStyle(.secondary)
                    }
                }
                section("窗口", symbol: "macwindow") {
                    VStack(alignment: .leading, spacing: 14) {
                        Toggle("始终置顶", isOn: binding(\.alwaysOnTop))
                        Text("显示在全屏应用上方。置顶期间隐藏 Dock 图标，可通过菜单栏恢复窗口。").font(.system(size: 10)).foregroundStyle(.secondary)
                        Divider().opacity(0.5)
                        Toggle("关闭时隐藏到菜单栏", isOn: binding(\.closeToHide))
                        HStack { Text("全屏"); Spacer(); Button("切换全屏") { controller.toggleFullScreen() }.controlSize(.small) }
                    }
                }
                section("数据", symbol: "externaldrive") {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("原生版数据保存在本机，与 Tauri 版分开存储。").font(.system(size: 11)).foregroundStyle(.secondary)
                        ViewThatFits(in: .horizontal) {
                            HStack { dataButtons }
                            VStack(alignment: .leading, spacing: 10) { dataButtons }
                        }
                        if let notice { Text(notice).font(.system(size: 10)).foregroundStyle(.secondary) }
                    }
                }
                section("关于", symbol: "info.circle") {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("SemiDone Native").font(.system(size: 15, weight: .semibold))
                        Text("Swift / SwiftUI · 原生基础版").font(.system(size: 11)).foregroundStyle(.secondary)
                        Text("Apple 芯片 · macOS 26 及更新版本").font(.system(size: 10)).foregroundStyle(.secondary)
                        Link("GitHub 项目", destination: URL(string: "https://github.com/zzephyrxx/SemiDone")!).font(.system(size: 11))
                    }
                }
            }.padding(22).frame(maxWidth: 900).frame(maxWidth: .infinity)
        }.toggleStyle(.switch).confirmationDialog("合并原生版备份中的待办？", isPresented: $confirmImport, titleVisibility: .visible) {
            Button("合并待办") { if let importURL { do { try store.importData(from: importURL); notice = "待办已合并，现有任务与设置已保留。" } catch { notice = "导入失败：\(error.localizedDescription)" } } }
            Button("取消", role: .cancel) { importURL = nil }
        } message: { Text("只添加尚不存在的任务，不删除现有待办。支持本原生版导出的 JSON 备份。") }
    }
    @ViewBuilder private var dataButtons: some View {
        Button("导出备份", systemImage: "square.and.arrow.up") { export() }
        Button("导入备份", systemImage: "square.and.arrow.down") { selectImport() }
        Button("打开数据目录", systemImage: "folder") {
            do { try FileManager.default.createDirectory(at: JSONStorage.applicationURL.deletingLastPathComponent(), withIntermediateDirectories: true); NSWorkspace.shared.open(JSONStorage.applicationURL.deletingLastPathComponent()) }
            catch { notice = error.localizedDescription }
        }
    }
    private func binding<Value>(_ keyPath: WritableKeyPath<Preferences, Value>) -> Binding<Value> {
        Binding(get: { store.preferences[keyPath: keyPath] }, set: { value in controller.updatePreference { $0[keyPath: keyPath] = value } })
    }
    private func section<Content: View>(_ title: String, symbol: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 16) { Label(title, systemImage: symbol).font(.system(size: 12, weight: .semibold)).foregroundStyle(.secondary); content().font(.system(size: 12)) }.frame(maxWidth: .infinity, alignment: .leading).padding(18).background(Color.cardBackground, in: .rect(cornerRadius: 20))
    }
    private func export() {
        let panel = NSSavePanel(); panel.allowedContentTypes = [.json]; panel.nameFieldStringValue = "SemiDone-Native-\(dayKey(Date())).json"
        panel.beginSheetModal(for: controller.window) { response in
            guard response == .OK, let url = panel.url else { return }
            do { try store.exportData(to: url); notice = "备份已保存。" } catch { notice = "导出失败：\(error.localizedDescription)" }
        }
    }
    private func selectImport() {
        let panel = NSOpenPanel(); panel.allowedContentTypes = [.json]; panel.allowsMultipleSelection = false; panel.canChooseDirectories = false
        panel.beginSheetModal(for: controller.window) { response in
            guard response == .OK, let url = panel.url else { return }; importURL = url; confirmImport = true
        }
    }
}
