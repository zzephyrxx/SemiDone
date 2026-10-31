import SwiftUI
import Charts
import SemiDoneCore

struct StatisticsPage: View {
    @ObservedObject var clock: FocusClock
    @EnvironmentObject private var store: TaskStore
    @State private var period = 7
    private var records: [(date: Date, minutes: Int)] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<period).reversed().map { offset in
            let date = calendar.date(byAdding: .day, value: -offset, to: today)!
            return (date, store.snapshot.dailyUsage[dayKey(date)] ?? 0)
        }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                SectionHeading(eyebrow: "YOUR RHYTHM", title: "把时间留给重要的事", subtitle: "看见日常的节奏，让专注慢慢累积。")
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    metric("今日使用", minutes(store.snapshot.dailyUsage[dayKey(Date())] ?? 0))
                    metric("完成待办", "\(store.tasks.filter(\.isCompleted).count) 项")
                    metric("专注次数", "\(store.snapshot.focusSessions) 次")
                    metric("活跃天数", "\(records.filter { $0.minutes > 0 }.count) 天")
                }
                HStack { Text("专注足迹").font(.system(size: 13, weight: .semibold)); Spacer()
                    Picker("统计范围", selection: $period) { Text("近 7 天").tag(7); Text("近 30 天").tag(30) }.pickerStyle(.segmented).frame(width: 156).labelsHidden() }
                VStack(alignment: .leading, spacing: 16) {
                    HStack { Label("使用趋势", systemImage: "chart.xyaxis.line").font(.system(size: 12, weight: .semibold)); Spacer(); Text("日均 \(minutes(records.map(\.minutes).reduce(0, +) / period))").font(.system(size: 10)).foregroundStyle(.secondary) }
                    Chart {
                        ForEach(records, id: \.date) { item in
                            AreaMark(x: .value("日期", item.date), y: .value("分钟", item.minutes)).foregroundStyle(LinearGradient(colors: [.blue.opacity(0.23), .blue.opacity(0.015)], startPoint: .top, endPoint: .bottom)).interpolationMethod(.monotone)
                            LineMark(x: .value("日期", item.date), y: .value("分钟", item.minutes)).foregroundStyle(.blue).lineStyle(StrokeStyle(lineWidth: 2)).interpolationMethod(.monotone)
                            if period == 7 { PointMark(x: .value("日期", item.date), y: .value("分钟", item.minutes)).foregroundStyle(.blue).symbolSize(18) }
                        }
                    }.chartYScale(domain: 0...max(60, records.map(\.minutes).max() ?? 0))
                        .chartXAxis { AxisMarks(values: .stride(by: .day, count: period == 7 ? 1 : 7)) { value in AxisValueLabel(format: .dateTime.month(.twoDigits).day(.twoDigits)); AxisGridLine().foregroundStyle(.primary.opacity(0.04)) } }
                        .chartYAxis { AxisMarks(position: .leading) { _ in AxisGridLine(stroke: StrokeStyle(dash: [3, 5])).foregroundStyle(.primary.opacity(0.07)); AxisValueLabel() } }
                        .frame(height: 185).accessibilityLabel("每日使用分钟数趋势")
                    Text("仅在窗口获得输入焦点时累计使用时长；隐藏与离线时间不计入。").font(.system(size: 9)).foregroundStyle(.secondary)
                }.padding(18).glassCard()
                VStack(alignment: .leading, spacing: 14) {
                    Text("使用频率").font(.system(size: 12, weight: .semibold))
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 5), count: 7), spacing: 5) {
                        ForEach(records, id: \.date) { item in
                            Text(item.date.formatted(.dateTime.day())).font(.system(size: 10, weight: .medium)).frame(maxWidth: .infinity).frame(height: 35)
                                .background(frequencyColor(item.minutes), in: .rect(cornerRadius: 8))
                                .foregroundStyle(item.minutes >= 60 ? Color.white : .secondary)
                                .help("\(item.date.formatted(date: .abbreviated, time: .omitted)) · \(minutes(item.minutes))")
                                .accessibilityLabel("\(item.date.formatted(date: .abbreviated, time: .omitted))，\(minutes(item.minutes))")
                        }
                    }
                    HStack(spacing: 4) { Spacer(); Text("少"); ForEach([0, 1, 15, 30, 60], id: \.self) { value in RoundedRectangle(cornerRadius: 3).fill(frequencyColor(value)).frame(width: 10, height: 10) }; Text("多") }.font(.system(size: 9)).foregroundStyle(.secondary)
                }.padding(18).glassCard()
                focusCard
            }.padding(22).frame(maxWidth: 900).frame(maxWidth: .infinity)
        }
    }
    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 10) { Text(label).font(.system(size: 10)).foregroundStyle(.secondary); Text(value).font(.system(size: 23, weight: .medium, design: .rounded)).monospacedDigit() }.frame(maxWidth: .infinity, alignment: .leading).padding(16).background(Color.cardBackground, in: .rect(cornerRadius: 18))
    }
    private var focusCard: some View {
        VStack(spacing: 16) {
            Label("留一段时间，专心做好一件事", systemImage: "timer").font(.system(size: 11)).foregroundStyle(.secondary)
            Text(clock.display).font(.system(size: 48, weight: .light, design: .rounded)).monospacedDigit()
            HStack(spacing: 16) {
                Button { clock.toggle() } label: { Label(clock.running ? "暂停" : "开始专注", systemImage: clock.running ? "pause.fill" : "play.fill") }.buttonStyle(.borderedProminent)
                Button { clock.reset() } label: { Image(systemName: "arrow.counterclockwise") }.buttonStyle(.plain).help("重置番茄钟").accessibilityLabel("重置番茄钟")
            }
        }.frame(maxWidth: .infinity).padding(24).background(Color.cardBackground, in: .rect(cornerRadius: 20))
    }
    private func frequencyColor(_ value: Int) -> Color {
        value == 0 ? .primary.opacity(0.04) : .blue.opacity(value < 15 ? 0.12 : value < 30 ? 0.25 : value < 60 ? 0.5 : 0.9)
    }
    private func minutes(_ value: Int) -> String { value >= 60 ? "\(value / 60) 小时 \(value % 60) 分" : "\(value) 分钟" }
}
