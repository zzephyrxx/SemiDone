import SwiftUI
import SemiDoneCore

struct CalendarPage: View {
    @ObservedObject var controller: WindowController
    @EnvironmentObject private var store: TaskStore
    @State private var month = Calendar.current.dateInterval(of: .month, for: Date())!.start
    @State private var selection = Calendar.current.startOfDay(for: Date())
    private let calendar = Calendar.current
    private var days: [Date?] {
        let offset = (calendar.component(.weekday, from: month) + 5) % 7
        let count = calendar.range(of: .day, in: .month, for: month)!.count
        return Array(repeating: nil, count: offset) + (0..<count).map { calendar.date(byAdding: .day, value: $0, to: month) }
    }
    private var selectedTasks: [Todo] {
        store.tasks.filter { task in task.dueDate.map { calendar.isDate($0, inSameDayAs: selection) } == true }
            .sorted { !$0.isCompleted && $1.isCompleted }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                SectionHeading(eyebrow: "MAKE ROOM FOR WHAT MATTERS", title: "给日子留一点空白", subtitle: "用日历安排待办，也留出休息的时间。")
                VStack(spacing: 18) {
                    HStack {
                        Text(month.formatted(.dateTime.year().month(.wide))).font(.system(size: 16, weight: .semibold))
                        Spacer()
                        IconButton(symbol: "chevron.left", label: "上个月") { moveMonth(-1) }
                        Button("今天") { month = calendar.dateInterval(of: .month, for: Date())!.start; selection = calendar.startOfDay(for: Date()) }.font(.system(size: 11)).buttonStyle(.plain).foregroundStyle(.blue)
                        IconButton(symbol: "chevron.right", label: "下个月") { moveMonth(1) }
                    }
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 5), count: 7), spacing: 7) {
                        ForEach(["一", "二", "三", "四", "五", "六", "日"], id: \.self) { Text($0).font(.system(size: 10)).foregroundStyle(.tertiary).frame(height: 24) }
                        ForEach(Array(days.enumerated()), id: \.offset) { _, date in
                            if let date {
                                let selected = calendar.isDate(date, inSameDayAs: selection)
                                let count = store.tasks.filter { task in task.dueDate.map { calendar.isDate($0, inSameDayAs: date) } == true }.count
                                Button { withAnimation(controller.motion) { selection = date } } label: {
                                    VStack(spacing: 4) {
                                        Text("\(calendar.component(.day, from: date))").font(.system(size: 13, weight: selected || calendar.isDateInToday(date) ? .semibold : .regular))
                                        Circle().fill(count > 0 ? (selected ? Color.white : .blue) : .clear).frame(width: 3, height: 3)
                                    }.frame(maxWidth: .infinity).frame(height: 43)
                                        .foregroundStyle(selected ? Color.white : calendar.isDateInToday(date) ? .blue : .primary)
                                        .background(selected ? Color.blue : .clear, in: .rect(cornerRadius: 12))
                                }.buttonStyle(.plain).accessibilityLabel("\(date.formatted(date: .long, time: .omitted))，\(count) 项待办").accessibilityAddTraits(selected ? .isSelected : [])
                            } else { Color.clear.frame(height: 43).accessibilityHidden(true) }
                        }
                    }
                }.padding(18).glassCard()
                HStack { Text(selection.formatted(.dateTime.month().day().weekday(.wide))).font(.system(size: 13, weight: .semibold)); Spacer()
                    Button { controller.newTaskDate = selection; controller.showingNewTask = true } label: { Label("添加待办", systemImage: "plus") }.font(.system(size: 11)).buttonStyle(.plain).foregroundStyle(.blue) }
                if selectedTasks.isEmpty { ContentUnavailableView("这一天还很宽裕", systemImage: "calendar", description: Text("添加一件待办，为重要的事留好位置。")) }
                else { LazyVStack(spacing: 8) { ForEach(selectedTasks) { TodoRow(task: $0, controller: controller) } } }
            }.padding(22).frame(maxWidth: 900).frame(maxWidth: .infinity)
        }
    }
    private func moveMonth(_ value: Int) {
        withAnimation(controller.motion) { month = calendar.date(byAdding: .month, value: value, to: month)!; selection = month }
    }
}
