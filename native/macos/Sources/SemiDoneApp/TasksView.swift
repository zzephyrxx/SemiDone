import SwiftUI
import SemiDoneCore

struct TasksView: View {
    @ObservedObject var controller: WindowController
    @EnvironmentObject private var store: TaskStore
    @State private var scope: TaskScope = .pending
    @State private var search = ""
    @State private var quickTitle = ""
    private var filtered: [Todo] { TaskQuery.filter(store.tasks, scope: scope, search: search) }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(alignment: .top) {
                    SectionHeading(eyebrow: Date().formatted(.dateTime.month(.wide).day().weekday(.wide)).uppercased(), title: "今天，也从容一点", subtitle: "把想做的事放在这里，一件一件来。")
                    Button { controller.newTaskDate = nil; controller.showingNewTask = true } label: { Label("新建", systemImage: "plus") }.buttonStyle(.borderedProminent).controlSize(.small)
                }
                overview
                HStack(spacing: 8) {
                    Image(systemName: "plus").foregroundStyle(.blue)
                    TextField("添加一件想做的事…", text: $quickTitle).textFieldStyle(.plain).onSubmit(addQuickTask).accessibilityLabel("快速添加待办")
                    Button(action: addQuickTask) { Image(systemName: "arrow.up").font(.system(size: 11, weight: .semibold)) }.buttonStyle(.borderedProminent).buttonBorderShape(.circle).disabled(quickTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isReadOnly).help("添加待办")
                }.padding(12).background(Color.cardBackground, in: .rect(cornerRadius: 14))
                VStack(spacing: 12) {
                    HStack {
                        ForEach(TaskScope.allCases) { item in
                            Button { withAnimation(controller.motion) { scope = item } } label: { Text(item.label).font(.system(size: 11, weight: scope == item ? .semibold : .regular)).padding(.horizontal, 10).padding(.vertical, 7).background(scope == item ? Color.blue.opacity(0.1) : .clear, in: .capsule).foregroundStyle(scope == item ? .blue : .secondary) }.buttonStyle(.plain)
                        }
                        Spacer(minLength: 0)
                    }
                    HStack(spacing: 7) { Image(systemName: "magnifyingglass").foregroundStyle(.secondary); TextField("搜索待办", text: $search).textFieldStyle(.plain)
                        if !search.isEmpty { Button { search = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }.buttonStyle(.plain).accessibilityLabel("清除搜索") }
                    }.font(.system(size: 12)).padding(10).background(.primary.opacity(0.035), in: .rect(cornerRadius: 10))
                }
                if filtered.isEmpty { ContentUnavailableView(search.isEmpty ? "此刻，轻一点" : "没有找到待办", systemImage: search.isEmpty ? "leaf" : "magnifyingglass", description: Text(search.isEmpty ? "添加新的待办，或切换筛选查看其他任务。" : "试试其他关键词。")) }
                else {
                    LazyVStack(spacing: 8) { ForEach(filtered) { task in TodoRow(task: task, controller: controller) } }
                }
                Text("\(filtered.count) 项待办 · 数据保存在这台 Mac 上").font(.system(size: 10)).foregroundStyle(.tertiary).frame(maxWidth: .infinity).padding(.vertical, 8)
            }.padding(22).frame(maxWidth: 900)
                .frame(maxWidth: .infinity)
        }.scrollContentBackground(.hidden)
    }
    private func addQuickTask() { if store.add(title: quickTitle) { quickTitle = "" } }
    private var overview: some View {
        let completed = store.tasks.filter(\.isCompleted).count
        let total = store.tasks.count
        return VStack(alignment: .leading, spacing: 12) {
            HStack { Text("任务概览").font(.system(size: 11, weight: .medium)); Spacer(); Text("\(completed) / \(total) 已完成").font(.system(size: 10)).foregroundStyle(.secondary) }
            HStack {
                metric("待完成", total - completed)
                Spacer()
                metric("今日到期", TaskQuery.filter(store.tasks, scope: .today).count)
                Spacer()
                metric("已逾期", store.tasks.filter { $0.isOverdue() }.count)
            }
            ProgressView(value: Double(completed), total: Double(max(total, 1))).tint(.blue).controlSize(.mini)
        }.padding(16).background(Color.cardBackground, in: .rect(cornerRadius: 18))
    }
    private func metric(_ label: String, _ count: Int) -> some View {
        VStack(alignment: .leading, spacing: 5) { Text(label).font(.system(size: 10)).foregroundStyle(.secondary); Text("\(count)").font(.system(size: 24, weight: .medium, design: .rounded)).monospacedDigit() }
    }
}
struct TodoRow: View {
    let task: Todo
    @ObservedObject var controller: WindowController
    @EnvironmentObject private var store: TaskStore
    @State private var confirmDelete = false
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button {
                withAnimation(controller.motion) { store.toggle(task.id) }
            } label: { Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle").font(.system(size: 20, weight: .light)).foregroundStyle(task.isCompleted ? Color.blue : .secondary.opacity(0.5)) }
                .buttonStyle(.plain).accessibilityLabel(task.isCompleted ? "恢复待办：\(task.title)" : "完成待办：\(task.title)").padding(.top, 1)
            Button { controller.editor = task } label: {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 5) { Text(task.title).font(.system(size: 14, weight: .medium)).strikethrough(task.isCompleted).foregroundStyle(task.isCompleted ? .secondary : .primary).frame(maxWidth: .infinity, alignment: .leading)
                        if task.isPinned { Image(systemName: "pin.fill").font(.system(size: 9)).foregroundStyle(.blue) }
                    }
                    if !task.notes.isEmpty { Text(task.notes).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading) }
                    if task.dueDate != nil || task.priority == .high {
                        HStack(spacing: 8) {
                            if let date = task.dueDate { Label(date.formatted(.dateTime.month().day()), systemImage: "calendar").foregroundStyle(task.isOverdue() ? .orange : .secondary) }
                            if task.priority == .high { Label("优先", systemImage: "flag.fill").foregroundStyle(.orange) }
                        }.font(.system(size: 9))
                    }
                }.contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityLabel("编辑待办：\(task.title)")
            Menu {
                Button(task.isPinned ? "取消置顶" : "置顶待办", systemImage: "pin") { store.togglePin(task.id) }
                Button("编辑", systemImage: "pencil") { controller.editor = task }
                Divider()
                Button("删除", systemImage: "trash", role: .destructive) { confirmDelete = true }
            } label: { Image(systemName: "ellipsis").font(.system(size: 12)).foregroundStyle(.secondary).frame(width: 20, height: 22) }.menuStyle(.borderlessButton).fixedSize().accessibilityLabel("待办操作：\(task.title)")
        }.padding(14).background(Color.cardBackground.opacity(task.isCompleted ? 0.65 : 1), in: .rect(cornerRadius: 16))
            .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(.primary.opacity(0.035), lineWidth: 1).allowsHitTesting(false) }
            .confirmationDialog("删除“\(task.title)”？", isPresented: $confirmDelete, titleVisibility: .visible) { Button("删除待办", role: .destructive) { store.delete(task.id) }; Button("取消", role: .cancel) {} }
    }
}
struct ZenView: View {
    @ObservedObject var controller: WindowController
    @EnvironmentObject private var store: TaskStore
    @State private var title = ""
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                let tasks = TaskQuery.filter(store.tasks, scope: .pending)
                if tasks.isEmpty { ContentUnavailableView("安心，当下无事", systemImage: "moon.stars", description: Text("所有待办已完成。")) }
                ForEach(tasks) { task in TodoRow(task: task, controller: controller) }
                TextField("添加待办…", text: $title).textFieldStyle(.plain).padding(14).background(.primary.opacity(0.03), in: .rect(cornerRadius: 14)).onSubmit { if store.add(title: title) { title = "" } }
            }.padding(18)
        }
    }
}
