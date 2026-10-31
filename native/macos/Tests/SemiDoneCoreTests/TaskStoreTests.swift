import Foundation
import Testing
@testable import SemiDoneCore

private final class MemoryStorage: SnapshotStorage {
    var value = Snapshot()
    var failWrites = false
    func load() throws -> Snapshot { value }
    func save(_ snapshot: Snapshot) throws {
        if failWrites { throw CocoaError(.fileWriteNoPermission) }; value = snapshot
    }
}
private func temporaryURL() throws -> URL {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("semidone-tests-\(UUID())")
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    return root.appendingPathComponent("data.json")
}
struct TaskStoreTests {
    @Test @MainActor func taskLifecycleSurvivesReload() throws {
        let url = try temporaryURL(); defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = TaskStore(storage: JSONStorage(fileURL: url))
        #expect(store.add(title: "  在 Mac 上完成待办  ", notes: "中文备注", priority: .high))
        let id = try #require(store.tasks.first?.id)
        #expect(store.tasks[0].title == "在 Mac 上完成待办")
        store.toggle(id)
        var edited = store.tasks[0]; edited.title = "已修改"; #expect(store.update(edited))
        let restarted = TaskStore(storage: JSONStorage(fileURL: url))
        #expect(restarted.tasks[0].isCompleted)
        #expect(restarted.tasks[0].title == "已修改")
        #expect(restarted.tasks[0].notes == "中文备注")
        #expect(restarted.tasks[0].priority == .high)
        restarted.toggle(id); #expect(!restarted.tasks[0].isCompleted)
        restarted.delete(id)
        #expect(TaskStore(storage: JSONStorage(fileURL: url)).tasks.isEmpty)
    }
    @Test @MainActor func writeFailureRollsBackTaskAndSettings() {
        let storage = MemoryStorage(); let store = TaskStore(storage: storage)
        #expect(store.add(title: "保留")); let original = store.snapshot
        storage.failWrites = true
        store.toggle(store.tasks[0].id)
        #expect(store.snapshot == original)
        var prefs = store.preferences; prefs.animationsEnabled = false
        #expect(!store.setPreferences(prefs)); #expect(store.snapshot == original)
        #expect(store.errorMessage != nil)
    }
    @Test @MainActor func emptyTitleIsRejected() {
        let store = TaskStore(storage: MemoryStorage())
        #expect(!store.add(title: " \n ")); #expect(store.tasks.isEmpty)
    }
    @Test @MainActor func corruptFileCannotBeOverwritten() throws {
        let url = try temporaryURL(); defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let original = Data("damaged JSON".utf8); try original.write(to: url)
        let store = TaskStore(storage: JSONStorage(fileURL: url))
        #expect(store.isReadOnly); #expect(!store.add(title: "不能覆盖"))
        #expect(try Data(contentsOf: url) == original)
    }
    @Test @MainActor func backupContainsPreviousValidatedSnapshot() throws {
        let url = try temporaryURL(); defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = TaskStore(storage: JSONStorage(fileURL: url))
        _ = store.add(title: "第一项"); _ = store.add(title: "第二项")
        let backup = try JSONStorage(fileURL: url.appendingPathExtension("backup")).load()
        #expect(backup.tasks.map(\.title) == ["第一项"])
        #expect(store.tasks.count == 2)
    }
    @Test @MainActor func nativeImportMergesByIDWithoutDeletingTasks() throws {
        let url = try temporaryURL(); defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = TaskStore(storage: MemoryStorage()); _ = store.add(title: "旧任务")
        var exported = store.snapshot; exported.tasks += [Todo(title: "新任务")]
        try JSONStorage.encoder().encode(exported).write(to: url)
        try store.importData(from: url); try store.importData(from: url)
        #expect(store.tasks.count == 2)
        #expect(store.tasks.map(\.title) == ["旧任务", "新任务"])
    }
    @Test @MainActor func invalidImportLeavesDataIntact() throws {
        let url = try temporaryURL(); defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = TaskStore(storage: MemoryStorage()); _ = store.add(title: "保留"); let original = store.snapshot
        var invalid = Snapshot(); invalid.schemaVersion = 99
        try JSONStorage.encoder().encode(invalid).write(to: url)
        #expect(throws: (any Error).self) { try store.importData(from: url) }
        #expect(store.snapshot == original)
    }
    @Test @MainActor func preferencesRoundTrip() throws {
        let url = try temporaryURL(); defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = TaskStore(storage: JSONStorage(fileURL: url))
        var prefs = store.preferences; prefs.theme = .dark; prefs.animationsEnabled = false; prefs.alwaysOnTop = false
        #expect(store.setPreferences(prefs))
        #expect(TaskStore(storage: JSONStorage(fileURL: url)).preferences == prefs)
    }
    @Test func filtersUseLocalDayAndCompletionState() {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(secondsFromGMT: 8 * 3600)!
        let now = calendar.date(from: DateComponents(year: 2026, month: 11, day: 1, hour: 0, minute: 10))!
        let yesterday = calendar.date(byAdding: .day, value: -1, to: now)!
        let a = Todo(title: "今天", dueDate: now); let b = Todo(title: "逾期", dueDate: yesterday); let c = Todo(title: "已完成", completedAt: now)
        #expect(TaskQuery.filter([a,b,c], scope: .today, date: now, calendar: calendar).map(\.title) == ["今天"])
        #expect(b.isOverdue(on: now, calendar: calendar)); #expect(!a.isOverdue(on: now, calendar: calendar))
        #expect(TaskQuery.filter([a,b,c], scope: .completed).count == 1)
        #expect(dayKey(now, calendar: calendar) == "2026-11-01")
    }
    @Test func pinnedTasksSortFirstAndSearchIncludesNotes() {
        let a = Todo(title: "普通", notes: "搜索关键字"); let b = Todo(title: "置顶", isPinned: true)
        #expect(TaskQuery.filter([a,b], scope: .pending).first?.id == b.id)
        #expect(TaskQuery.filter([a,b], scope: .all, search: "关键字").first?.id == a.id)
    }
    @Test func duplicateIDsAndImpossibleUsageAreRejected() {
        var data = Snapshot(); let task = Todo(title: "重复"); data.tasks = [task, task]
        #expect(throws: (any Error).self) { try data.validate() }
        data.tasks = []; data.dailyUsage = ["2026-11-01": 1441]
        #expect(throws: (any Error).self) { try data.validate() }
    }
}
