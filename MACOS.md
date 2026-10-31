# macOS 首版适配

## 范围与基线

基于远端 master a6480869（版本号 7.0.0），未沿用拷贝出错的工作目录。
目标为 Apple silicon、macOS 26/27，不包含 Intel、Windows 数据迁移或自动同步。
保留 V7 无边框界面、Zen、悬浮球和现有 CSS 玻璃效果。本次不接入系统原生 Liquid Glass；使用 liquid-glass-react 的网页玻璃效果。

## 共享代码和平台边界

- `src/`：共享 React 页面、任务与设置状态、持久化 API。
- `src/platform/runtime.ts`：系统快捷键提示和默认窗口尺寸。MacIntel 字符串只是 WebKit 的平台标识，不代表 Intel 构建。
- `src-tauri/src/window_pinning.rs`：共享置顶状态、隐藏策略与主线程调度。
- `src-tauri/src/platform/windows.rs`：保留 Win32 样式和显示桌面后的守护逻辑。
- `src-tauri/src/platform/macos.rs`：AppKit 面板、Spaces 和全屏辅助窗口；仅 Mac 编译。
- `tauri.conf.json`：共享配置。`tauri.windows.conf.json`、`tauri.macos.conf.json` 自动按构建目标合并。
- Mac bundle ID 为 `com.semidone.desktop`；保留 Windows 的既有标识，避免破坏已有安装。

## 窗口行为

自定义标题栏保留，不显示红黄绿按钮。普通模式保留 Dock 与顶部菜单栏图标。
置顶期间为支持其他应用的全屏空间，切换到 accessory 运行方式，暂时隐藏 Dock 图标；
顶部菜单栏始终保留，取消置顶后恢复 Dock。
关闭按钮隐藏窗口；菜单栏“显示窗口”、Dock 重开或重复启动恢复同一窗口；菜单栏退出或 ⌘Q 退出进程。
Mac 默认完整窗口 550×800，Zen 和完整窗口分别记忆尺寸。
开机自启仅在打包后的正式模式启用，`--hidden` 启动保持隐藏。

开启置顶后转换为可输入的 nonactivating NSPanel，设置 CanJoinAllSpaces、CanJoinAllApplications、
FullScreenAuxiliary 与 Stationary，并使用高于全屏内容的窗口层级。取消置顶恢复原窗口类、样式和层级。
原生操作通过主线程串行执行；隐藏状态不会被后台守护重新唤醒。
该方案需要真实系统回归测试，不能由单元测试替代。全屏覆盖不包含系统锁屏、安全界面或独占显示内容的保证。

## 数据

任务、设置和使用记录仍为本地 JSON。Mac 默认位于：
`~/Library/Application Support/SemiDone/SemiDoneData/`。
数据模型与 Windows 共用；本轮不读取或迁移 Windows 数据。

## 构建与发布

需要 Node.js 22、Rust stable 与 Xcode Command Line Tools。

```sh
npm ci
npm run dev
npm run check
npm test
cargo test --manifest-path src-tauri/Cargo.toml --locked
npm run build:mac
```

`npm run build:mac` 先构建 aarch64 `.app`，再通过系统磁盘镜像工具制作 DMG 和 SHA-256 文件，
无需通过 Finder 自动排版。打开 DMG 后将应用拖到 Applications 即可安装。
首次本地构建时使用的工具暂存在 `/private/tmp/semidone-tools/`，不修改用户全局配置；
后续持续开发应将上述开发工具正常安装到自己的开发环境。

GitHub Actions 的 Desktop checks 覆盖 macOS 和 Windows。
macOS Apple silicon release 可手动触发下载构建产物；推送 `v*` 标签后创建 GitHub Release 草稿，供检查后发布。
本轮尚未推送代码、创建标签或上传任何 Release。

当前使用 ad-hoc 本地签名，未完成 Developer ID 签名和 Apple 公证。可以本机验证，
对外下载可能遇到 Gatekeeper 拦截。正式发布前取得证书并配置签名、公证；不要把临时签名包描述为已公证版本。

## 验收记录（2026-10-31）

- TypeScript 检查、前端生产构建、296 项前端测试、17 项 Rust 测试通过。
- Apple silicon release `.app` 和 DMG 已生成；镜像校验、复制安装和 ad-hoc 签名校验通过。
- 真实应用：新建与编辑中文待办、Zen 内完成、重启后任务与完成状态保存通过。
- 真实应用：Zen 进入/退出、悬浮球折叠/点击展开、置顶/取消置顶、关闭隐藏与重开恢复通过。
- 全屏浏览器场景已尝试，自动化截图仅捕获各应用自身窗口，不能据此确认跨应用叠放；仍需人工确认。
- macOS 26、27 的多桌面、视频全屏、多显示器、中文输入法候选框、附件对话框与开机自启仍需进一步回归。
- Windows 原生回归与 GitHub 工作流运行尚未执行，本机没有 Windows 运行环境。


## 2026-11-01 界面迭代

- 升级 React 19，接入 `liquid-glass-react`，导航、选中层、通用弹窗和玻璃预览共用 Surface。
- Mac WebKit 的 SVG 位移滤镜支持有限，以磨砂、透明与高光为兼容效果；不承诺与 Chromium 的折射完全一致。
- `src/ui/icons/` 按需引入 pqoqubbw/icons 的 Motion 动画源码，保留许可证与来源版本；少量缺失符号补充同风格动效，避免改变操作含义。
- 移除 lucide-react 依赖。图标响应所在控件的悬停和键盘聚焦，跟随全局动效开关。
- 设置页改为按内容容器宽度分栏；数据行操作区在窄处换行。移除梦粉选项，旧值迁移为明亮。
- 品牌区只负责拖动；Zen 顶栏显示 SemiDone；日历周/月选中态采用明确的蓝色填充。
- 折叠采用内容淡出、AppKit 原生窗口缩放、悬浮球淡入的分段过渡；关闭动效时跳过动画。
- 菜单栏源稿为 `src-tauri/icons/tray-template.svg`；`npm run icons:tray` 生成 AppKit 模板图像，自动适配明暗菜单栏。
- 左键菜单栏图标直接恢复窗口；右键显示“显示窗口 / 退出”。

本轮检查：289 项前端测试、17 项 Rust 测试通过；类型检查、生产构建、DMG 与本地签名校验通过。实机确认设置页显示和数据行换行、旧梦粉迁移、新导航点击、日历选中态、Zen 标题、悬浮球收起与展开。
