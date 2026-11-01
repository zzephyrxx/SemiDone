# SemiDone Native · SwiftUI 基础版

同一仓库中的 macOS 原生实现，最低 macOS 26，仅构建 Apple Silicon。
当前为 `0.1.0` 本地预览，与根目录 Tauri V7 版并行，不替换其数据。

## 已实现

- 待办快速添加、编辑、备注、优先级、截止日期、完成/恢复、置顶、确认删除。
- 待完成/今天/已完成/全部筛选，标题与备注搜索，按截止日期浏览月历。
- Zen、悬浮球点击展开与拖动、菜单栏常驻、关闭隐藏、重复启动恢复。
- 置顶使用 NSPanel、跨 Spaces 和全屏辅助窗口；自定义顶栏，不显示红黄绿按钮。
- 任务、日历、统计、设置四页；Swift Charts 趋势图、蓝色使用色阶、25 分钟专注计时。
- 原生 `.glassEffect`、系统/明暗主题、全局动效开关；关闭开关后图标为静态。
- 本地 JSON 原子保存、上一份有效快照备份；读取损坏文件后暂停写入。
- 原生 JSON 备份导入/导出；导入按 ID 合并，保留现有任务与设置。

原生首版尚未迁移 Tauri 的附件、循环任务、开机自启、提醒、自定义 Zen 配色、报表导出、自动更新及 Windows 数据导入。
React 组件不能直接用于 SwiftUI：旧界面继续使用 rdev/liquid-glass-react，原生界面使用 Apple 框架。

## 开发

```sh
native/macos/scripts/swift.sh test
native/macos/scripts/swift.sh build
native/macos/scripts/swift.sh run SemiDoneNative
native/macos/scripts/package.sh
```

也可以用 Xcode 打开 `Package.swift`。推荐 Xcode 26+、Swift 6.2+。
当前本机只有 Swift 6.4.2 的 Command Line Tools，包含 SDK 26.5 与 27.2。
CLT 27 缺少 SwiftUIMacros，因此脚本在此配置下选用其自带 SDK 26；产物仍支持 macOS 26/27。
需要 27 专属 SwiftUI 接口时安装完整 Xcode。单独的 API 编译探测不等同于整个界面已验证可构建。

脚本不修改全局开发工具选择；可用 `SEMIDONE_SDK` 指定 SDK、`SEMIDONE_BUILD_DIR` 指定缓存路径。
在禁止嵌套构建隔离的受限运行环境，可为本仓库构建显式设置 `SEMIDONE_DISABLE_PACKAGE_SANDBOX=1`。
常规本地开发与 CI 无需此选项。

安装包输出：`release/macos-native/SemiDone-Native_0.1.0_aarch64.dmg`，附 SHA-256。
应用名为 `SemiDone Native.app`，当前为 ad-hoc 签名，尚未完成 Developer ID 签名或公证。
GitHub Actions `Native macOS preview` 提供构建产物；`native-v*` 标签创建预发布草稿，检查后发布。

## 代码边界

```
native/macos/
  Sources/SemiDoneCore/  Foundation 模型、查询、仓储接口、JSON 持久化
  Sources/SemiDoneApp/   SwiftUI 页面、AppKit 窗口/菜单栏、计时器
  Tests/                数据完整性与任务行为测试
  scripts/              工具链选择、app/DMG 打包
```

Windows 与现有 Mac Tauri 版仍共享根目录 `src/` 和 Rust 平台层。
原生 UI 与业务访问通过 `TaskStore` / `SnapshotStorage` 分层；后续如需两端复用业务实现，
应把逻辑下沉到共享 Rust 库并实现原生仓储桥接，或以明确的跨语言数据契约保持兼容。
目前没有声称 Swift 与 TypeScript 代码可以直接共享，也没有复制整个 Tauri 目录或创建第二个仓库。

## 数据与验证

原生数据：`~/Library/Application Support/com.semidone.native/data.json`。
相邻 `data.json.backup` 是上次有效快照；不读取 Tauri 数据目录，避免并行试用相互写入。
`--data-file /absolute/path/data.json` 可供开发时使用独立测试文件。
损坏或未知版本文件不会被空数据覆盖；修复文件后可通过界面“重试”重新读取。

11 项原生测试覆盖添加/编辑/完成/恢复/删除后重启保存、写入失败回滚、空标题、损坏文件保护、
上一份有效备份、重复导入合并、未知版本拒绝、设置保存、本地日界线筛选、置顶顺序和数据校验。
实机已验证启动、添加/编辑中文待办、备注与优先级保存、Zen 内完成任务、重启后保留完成状态、悬浮球收起/展开与拖动不误展开、设置页缩窄、自身全屏进入/退出及面板恢复。
全屏跨应用叠放、多显示器、不同 macOS 小版本、睡眠唤醒与中文候选框仍需人工回归，不能用编译与单元测试代替。

## 参考

仅参考交互与模块边界，没有复制以下项目源码：

- [FanBar](https://github.com/helson-lin/FanBar/tree/aa4b6c910506f5f558dd9611c2fab952376bd47c)：AppKit 状态栏入口、SwiftUI 内容分层、可见状态与动效控制。
- [FlClash](https://github.com/chen08209/FlClash/tree/7fd417fb9a9a277c6a9339a8ac87f907df7c25f7)：自适应导航、材质与内容拆分、统一视觉参数。
- [Apple glassEffect](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)) 与 [Swift Charts](https://developer.apple.com/documentation/charts)。
