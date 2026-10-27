# 事半·SemiDone

轻量级 Windows 桌面待办应用，采用 Tauri 2.0 + React 18 + TypeScript 技术栈。

## 技术栈

- **前端**: React 18, TypeScript, TailwindCSS, Zustand, Lucide React
- **桌面框架**: Tauri 2.0
- **后端**: Rust
- **构建工具**: Vite
- **数据存储**: 本地 JSON 文件

## 项目结构

```
src/              # React 前端源码
  api/           # API 层（localStorage、Tauri 调用）
  components/    # React 组件
  hooks/         # 自定义 Hooks
  pages/         # 页面组件
  store/         # Zustand 状态管理
  services/      # 业务服务（如提醒服务）
  styles/themes/ # 主题样式（light/dark/pink/glass）
  types/         # TypeScript 类型定义
  utils/         # 工具函数

src-tauri/       # Tauri/Rust 后端
  src/           # Rust 源码
  capabilities/  # Tauri 权限配置
  icons/         # 应用图标
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发模式 |
| `npm run build` | 构建前端 |
| `npm run build:tauri` | 构建 Tauri 应用 |
| `npm run check` | TypeScript 类型检查 |

## 注意事项

- 使用 `npm run dev` 启动开发，Vite 热更新会自动处理
- 构建产物（exe）输出到 `release/` 目录，该目录已加入 .gitignore
- Rust 构建产物在 `src-tauri/target/`，已加入 .gitignore
- 数据文件（user-data）已加入 .gitignore，敏感数据不上传

## Tauri 2.0 参数命名规则 ⚠️

**前端调用 Rust 命令时，参数名会自动转换：**
- Rust: `relative_path: String` → 前端: `relativePath`（蛇形转驼峰）
- 前端: `relativePath` → Rust: `relative_path`（驼峰转蛇形）

**所有前端 `invoke` 调用必须使用驼峰命名，前端 TypeScript 参数名应与 Rust 参数名对应（转换后匹配）：**

| Rust 参数 | 前端 invoke 参数 | 示例 |
|-----------|-----------------|------|
| `relative_path` | `relativePath` | `invoke('delete_attachment', { relativePath: 'path/to/file' })` |
| `task_id` | `taskId` | `invoke('delete_task_attachments', { taskId: 'xxx' })` |
| `json_data` | `jsonData` | `invoke('import_data', { jsonData: '{}' })` |
| `file_path` | `filePath` | `invoke('open_file_by_path', { filePath: 'xxx' })` |
| `folder_path` | `folderPath` | `invoke('open_folder_in_explorer', { folderPath: 'xxx' })` |
| `new_path` | `newPath` | `invoke('migrate_data_dir', { newPath: 'xxx' })` |

**常见错误：** 如果 Rust 收到 `relativePath` 而不是 `relative_path`，会报错 `missing required key relativePath`。

**Rust 端参数始终是蛇形命名**，但前端传参时不需要关心——前端传驼峰，Tauri 会自动转换。
