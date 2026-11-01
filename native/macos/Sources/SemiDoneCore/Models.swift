import Foundation

public enum TaskPriority: String, Codable, CaseIterable, Identifiable, Sendable {
    case low, medium, high
    public var id: String { rawValue }
    public var label: String { switch self { case .low: "低"; case .medium: "中"; case .high: "高" } }
}
public struct Todo: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var title: String
    public var notes: String
    public var priority: TaskPriority
    public var dueDate: Date?
    public var completedAt: Date?
    public var createdAt: Date
    public var updatedAt: Date
    public var isPinned: Bool
    public var isCompleted: Bool { completedAt != nil }
    public init(id: UUID = UUID(), title: String, notes: String = "", priority: TaskPriority = .medium,
                dueDate: Date? = nil, completedAt: Date? = nil, createdAt: Date = Date(), isPinned: Bool = false) {
        self.id = id; self.title = title; self.notes = notes; self.priority = priority
        self.dueDate = dueDate; self.completedAt = completedAt; self.createdAt = createdAt
        self.updatedAt = createdAt; self.isPinned = isPinned
    }
    public func isOverdue(on date: Date = Date(), calendar: Calendar = .current) -> Bool {
        guard !isCompleted, let dueDate else { return false }
        return calendar.startOfDay(for: dueDate) < calendar.startOfDay(for: date)
    }
}
public enum AppTheme: String, Codable, CaseIterable, Identifiable, Sendable {
    case system, light, dark
    public var id: String { rawValue }
    public var label: String { switch self { case .system: "跟随系统"; case .light: "浅色"; case .dark: "深色" } }
}
public struct Preferences: Codable, Equatable, Sendable {
    public var theme: AppTheme = .system
    public var animationsEnabled = true
    public var glassEnabled = true
    public var alwaysOnTop = true
    public var closeToHide = true
    public init() {}
}
public struct Snapshot: Codable, Equatable, Sendable {
    public var schemaVersion = 1
    public var tasks: [Todo] = []
    public var preferences = Preferences()
    public var dailyUsage: [String: Int] = [:]
    public var focusSessions = 0
    public init() {}
    public func validate() throws {
        guard schemaVersion == 1 else { throw DataError.unsupportedSchema }
        guard Set(tasks.map(\.id)).count == tasks.count,
              tasks.allSatisfy({ !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }),
              dailyUsage.values.allSatisfy({ (0...1440).contains($0) }), focusSessions >= 0 else {
            throw DataError.invalidData
        }
    }
}
public enum DataError: LocalizedError {
    case unsupportedSchema, invalidData, emptyTitle, readOnly
    public var errorDescription: String? {
        switch self {
        case .unsupportedSchema: "数据来自更新的原生版本，请先升级应用。"
        case .invalidData: "数据格式不正确，原文件已保留。"
        case .emptyTitle: "请填写待办标题。"
        case .readOnly: "数据尚未成功读取，已暂停写入以保护原文件。"
        }
    }
}
public enum TaskScope: String, CaseIterable, Identifiable {
    case pending, today, completed, all
    public var id: String { rawValue }
    public var label: String { switch self { case .pending: "待完成"; case .today: "今天"; case .completed: "已完成"; case .all: "全部" } }
}
public enum TaskQuery {
    public static func filter(_ tasks: [Todo], scope: TaskScope, search: String = "", date: Date = Date(), calendar: Calendar = .current) -> [Todo] {
        tasks.filter { task in
            let matches: Bool
            switch scope {
            case .pending: matches = !task.isCompleted
            case .completed: matches = task.isCompleted
            case .today: matches = !task.isCompleted && task.dueDate.map { calendar.isDate($0, inSameDayAs: date) } == true
            case .all: matches = true
            }
            return matches && (search.isEmpty || task.title.localizedStandardContains(search) || task.notes.localizedStandardContains(search))
        }.sorted { a, b in
            if a.isCompleted != b.isCompleted { return !a.isCompleted }
            if a.isPinned != b.isPinned { return a.isPinned }
            return a.createdAt > b.createdAt
        }
    }
}
public func dayKey(_ date: Date, calendar: Calendar = .current) -> String {
    let parts = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
}
