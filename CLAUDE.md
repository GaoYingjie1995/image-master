# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Image Master 是一个基于 Electron 的桌面图片管理应用，使用 Vue 3 + TypeScript 构建前端，better-sqlite3 作为本地数据库，sharp 处理图片缩略图，exifr 解析 EXIF 元数据。

## 常用命令

```bash
pnpm dev          # 启动开发服务器（Electron + Vite HMR）
pnpm build        # 构建生产版本
pnpm test         # 监听模式运行测试
pnpm test:run     # 单次运行所有测试
```

测试使用 Vitest，测试文件位于 `tests/` 目录，镜像 `src/` 结构（如 `tests/main/db/photo-repo.test.ts`）。运行单个测试文件：`pnpm test -- tests/main/db/photo-repo.test.ts`。

## 架构

### 三层结构（electron-vite）

```
src/
├── main/           # Electron 主进程
│   ├── db/         # better-sqlite3 数据库层（database.ts, *-repo.ts）
│   ├── ipc/        # IPC 处理器（每个模块一个文件）
│   ├── services/   # 业务逻辑（scanner, hasher, thumbnail, exif-parser 等）
│   └── utils/      # 工具函数（file-types, path-utils）
├── preload/        # 预加载脚本（contextBridge 暴露 electronAPI）
└── renderer/       # Vue 3 前端
    └── src/
        ├── components/  # Vue 组件（layout/, photo/, album/, cleanup/, common/）
        ├── stores/      # Pinia 状态管理（photos, albums, settings, selection）
        ├── views/       # 路由页面
        └── router/      # vue-router（Hash 模式）
```

### IPC 通信模式

主进程通过 `ipcMain.handle` 注册处理器，preload 脚本通过 `contextBridge.exposeInMainWorld('electronAPI', {...})` 暴露 API。渲染进程通过 `window.electronAPI` 调用。

IPC 通道命名约定：`模块:操作`，如 `photos:getAll`、`albums:create`、`cleanup:detectDuplicates`。

新增 IPC 端点需要：
1. 在 `src/main/ipc/` 中添加 `ipcMain.handle`
2. 在 `src/preload/index.ts` 中添加 `ipcRenderer.invoke` 调用
3. 渲染进程通过 `window.electronAPI` 使用

### 数据库层

`createDatabase()` 返回 better-sqlite3 实例（默认 `:memory:`），使用 WAL 模式和外键约束。Repository 模式：`photo-repo.ts`、`album-repo.ts`、`settings-repo.ts` 各自导出 `createXxxRepo(db)` 工厂函数。

Schema 定义在 `src/main/db/database.ts` 的 `SCHEMA` 常量中，表包括：`photos`、`albums`、`album_photos`、`smart_albums`、`settings`。

### 路径别名

在 `electron.vite.config.ts` 和 `tsconfig.json` 中配置：
- `@renderer` → `src/renderer/src`
- `@main` → `src/main`

## 关键技术约束

- Electron 31.x（降级版本，修复 better-sqlite3 原生模块兼容性）
- 使用 `pnpm` 作为包管理器（版本 10.12.3）
- `postinstall` 脚本会运行 `electron-builder install-app-deps` 来编译原生模块
- 窗口无边框（`frame: false`），使用 macOS 风格隐藏标题栏（`titleBarStyle: 'hiddenInset'`）

## UI 样式

Tailwind CSS 3.x，自定义暗色主题在 `tailwind.config.js` 中定义：
- 背景色系：`bg-deep`(最深), `bg-primary`, `bg-secondary`, `bg-tertiary`, `bg-hover`
- 强调色：`accent`（暖金色 #d4a574）
- 文字色：`text-primary`, `text-secondary`, `text-muted`
- 字体：`font-display`（Playfair Display）, `font-sans`（DM Sans）
