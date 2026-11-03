# SemiDone · Mac App Store

当前基于 Tauri + React。`native/macos/` 原生实验版搁置，本次不修改。
本文件记录商店适配，不代表已通过 Apple 验证或审核。

## 构建渠道

| 项目 | 独立下载版 | App Store 版 |
| --- | --- | --- |
| 命令 | `npm run build:mac` | `npm run build:mac:store:preview` / `npm run build:mac:store` |
| Rust feature | 默认 `desktop-integrations` | `--no-default-features --features app-store` |
| 前端 | 普通 Vite 构建 | `.env.appstore` / `vite build --mode appstore` |
| 原生窗口 | 透明 WebView、NSPanel 插件 | 不透明 WebView、公开 NSWindow 置顶接口 |
| 界面材质 | 现有页面内玻璃 | 保留页面内玻璃，不提供桌面穿透透明开关 |
| 跨应用全屏覆盖 | 既有实现 | 不承诺覆盖其他应用的全屏窗口，需实机验证 |
| Dock | 沿用现有策略 | 保持 Dock 入口 |
| 登录启动 | 既有 LaunchAgent | `SMAppService.mainAppService`，用户主动设置 |
| 数据目录 | 沿用原路径及迁移入口 | 应用容器；后端同时禁止重定向目录 |
| 更新、微信打赏 | 保留 | 不启动 GitHub 版本检查，不显示打赏码 |

商店 feature 与 desktop feature 不允许一起启用。`tauri-nspanel` 自身启用 Tauri 私有 API，
因此商店构建从依赖图中排除整个插件，而非仅关闭界面选项。
Tauri 私有 API 的编译开关仅由 desktop-integrations feature 管理，避免 CLI 在切换渠道时改写共享依赖。
前端、原生权限和 Rust feature 必须一起使用对应构建脚本；不要用普通前端替换商店包资源。

## 本机预览

```sh
npm run check
npm test
TAURI_CONFIG="$(cat src-tauri/tauri.appstore.conf.json)" cargo test --manifest-path src-tauri/Cargo.toml --no-default-features --features app-store --locked
npm run build:mac:store:preview
```

预览使用 ad-hoc 签名及真实 App Sandbox 权限，只用于本机验证，不能上传。
构建缓存和应用输出独立放在 `src-tauri/target/appstore/`；生成配置放在被忽略的 `release/appstore/`。
预览构建同时生成 `release/appstore/SemiDone_7.0.0_appstore-preview_aarch64.dmg` 和 SHA-256 校验文件。
已有最新版 `.app` 时，可用 `npm run package:mac:store:preview:dmg` 单独打包，无需重新编译。
打开 DMG 后将应用拖入 Applications 即可安装；这是本机预览安装包，商店候选包仍使用下方的 `.pkg` 流程。
用户文件读取由系统文件选择器授权；报告导出使用保存对话框的一次性授权。
实机确认 WKWebView 子进程启动需要 `com.apple.security.network.client`；不授予入站网络权限，
也不因此启用更新检查或遥测请求。
商店版不保存容器外目录，不需要持久安全作用域书签。
旧版数据不会自动读取、移动或删除；完整旧版数据导入尚需实现和验收。

## 生成商店候选包

安装完整、可用的 Xcode，并按 Apple 要求完成本机工具链设置。当前脚本面向 Apple Silicon、macOS 26+。
在 Apple Developer / App Store Connect 中注册 `com.semidone.desktop`，确认标识可用且归属于自己的团队。
创建 Mac App Store Connect 分发描述文件和对应的应用、安装包分发证书。

通过本地环境配置以下变量，不要把私钥、描述文件、证书密码提交到仓库：

| 变量 | 内容 |
| --- | --- |
| `APPLE_TEAM_ID` | Apple 团队 ID |
| `SEMIDONE_PROVISION_PROFILE` | 下载的 Mac App Store Connect 描述文件绝对路径 |
| `SEMIDONE_APP_SIGNING_IDENTITY` | 钥匙串中的商店应用分发签名身份 |
| `SEMIDONE_INSTALLER_SIGNING_IDENTITY` | 钥匙串中的商店安装包分发签名身份 |
| `SEMIDONE_BUILD_NUMBER` | 每次上传递增的整数构建号 |
| `SEMIDONE_PRIVACY_URL` | 已发布、可以访问的 HTTPS 隐私政策页面 |

然后运行 `npm run build:mac:store`。
脚本检查描述文件 App ID、团队和沙盒属性，嵌入描述文件，生成最终权限并检查签名，
再用 `productbuild` 创建 `.pkg`。不会自动上传、发布或购买开发者会员。
`ITSAppUsesNonExemptEncryption=false` 基于当前本地应用不实现自定义加密的设计；新增加密能力后重新评估。

## 提交前尚需完成

- 发布隐私政策和支持网页。`public/privacy.html` 为商店版网页底稿，尚未发布。
- 使用正式签名和描述文件验证登录项开启、关闭、系统拒绝授权、重启及应用升级。
- 验证最终应用在容器内读写，添加/粘贴/拖入附件、默认应用打开附件、报告导出与取消授权。
- 验证 Zen、悬浮球、窗口恢复、菜单栏、Dock、⌘Q、睡眠唤醒、中文输入法、多显示器与多桌面。
- 验证不透明窗口下悬浮球边缘和圆角；当前不承诺与独立版透明桌面效果完全一致。
- 补齐用户主动发起的旧版任务及附件迁移、完整备份恢复，验证不会丢失旧数据。
- 核对 WebKit / Tauri / 所有第三方依赖在最终产物中的 API 与隐私声明要求；不能把关闭私有 API feature 当作完整二进制审计。
- 检查实际联网行为后再填写隐私问卷。应用内使用统计不是上传的遥测数据。
- 完成商店截图、描述、关键词、支持 URL、年龄分级、发行地区与适用的地区信息。
- 审核备注解释关闭隐藏、Zen、悬浮球及用户开启的登录项；通过 Transporter 等 Apple 工具验证候选包。
- 无真实证书、描述文件和提交验证结果前，不将本机预览称为可上架版本。

## 官方资料

- [Apple 审核指南](https://developer.apple.com/app-store/review/guidelines/)
- [App Sandbox](https://developer.apple.com/documentation/xcode/configuring-the-macos-app-sandbox)
- [SMAppService](https://developer.apple.com/documentation/servicemanagement/smappservice)
- [隐私申报](https://developer.apple.com/app-store/app-privacy-details/)
- [Tauri App Store 分发](https://v2.tauri.app/distribute/app-store/)

## 本轮验证（2026-11-02）

- TypeScript 检查及 334 项前端测试通过。
- 商店 feature 的 22 项 Rust 测试、普通 feature 的 21 项 Rust 测试通过。
- 商店依赖图不含 `macos-private-api`、`tauri-nspanel`、旧自启动及 HTTP 插件。
- Apple Silicon 商店预览 `.app` 已构建，签名与最终沙盒权限校验通过。
- 实机确认 WebKit 正常加载、中文待办创建成功，数据写入 `~/Library/Containers/com.semidone.desktop/Data/Library/Application Support/com.semidone.desktop/SemiDoneData/`。
- 实机确认关于页使用商店更新说明、不显示打赏和目录迁移入口、页面内玻璃及悬浮球设置仍存在。
- 报告导出可唤起系统保存对话框；实际写入外部位置、附件授权、重启与正式登录项尚需继续验收。
- 未使用正式证书、未上传、未发布；本机预览不代表已通过审核。

## 外观回归修复与透明背景研究（2026-11-02）

商店版不透明 WKWebView 会在 CSS 圆角之外绘制自己的底色，单独保留页面圆角不足以保持窗体形状。
新增 `macos/WindowAppearance.m`，通过公开的 NSWindow、NSView 和 CALayer 接口裁切原生内容，
使用 20pt 连续圆角，短边不超过 80pt 时使用半短边半径，并在窗口改变大小时更新。
悬浮球在商店版填满窗口，避免原有 55px 图标与 60px 窗口之间露出 WebView 底色。

用户明确选择保留“背景透明、文字清晰”，不接受以整窗 alpha 让文字一起变淡。
本机独立 WKWebView 小样使用透明 HTML/CSS、公开的 `underPageBackgroundColor`、
透明图层及非不透明 NSWindow；页面区域仍绘制白色，不能透出背后的绿色原生参照层。
因此这些公开属性不能在该环境下等价替代现有透明 WebView 实现；半透明背景尚未恢复。
圆角修复不代表透明背景已解决，也不代表已获得 Apple 审核结论。

当前锁定的 Wry 0.54.2 在透明路径中使用 `drawsBackground` KVC，商店版继续排除此路径。
不通过重新启用私有开关或降低全窗 alpha 冒充恢复原效果。
如需继续保持完整桌面透视，需要验证其他渲染方案；本轮不重启已搁置的 SwiftUI 全量重构。

- [Apple underPageBackgroundColor](https://developer.apple.com/documentation/webkit/wkwebview/underpagebackgroundcolor)
- [WebKit 透明背景公开 API 请求](https://bugs.webkit.org/show_bug.cgi?id=221663)

## 窗口外观微调（2026-11-02）

统一参数文件：[src/config/windowAppearance.json](src/config/windowAppearance.json)。
前端从此文件设置 CSS 变量，Rust 构建时从同一文件生成 Objective-C 头文件，不要修改生成的头文件。
圆角数值单位为逻辑点（前端对应 CSS 像素），不是 Retina 物理像素。

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `expandedRadius` | 22 | 完整窗口及 Zen 外圆角；越大越圆 |
| `barRadius` | 14 | 条状窗口圆角；保持圆角矩形 |
| `floatingRadius` | 12 | 60×60 悬浮块圆角；不再自动变成圆形 |
| `snappedRadius` | 6 | 30×30 边缘吸附块圆角 |
| `clipInset` | 0.75 | 原生遮罩向内收缩量；略增可切掉边缘残线，过大会裁掉内容 |
| `fadeOutMs` | 80 | 收起为条状前的内容淡出时长，毫秒 |
| `fadeInMs` | 100 | 切换后内容淡入时长，毫秒 |
| `floatingCollapseMs` | 200 | 向左上角聚拢、模糊收起为悬浮块的时长，毫秒 |
| `floatingExpandMs` | 180 | 悬浮块展开的放大、模糊消除时长，毫秒 |
| `barExpandMs` | 220 | 条状模式向下展开时长，毫秒 |

修改后运行 `npm run build:mac:store:preview`，完全退出旧进程，再打开新生成的 `.app`。
仅刷新网页或 Vite 热更新不会更新已编译的原生遮罩。

本次修复：商店版取消页面外层重复裁切，由原生单层圆角矩形遮罩统一负责外轮廓，
同时填充与主题相同的页面底色，避免 CSS 圆角和原生连续曲线之间露出 WebView 白底。
取消以“短边除以二”计算紧凑模式圆角，条状、悬浮块和吸附块分别采用独立值。
折叠与展开按紧凑模式使用短暂的聚拢、淡出或向下揭示；关闭界面动效或系统请求减少动态效果时跳过。
日期、番茄钟与重复设置使用 `src/components/NumberInput.tsx` 的主题箭头，
颜色和尺寸在 `src/styles/windowAppearance.css` 的 `.number-input-buttons` 一组样式中调整。

## 展开过渡与编辑交互修正（2026-11-02）

- 收起为悬浮块使用 200ms 左上角聚拢与模糊淡出，原生遮罩同步收缩；条状模式保留短淡出。关闭动效或减少动态效果时跳过。
- 从悬浮块展开使用 180ms 放大、模糊消除；从条状展开使用 220ms 顶部固定、向下揭示。
- 商店版在调整尺寸前暂时隐藏原生内容图层，先让完整页面解除悬浮块白色底色、完成布局，再动画展开原生遮罩。
  完成或失败时都尝试恢复图层可见性；等待绘制带超时回退，避免窗口隐藏导致过渡一直挂起。
- 这只是短暂的显示过渡，不改变正常使用时窗口和文字的不透明度。
- 待办卡片快速编辑、详情页编辑的描述框均支持右下角纵向拖动，最小高度 64px、最大高度 40vh，与新建待办一致。
- 详情页的日期和重复触发按钮按文字决定宽度，最小 144px；长文本可换行，窄布局中允许整行换行。
- 点击其他卡片进入详情前关闭快速编辑，未保存的输入直接丢弃，不调用保存接口；返回列表时恢复已保存内容。
- 公告文案集中在 `src/data/release.ts`，布局在 `src/components/StartupTip.tsx`，主题样式在 `src/styles/announcements.css`。
  公告按任务安排、窗口与专注、时间回顾、界面偏好介绍能力，保留本地存储和导出提示，不逐条列举实现和修复细节。
