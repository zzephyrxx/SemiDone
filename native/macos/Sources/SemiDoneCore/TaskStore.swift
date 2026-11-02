import Foundation
import Combine

public protocol SnapshotStorage {
    func load() throws -> Snapshot
    func save(_ snapshot: Snapshot) throws
}
public struct JSONStorage: SnapshotStorage {
    public let fileURL: URL
    public init(fileURL: URL) { self.fileURL = fileURL }
    public static var applicationURL: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("com.semidone.native", isDirectory: true).appendingPathComponent("data.json")
    }
    public static func decoder() -> JSONDecoder { let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601; return decoder }
    public static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601; encoder.outputFormatting = [.prettyPrinted, .sortedKeys]; return encoder
    }
    public func load() throws -> Snapshot {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return Snapshot() }
        let snapshot = try Self.decoder().decode(Snapshot.self, from: Data(contentsOf: fileURL))
        try snapshot.validate(); return snapshot
    }
    public func save(_ snapshot: Snapshot) throws {
        try snapshot.validate()
        let data = try Self.encoder().encode(snapshot)
        try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: fileURL.path) {
            // Never replace the backup with a damaged or unknown-version file.
            _ = try load()
            try Data(contentsOf: fileURL).write(to: fileURL.appendingPathExtension("backup"), options: .atomic)
        }
        try data.write(to: fileURL, options: .atomic)
    }
}
@MainActor public final class TaskStore: ObservableObject {
    @Published public private(set) var snapshot = Snapshot()
    @Published public var errorMessage: String?
    @Published public private(set) var isReadOnly = false
    private let storage: any SnapshotStorage
    public var tasks: [Todo] { snapshot.tasks }
    public var preferences: Preferences { snapshot.preferences }
    public init(storage: any SnapshotStorage = JSONStorage(fileURL: JSONStorage.applicationURL)) {
        self.storage = storage; reload()
    }
    public func reload() {
        do { let data = try storage.load(); try data.validate(); snapshot = data; isReadOnly = false; errorMessage = nil }
        catch { isReadOnly = true; errorMessage = "读取失败：\(error.localizedDescription)" }
    }
    @discardableResult private func commit(_ mutate: (inout Snapshot) throws -> Void) -> Bool {
        do {
            guard !isReadOnly else { throw DataError.readOnly }
            var candidate = snapshot; try mutate(&candidate); try candidate.validate()
            try storage.save(candidate); snapshot = candidate; errorMessage = nil; return true
        } catch { errorMessage = "保存失败：\(error.localizedDescription)"; return false }
    }
    @discardableResult public func add(title: String, notes: String = "", priority: TaskPriority = .medium, dueDate: Date? = nil) -> Bool {
        commit { data in
            let title = title.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !title.isEmpty else { throw DataError.emptyTitle }
            data.tasks.insert(Todo(title: title, notes: notes, priority: priority, dueDate: dueDate), at: 0)
        }
    }
    @discardableResult public func update(_ edited: Todo) -> Bool {
        commit { data in
            guard let index = data.tasks.firstIndex(where: { $0.id == edited.id }) else { throw DataError.invalidData }
            var task = edited; task.title = task.title.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !task.title.isEmpty else { throw DataError.emptyTitle }
            task.updatedAt = Date(); data.tasks[index] = task
        }
    }
    public func toggle(_ id: UUID) {
        guard var task = tasks.first(where: { $0.id == id }) else { return }
        task.completedAt = task.isCompleted ? nil : Date(); _ = update(task)
    }
    public func togglePin(_ id: UUID) {
        guard var task = tasks.first(where: { $0.id == id }) else { return }
        task.isPinned.toggle(); _ = update(task)
    }
    public func delete(_ id: UUID) { _ = commit { $0.tasks.removeAll { $0.id == id } } }
    @discardableResult public func setPreferences(_ preferences: Preferences) -> Bool { commit { $0.preferences = preferences } }
    public func recordUsage(minutes: Int, date: Date = Date()) {
        guard minutes > 0 else { return }
        _ = commit { data in let key = dayKey(date); data.dailyUsage[key] = min(1440, (data.dailyUsage[key] ?? 0) + minutes) }
    }
    public func completeFocus() { _ = commit { $0.focusSessions += 1 } }
    public func exportData(to url: URL) throws { try JSONStorage.encoder().encode(snapshot).write(to: url, options: .atomic) }
    public func importData(from url: URL) throws {
        let data = try JSONStorage.decoder().decode(Snapshot.self, from: Data(contentsOf: url)); try data.validate()
        // Merge by ID; an import never silently deletes current tasks or settings.
        guard commit({ candidate in
            let ids = Set(candidate.tasks.map(\.id))
            candidate.tasks += data.tasks.filter { !ids.contains($0.id) }
        }) else { throw DataError.readOnly }
    }
}
