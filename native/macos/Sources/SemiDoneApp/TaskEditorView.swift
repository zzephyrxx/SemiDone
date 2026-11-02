import SwiftUI
import SemiDoneCore

struct TaskEditorView: View {
    @ObservedObject var store: TaskStore
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Todo
    @State private var hasDueDate: Bool
    @State private var selectedDate: Date
    @FocusState private var titleFocused: Bool
    private let isNew: Bool
    init(store: TaskStore, task: Todo? = nil, dueDate: Date? = nil) {
        self.store = store; isNew = task == nil
        _draft = State(initialValue: task ?? Todo(title: "", dueDate: dueDate))
        _hasDueDate = State(initialValue: (task?.dueDate ?? dueDate) != nil)
        _selectedDate = State(initialValue: task?.dueDate ?? dueDate ?? Date())
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack { Text(isNew ? "新建待办" : "编辑待办").font(.system(size: 18, weight: .semibold)); Spacer(); Button { dismiss() } label: { Image(systemName: "xmark") }.buttonStyle(.plain).accessibilityLabel("取消编辑") }
            TextField("想做些什么？", text: $draft.title).font(.system(size: 16, weight: .medium)).textFieldStyle(.plain).focused($titleFocused)
            VStack(alignment: .leading, spacing: 8) {
                Text("备注").font(.system(size: 11)).foregroundStyle(.secondary)
                TextEditor(text: $draft.notes).scrollContentBackground(.hidden).font(.system(size: 12)).frame(height: 90).padding(8).background(.primary.opacity(0.035), in: .rect(cornerRadius: 12)).accessibilityLabel("备注")
            }
            HStack { Text("优先级"); Spacer(); Picker("优先级", selection: $draft.priority) { ForEach(TaskPriority.allCases) { Text($0.label).tag($0) } }.labelsHidden().pickerStyle(.segmented).frame(width: 160) }.font(.system(size: 12))
            Toggle("截止日期", isOn: $hasDueDate).font(.system(size: 12))
            if hasDueDate { DatePicker("日期", selection: $selectedDate, displayedComponents: .date).datePickerStyle(.field).font(.system(size: 12)) }
            if let error = store.errorMessage { Text(error).font(.system(size: 11)).foregroundStyle(.orange).textSelection(.enabled) }
            HStack { Spacer(); Button("取消") { dismiss() }.keyboardShortcut(.cancelAction)
                Button(isNew ? "添加待办" : "保存") { save() }.buttonStyle(.borderedProminent).keyboardShortcut("s", modifiers: .command).disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isReadOnly) }
        }.padding(24).frame(width: 352).onAppear { titleFocused = true }
    }
    private func save() {
        draft.dueDate = hasDueDate ? Calendar.current.startOfDay(for: selectedDate) : nil
        let success = isNew ? store.add(title: draft.title, notes: draft.notes, priority: draft.priority, dueDate: draft.dueDate) : store.update(draft)
        if success { dismiss() }
    }
}
