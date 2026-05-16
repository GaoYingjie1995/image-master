# Image Master 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款面向摄影师的 Electron + Vue 3 照片管理桌面应用，支持去重、RAW/JPEG 管理、相册、评分标签、批量操作、高级分析和 AI 标签。

**Architecture:** Electron 主进程负责文件系统操作、SQLite 数据库和图片处理；渲染进程使用 Vue 3 + Pinia + Tailwind CSS 构建 UI；通过 contextBridge 安全通信。

**Tech Stack:** Electron 30+, Vue 3, Pinia, Vue Router, Tailwind CSS, SQLite (better-sqlite3), Sharp, exifr, ONNX Runtime

---

## 文件结构

```
image-master/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── electron-builder.yml
├── src/
│   ├── main/
│   │   ├── index.ts                    # Electron 入口，窗口管理
│   │   ├── ipc/
│   │   │   ├── photos.ts              # 照片相关 IPC 处理器
│   │   │   ├── albums.ts              # 相册相关 IPC 处理器
│   │   │   ├── cleanup.ts             # 清理工具 IPC 处理器
│   │   │   └── settings.ts            # 设置相关 IPC 处理器
│   │   ├── services/
│   │   │   ├── scanner.ts             # 文件扫描服务
│   │   │   ├── hasher.ts              # 文件哈希服务
│   │   │   ├── exif-parser.ts         # EXIF 解析服务
│   │   │   ├── thumbnail.ts           # 缩略图生成服务
│   │   │   ├── duplicate-detector.ts  # 重复检测服务
│   │   │   ├── raw-manager.ts         # RAW/JPEG 配对管理
│   │   │   ├── batch-operations.ts    # 批量重命名/导出
│   │   │   └── ai-service.ts          # AI 标签服务
│   │   ├── db/
│   │   │   ├── database.ts            # SQLite 连接与初始化
│   │   │   ├── photo-repo.ts          # 照片数据仓库
│   │   │   ├── album-repo.ts          # 相册数据仓库
│   │   │   └── settings-repo.ts       # 设置数据仓库
│   │   └── utils/
│   │       ├── file-types.ts          # 文件类型判断
│   │       └── path-utils.ts          # 路径工具函数
│   ├── preload/
│   │   └── index.ts                   # contextBridge 暴露 API
│   └── renderer/
│       ├── index.html
│       ├── src/
│       │   ├── main.ts                # Vue 入口
│       │   ├── App.vue                # 根组件
│       │   ├── router/
│       │   │   └── index.ts           # Vue Router 配置
│       │   ├── stores/
│       │   │   ├── photos.ts          # 照片状态管理
│       │   │   ├── albums.ts          # 相册状态管理
│       │   │   ├── selection.ts       # 选择状态管理
│       │   │   └── settings.ts        # 设置状态管理
│       │   ├── views/
│       │   │   ├── AllPhotos.vue      # 所有照片视图
│       │   │   ├── AlbumView.vue      # 相册视图
│       │   │   ├── DuplicateView.vue  # 去重视图
│       │   │   ├── CleanupView.vue    # RAW清理视图
│       │   │   ├── BatchRenameView.vue # 批量重命名视图
│       │   │   ├── BatchExportView.vue # 批量导出视图
│       │   │   ├── MapView.vue        # 地图视图
│       │   │   └── SettingsView.vue   # 设置视图
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── TitleBar.vue   # 标题栏
│       │   │   │   ├── Sidebar.vue    # 侧边导航
│       │   │   │   ├── Toolbar.vue    # 工具栏
│       │   │   │   └── StatusBar.vue  # 状态栏
│       │   │   ├── photo/
│       │   │   │   ├── PhotoGrid.vue  # 照片网格（虚拟滚动）
│       │   │   │   ├── PhotoItem.vue  # 照片缩略图项
│       │   │   │   ├── PhotoPreview.vue # 全屏预览
│       │   │   │   ├── InfoPanel.vue  # 右侧信息面板
│       │   │   │   └── Histogram.vue  # 直方图
│       │   │   ├── album/
│       │   │   │   ├── AlbumList.vue  # 相册列表
│       │   │   │   └── AlbumDialog.vue # 创建/编辑相册对话框
│       │   │   ├── cleanup/
│       │   │   │   ├── DuplicateGroup.vue # 重复组展示
│       │   │   │   └── RawPairList.vue # RAW配对列表
│       │   │   └── common/
│       │   │       ├── ConfirmDialog.vue # 确认对话框
│       │   │       ├── ContextMenu.vue # 右键菜单
│       │   │       └── RatingStars.vue # 星级评分组件
│       │   └── composables/
│       │       ├── useVirtualScroll.ts # 虚拟滚动
│       │       ├── useKeyboard.ts     # 快捷键
│       │       └── useSelection.ts    # 多选逻辑
│       └── src/styles/
│           └── main.css               # Tailwind 入口
├── resources/
│   └── icon.png
└── tests/
    ├── main/
    │   ├── services/
    │   │   ├── hasher.test.ts
    │   │   ├── scanner.test.ts
    │   │   └── duplicate-detector.test.ts
    │   └── db/
    │       ├── photo-repo.test.ts
    │       └── album-repo.test.ts
    └── renderer/
        └── components/
            └── PhotoGrid.test.ts
```

---

## Phase 1: 项目脚手架与基础设施

### Task 1: 初始化 Electron + Vue 3 + Tailwind 项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `electron-builder.yml`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.ts`
- Create: `src/renderer/src/App.vue`
- Create: `src/renderer/src/styles/main.css`

- [ ] **Step 1: 初始化项目并安装依赖**

```bash
cd /Users/ctt/workspace/Frontend/Electron/image-master
npm init -y
npm install electron electron-vite vite vue vue-router pinia tailwindcss postcss autoprefixer better-sqlite3 sharp exifr
npm install -D typescript @types/node @types/better-sqlite3 @vitejs/plugin-vue electron-builder vitest @vue/test-utils
```

- [ ] **Step 2: 创建 package.json 脚本**

```json
{
  "name": "image-master",
  "version": "0.1.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

- [ ] **Step 3: 创建 TypeScript 配置**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@renderer/*": ["./src/renderer/src/*"],
      "@main/*": ["./src/main/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "src/main/**/*.ts", "src/preload/**/*.ts"]
}
```

- [ ] **Step 4: 创建 Vite 配置**

`vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@main': resolve(__dirname, 'src/main')
    }
  }
})
```

- [ ] **Step 5: 创建 Tailwind 配置**

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#08080a',
          primary: '#0e0e12',
          secondary: '#16161c',
          tertiary: '#1e1e26',
          hover: '#262630'
        },
        accent: {
          DEFAULT: '#d4a574',
          dim: 'rgba(212,165,116,0.15)',
          glow: 'rgba(212,165,116,0.08)'
        },
        text: {
          primary: '#e8e4df',
          secondary: '#8a8690',
          muted: '#5a5660'
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'sans-serif']
      }
    }
  },
  plugins: []
}
```

`postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 6: 创建 Electron 主进程入口**

`src/main/index.ts`:
```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] **Step 7: 创建预加载脚本**

`src/preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  send: (channel: string, data: unknown) => ipcRenderer.send(channel, data),
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  }
})
```

- [ ] **Step 8: 创建 Vue 入口和根组件**

`src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Master</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet">
</head>
<body class="bg-bg-deep text-text-primary font-sans">
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/renderer/src/styles/main.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e1e26; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #262630; }
}
```

`src/renderer/src/main.ts`:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

`src/renderer/src/App.vue`:
```vue
<script setup lang="ts">
import TitleBar from './components/layout/TitleBar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import StatusBar from './components/layout/StatusBar.vue'
</script>

<template>
  <div class="flex flex-col h-screen bg-bg-deep">
    <TitleBar />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <main class="flex-1 overflow-hidden">
        <router-view />
      </main>
    </div>
    <StatusBar />
  </div>
</template>
```

- [ ] **Step 9: 验证项目启动**

```bash
npm run dev
```

Expected: Electron 窗口打开，显示空白的深色界面。

- [ ] **Step 10: 提交**

```bash
git init
echo "node_modules/\ndist/\n.superpowers/" > .gitignore
git add -A
git commit -m "feat: 初始化 Electron + Vue 3 + Tailwind 项目脚手架"
```

---

### Task 2: 数据库层

**Files:**
- Create: `src/main/db/database.ts`
- Create: `src/main/db/photo-repo.ts`
- Create: `src/main/db/album-repo.ts`
- Create: `src/main/db/settings-repo.ts`
- Create: `tests/main/db/photo-repo.test.ts`
- Create: `tests/main/db/album-repo.test.ts`

- [ ] **Step 1: 编写数据库初始化测试**

`tests/main/db/photo-repo.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createPhotoRepo } from '../../src/main/db/photo-repo'

describe('PhotoRepo', () => {
  let db: Database.Database
  let repo: ReturnType<typeof createPhotoRepo>

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash TEXT,
        format TEXT NOT NULL,
        raw_pair_id INTEGER,
        width INTEGER,
        height INTEGER,
        rating INTEGER DEFAULT 0,
        color_label TEXT,
        is_rejected INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL,
        shot_at TEXT,
        camera_model TEXT,
        lens_model TEXT,
        iso INTEGER,
        aperture REAL,
        shutter_speed TEXT,
        gps_lat REAL,
        gps_lng REAL
      )
    `)
    repo = createPhotoRepo(db)
  })

  afterEach(() => { db.close() })

  it('插入并查询照片', () => {
    const id = repo.insert({
      file_path: '/photos/test.jpg',
      file_name: 'test.jpg',
      file_size: 1024,
      format: 'jpeg',
      created_at: '2024-01-15T00:00:00Z',
      modified_at: '2024-01-15T00:00:00Z'
    })
    expect(id).toBe(1)

    const photo = repo.getById(id)
    expect(photo).toBeTruthy()
    expect(photo!.file_name).toBe('test.jpg')
  })

  it('按评分筛选', () => {
    repo.insert({ file_path: '/a.jpg', file_name: 'a.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '', rating: 5 })
    repo.insert({ file_path: '/b.jpg', file_name: 'b.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '', rating: 0 })

    const rated = repo.getByRating(5)
    expect(rated).toHaveLength(1)
  })

  it('更新评分', () => {
    const id = repo.insert({ file_path: '/a.jpg', file_name: 'a.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '' })
    repo.updateRating(id, 4)
    expect(repo.getById(id)!.rating).toBe(4)
  })

  it('批量更新评分', () => {
    const id1 = repo.insert({ file_path: '/a.jpg', file_name: 'a.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '' })
    const id2 = repo.insert({ file_path: '/b.jpg', file_name: 'b.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '' })
    repo.batchUpdateRating([id1, id2], 3)
    expect(repo.getById(id1)!.rating).toBe(3)
    expect(repo.getById(id2)!.rating).toBe(3)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run tests/main/db/photo-repo.test.ts
```

Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现数据库初始化**

`src/main/db/database.ts`:
```typescript
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT,
  format TEXT NOT NULL,
  raw_pair_id INTEGER,
  width INTEGER,
  height INTEGER,
  rating INTEGER DEFAULT 0,
  color_label TEXT,
  is_rejected INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  modified_at TEXT NOT NULL,
  shot_at TEXT,
  camera_model TEXT,
  lens_model TEXT,
  iso INTEGER,
  aperture REAL,
  shutter_speed TEXT,
  gps_lat REAL,
  gps_lng REAL
);

CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  folder_path TEXT UNIQUE NOT NULL,
  cover_photo_id INTEGER,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS album_photos (
  album_id INTEGER NOT NULL,
  photo_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (album_id, photo_id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS smart_albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rules TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON photos(file_hash);
CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating);
CREATE INDEX IF NOT EXISTS idx_photos_shot_at ON photos(shot_at);
CREATE INDEX IF NOT EXISTS idx_photos_camera_model ON photos(camera_model);
CREATE INDEX IF NOT EXISTS idx_photos_format ON photos(format);
`

export function createDatabase(dbPath?: string): Database.Database {
  const path = dbPath || join(app.getPath('userData'), 'image-master.db')
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}
```

- [ ] **Step 4: 实现照片数据仓库**

`src/main/db/photo-repo.ts`:
```typescript
import Database from 'better-sqlite3'

interface PhotoInsert {
  file_path: string
  file_name: string
  file_size: number
  file_hash?: string
  format: string
  raw_pair_id?: number
  width?: number
  height?: number
  rating?: number
  color_label?: string
  is_rejected?: number
  created_at: string
  modified_at: string
  shot_at?: string
  camera_model?: string
  lens_model?: string
  iso?: number
  aperture?: number
  shutter_speed?: string
  gps_lat?: number
  gps_lng?: number
}

interface PhotoRow {
  id: number
  file_path: string
  file_name: string
  file_size: number
  file_hash: string | null
  format: string
  raw_pair_id: number | null
  width: number | null
  height: number | null
  rating: number
  color_label: string | null
  is_rejected: number
  created_at: string
  modified_at: string
  shot_at: string | null
  camera_model: string | null
  lens_model: string | null
  iso: number | null
  aperture: number | null
  shutter_speed: string | null
  gps_lat: number | null
  gps_lng: number | null
}

export function createPhotoRepo(db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT INTO photos (file_path, file_name, file_size, file_hash, format, raw_pair_id, width, height, rating, color_label, is_rejected, created_at, modified_at, shot_at, camera_model, lens_model, iso, aperture, shutter_speed, gps_lat, gps_lng)
    VALUES (@file_path, @file_name, @file_size, @file_hash, @format, @raw_pair_id, @width, @height, @rating, @color_label, @is_rejected, @created_at, @modified_at, @shot_at, @camera_model, @lens_model, @iso, @aperture, @shutter_speed, @gps_lat, @gps_lng)
  `)

  return {
    insert(photo: PhotoInsert): number {
      const result = insertStmt.run({
        file_hash: null, raw_pair_id: null, width: null, height: null,
        rating: 0, color_label: null, is_rejected: 0, shot_at: null,
        camera_model: null, lens_model: null, iso: null, aperture: null,
        shutter_speed: null, gps_lat: null, gps_lng: null,
        ...photo
      })
      return Number(result.lastInsertRowid)
    },

    getById(id: number): PhotoRow | undefined {
      return db.prepare('SELECT * FROM photos WHERE id = ?').get(id) as PhotoRow | undefined
    },

    getByFilePath(path: string): PhotoRow | undefined {
      return db.prepare('SELECT * FROM photos WHERE file_path = ?').get(path) as PhotoRow | undefined
    },

    getByRating(rating: number): PhotoRow[] {
      return db.prepare('SELECT * FROM photos WHERE rating = ?').all(rating) as PhotoRow[]
    },

    getByFormat(format: string): PhotoRow[] {
      return db.prepare('SELECT * FROM photos WHERE format = ?').all(format) as PhotoRow[]
    },

    getToday(): PhotoRow[] {
      const today = new Date().toISOString().split('T')[0]
      return db.prepare("SELECT * FROM photos WHERE created_at LIKE ? || '%'").all(today) as PhotoRow[]
    },

    getAll(options?: { orderBy?: string; limit?: number; offset?: number }): PhotoRow[] {
      const order = options?.orderBy || 'shot_at DESC, created_at DESC'
      const limit = options?.limit || 100
      const offset = options?.offset || 0
      return db.prepare(`SELECT * FROM photos ORDER BY ${order} LIMIT ? OFFSET ?`).all(limit, offset) as PhotoRow[]
    },

    count(): number {
      return (db.prepare('SELECT COUNT(*) as count FROM photos').get() as { count: number }).count
    },

    updateRating(id: number, rating: number): void {
      db.prepare('UPDATE photos SET rating = ? WHERE id = ?').run(rating, id)
    },

    updateColorLabel(id: number, label: string | null): void {
      db.prepare('UPDATE photos SET color_label = ? WHERE id = ?').run(label, id)
    },

    updateRejected(id: number, rejected: boolean): void {
      db.prepare('UPDATE photos SET is_rejected = ? WHERE id = ?').run(rejected ? 1 : 0, id)
    },

    batchUpdateRating(ids: number[], rating: number): void {
      const stmt = db.prepare('UPDATE photos SET rating = ? WHERE id = ?')
      const batch = db.transaction((items: number[]) => {
        for (const id of items) stmt.run(rating, id)
      })
      batch(ids)
    },

    batchDelete(ids: number[]): void {
      const stmt = db.prepare('DELETE FROM photos WHERE id = ?')
      const batch = db.transaction((items: number[]) => {
        for (const id of items) stmt.run(id)
      })
      batch(ids)
    },

    updateHash(id: number, hash: string): void {
      db.prepare('UPDATE photos SET file_hash = ? WHERE id = ?').run(hash, id)
    },

    getDuplicates(): PhotoRow[][] {
      const groups = db.prepare(`
        SELECT file_hash FROM photos
        WHERE file_hash IS NOT NULL
        GROUP BY file_hash HAVING COUNT(*) > 1
      `).all() as { file_hash: string }[]

      return groups.map(g =>
        (db.prepare('SELECT * FROM photos WHERE file_hash = ?').all(g.file_hash) as PhotoRow[])
      )
    },

    getOrphanedRaws(): PhotoRow[] {
      return db.prepare(`
        SELECT p.* FROM photos p
        WHERE p.format IN ('cr2','cr3','nef','arw','orf','raf','dng','pef','srw','rw2')
        AND p.raw_pair_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM photos j
          WHERE j.file_name = REPLACE(p.file_name, SUBSTR(p.file_name, INSTR(p.file_name, '.')), '.jpg')
          OR j.file_name = REPLACE(p.file_name, SUBSTR(p.file_name, INSTR(p.file_name, '.')), '.jpeg')
        )
      `).all() as PhotoRow[]
    }
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run tests/main/db/photo-repo.test.ts
```

Expected: PASS。

- [ ] **Step 6: 编写相册仓库测试**

`tests/main/db/album-repo.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../../src/main/db/album-repo'

describe('AlbumRepo', () => {
  let db: Database.Database
  let repo: ReturnType<typeof createAlbumRepo>

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        folder_path TEXT UNIQUE NOT NULL,
        cover_photo_id INTEGER,
        description TEXT,
        created_at TEXT NOT NULL
      )
    `)
    repo = createAlbumRepo(db)
  })

  afterEach(() => { db.close() })

  it('创建并查询相册', () => {
    const id = repo.create({ name: '旅行', folder_path: '/photos/旅行', created_at: '2024-01-15' })
    const album = repo.getById(id)
    expect(album!.name).toBe('旅行')
  })

  it('列出所有相册', () => {
    repo.create({ name: 'A', folder_path: '/a', created_at: '2024-01-01' })
    repo.create({ name: 'B', folder_path: '/b', created_at: '2024-01-02' })
    expect(repo.getAll()).toHaveLength(2)
  })

  it('删除相册', () => {
    const id = repo.create({ name: 'Test', folder_path: '/test', created_at: '' })
    repo.delete(id)
    expect(repo.getById(id)).toBeUndefined()
  })
})
```

- [ ] **Step 7: 实现相册数据仓库**

`src/main/db/album-repo.ts`:
```typescript
import Database from 'better-sqlite3'

interface AlbumInsert {
  name: string
  folder_path: string
  cover_photo_id?: number
  description?: string
  created_at: string
}

interface AlbumRow {
  id: number
  name: string
  folder_path: string
  cover_photo_id: number | null
  description: string | null
  created_at: string
}

export function createAlbumRepo(db: Database.Database) {
  return {
    create(album: AlbumInsert): number {
      const result = db.prepare(`
        INSERT INTO albums (name, folder_path, cover_photo_id, description, created_at)
        VALUES (@name, @folder_path, @cover_photo_id, @description, @created_at)
      `).run({ cover_photo_id: null, description: null, ...album })
      return Number(result.lastInsertRowid)
    },

    getById(id: number): AlbumRow | undefined {
      return db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as AlbumRow | undefined
    },

    getAll(): AlbumRow[] {
      return db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all() as AlbumRow[]
    },

    delete(id: number): void {
      db.prepare('DELETE FROM albums WHERE id = ?').run(id)
    },

    rename(id: number, name: string, newPath: string): void {
      db.prepare('UPDATE albums SET name = ?, folder_path = ? WHERE id = ?').run(name, newPath, id)
    },

    addPhoto(albumId: number, photoId: number, sortOrder: number = 0): void {
      db.prepare('INSERT OR IGNORE INTO album_photos (album_id, photo_id, sort_order) VALUES (?, ?, ?)').run(albumId, photoId, sortOrder)
    },

    removePhoto(albumId: number, photoId: number): void {
      db.prepare('DELETE FROM album_photos WHERE album_id = ? AND photo_id = ?').run(albumId, photoId)
    },

    getPhotos(albumId: number): { photo_id: number; sort_order: number }[] {
      return db.prepare('SELECT photo_id, sort_order FROM album_photos WHERE album_id = ? ORDER BY sort_order').all(albumId) as { photo_id: number; sort_order: number }[]
    },

    setCover(albumId: number, photoId: number): void {
      db.prepare('UPDATE albums SET cover_photo_id = ? WHERE id = ?').run(photoId, albumId)
    }
  }
}
```

- [ ] **Step 8: 运行全部测试**

```bash
npx vitest run
```

Expected: 全部 PASS。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "feat: 实现 SQLite 数据库层（照片仓库 + 相册仓库）"
```

---

## Phase 2: 主进程服务层

### Task 3: 文件扫描与 EXIF 解析

**Files:**
- Create: `src/main/services/scanner.ts`
- Create: `src/main/services/exif-parser.ts`
- Create: `src/main/utils/file-types.ts`
- Create: `src/main/utils/path-utils.ts`

- [ ] **Step 1: 实现文件类型工具**

`src/main/utils/file-types.ts`:
```typescript
const RAW_EXTENSIONS = new Set(['cr2', 'cr3', 'nef', 'arw', 'orf', 'raf', 'dng', 'pef', 'srw', 'rw2'])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp', 'gif', ...RAW_EXTENSIONS])

export function isRaw(ext: string): boolean {
  return RAW_EXTENSIONS.has(ext.toLowerCase())
}

export function isImage(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toLowerCase())
}

export function getFormat(ext: string): string {
  const e = ext.toLowerCase()
  if (RAW_EXTENSIONS.has(e)) return 'raw'
  return e
}

export function getRawExtensions(): string[] {
  return Array.from(RAW_EXTENSIONS)
}
```

`src/main/utils/path-utils.ts`:
```typescript
import { basename, extname, join } from 'path'

export function getFileNameWithoutExt(filePath: string): string {
  const name = basename(filePath)
  const ext = extname(name)
  return name.slice(0, -ext.length)
}

export function getJpegPairForRaw(rawPath: string): string[] {
  const base = getFileNameWithoutExt(rawPath)
  const dir = rawPath.slice(0, rawPath.lastIndexOf('/'))
  return [join(dir, base + '.jpg'), join(dir, base + '.jpeg')]
}
```

- [ ] **Step 2: 实现 EXIF 解析服务**

`src/main/services/exif-parser.ts`:
```typescript
import exifr from 'exifr'

interface ExifData {
  shot_at?: string
  camera_model?: string
  lens_model?: string
  iso?: number
  aperture?: number
  shutter_speed?: string
  width?: number
  height?: number
  gps_lat?: number
  gps_lng?: number
}

export async function parseExif(filePath: string): Promise<ExifData> {
  try {
    const exif = await exifr.parse(filePath, {
      pick: ['DateTimeOriginal', 'Model', 'LensModel', 'ISO', 'FNumber', 'ExposureTime', 'ImageWidth', 'ImageHeight', 'GPSLatitude', 'GPSLongitude']
    })

    if (!exif) return {}

    return {
      shot_at: exif.DateTimeOriginal?.toISOString(),
      camera_model: exif.Model,
      lens_model: exif.LensModel,
      iso: exif.ISO,
      aperture: exif.FNumber,
      shutter_speed: exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : undefined,
      width: exif.ImageWidth || exif.ExifImageWidth,
      height: exif.ImageHeight || exif.ExifImageHeight,
      gps_lat: exif.GPSLatitude,
      gps_lng: exif.GPSLongitude
    }
  } catch {
    return {}
  }
}
```

- [ ] **Step 3: 实现文件扫描服务**

`src/main/services/scanner.ts`:
```typescript
import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'
import { isImage, getFormat } from '../utils/file-types'
import { parseExif } from './exif-parser'
import { createPhotoRepo, type PhotoInsert } from '../db/photo-repo'

interface ScanOptions {
  folderPath: string
  recursive?: boolean
  onProgress?: (current: number, total: number) => void
}

export async function scanFolder(
  db: Database.Database,
  options: ScanOptions
): Promise<number> {
  const repo = createPhotoRepo(db)
  const files = await collectFiles(options.folderPath, options.recursive !== false)
  const images = files.filter(f => isImage(extname(f).slice(1)))
  let count = 0

  for (let i = 0; i < images.length; i++) {
    const filePath = images[i]
    const existing = repo.getByFilePath(filePath)
    if (existing) continue

    const ext = extname(filePath).slice(1).toLowerCase()
    const fileStat = await stat(filePath)
    const exif = await parseExif(filePath)

    repo.insert({
      file_path: filePath,
      file_name: fileStat.name || filePath.split('/').pop()!,
      file_size: fileStat.size,
      format: getFormat(ext),
      created_at: fileStat.birthtime.toISOString(),
      modified_at: fileStat.mtime.toISOString(),
      ...exif
    })

    count++
    options.onProgress?.(i + 1, images.length)
  }

  return count
}

async function collectFiles(dir: string, recursive: boolean): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory() && recursive) {
      files.push(...await collectFiles(fullPath, true))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 实现文件扫描和 EXIF 解析服务"
```

---

### Task 4: 文件哈希与缩略图

**Files:**
- Create: `src/main/services/hasher.ts`
- Create: `src/main/services/thumbnail.ts`

- [ ] **Step 1: 实现哈希服务**

`src/main/services/hasher.ts`:
```typescript
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'

export async function hashFileQuick(filePath: string): Promise<string> {
  const fileStat = await stat(filePath)
  const sizePrefix = fileStat.size.toString()

  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath, { start: 0, end: 65535 })
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(sizePrefix + ':' + hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function hashFileFull(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}
```

- [ ] **Step 2: 实现缩略图服务**

`src/main/services/thumbnail.ts`:
```typescript
import sharp from 'sharp'
import { join } from 'path'
import { mkdir, access } from 'fs/promises'
import { app } from 'electron'

const THUMB_SIZE = 300
const THUMB_QUALITY = 80

export function getThumbnailDir(): string {
  return join(app.getPath('userData'), 'thumbnails')
}

export async function ensureThumbnailDir(): Promise<string> {
  const dir = getThumbnailDir()
  await mkdir(dir, { recursive: true })
  return dir
}

export async function getThumbnailPath(photoId: number): Promise<string> {
  const dir = await ensureThumbnailDir()
  return join(dir, `${photoId}.webp`)
}

export async function generateThumbnail(filePath: string, outputPath: string): Promise<void> {
  await sharp(filePath)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toFile(outputPath)
}

export async function thumbnailExists(photoId: number): Promise<boolean> {
  try {
    await access(await getThumbnailPath(photoId))
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: 实现文件哈希和缩略图生成服务"
```

---

### Task 5: 重复检测与 RAW 管理

**Files:**
- Create: `src/main/services/duplicate-detector.ts`
- Create: `src/main/services/raw-manager.ts`

- [ ] **Step 1: 实现重复检测服务**

`src/main/services/duplicate-detector.ts`:
```typescript
import { hashFileQuick, hashFileFull } from './hasher'
import { createPhotoRepo } from '../db/photo-repo'
import Database from 'better-sqlite3'

interface DuplicateGroup {
  hash: string
  photos: { id: number; file_path: string; file_name: string; file_size: number }[]
}

export async function detectDuplicates(
  db: Database.Database,
  folderPath: string,
  onProgress?: (phase: string, current: number, total: number) => void
): Promise<DuplicateGroup[]> {
  const repo = createPhotoRepo(db)
  const photos = db.prepare(`
    SELECT id, file_path, file_name, file_size FROM photos
    WHERE file_path LIKE ? || '%'
  `).all(folderPath) as { id: number; file_path: string; file_name: string; file_size: number }[]

  // Phase 1: Quick hash
  const quickHashes = new Map<string, typeof photos>()
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const quickHash = await hashFileQuick(photo.file_path)
    const group = quickHashes.get(quickHash) || []
    group.push(photo)
    quickHashes.set(quickHash, group)
    onProgress?.('快速筛选', i + 1, photos.length)
  }

  // Phase 2: Full hash for candidates
  const candidates = Array.from(quickHashes.values()).filter(g => g.length > 1)
  const groups: DuplicateGroup[] = []

  for (let i = 0; i < candidates.length; i++) {
    const group = candidates[i]
    const fullHashMap = new Map<string, typeof photos>()

    for (const photo of group) {
      const fullHash = await hashFileFull(photo.file_path)
      repo.updateHash(photo.id, fullHash)
      const dupGroup = fullHashMap.get(fullHash) || []
      dupGroup.push(photo)
      fullHashMap.set(fullHash, dupGroup)
    }

    for (const [hash, dups] of fullHashMap) {
      if (dups.length > 1) {
        groups.push({ hash, photos: dups })
      }
    }

    onProgress?.('精确比对', i + 1, candidates.length)
  }

  return groups
}
```

- [ ] **Step 2: 实现 RAW 管理服务**

`src/main/services/raw-manager.ts`:
```typescript
import { createPhotoRepo } from '../db/photo-repo'
import { getFileNameWithoutExt } from '../utils/path-utils'
import Database from 'better-sqlite3'

interface RawPair {
  raw: { id: number; file_path: string; file_name: string }
  jpeg: { id: number; file_path: string; file_name: string } | null
}

export function findRawPairs(db: Database.Database, folderPath: string): RawPair[] {
  const repo = createPhotoRepo(db)
  const raws = db.prepare(`
    SELECT * FROM photos
    WHERE file_path LIKE ? || '%'
    AND format IN ('cr2','cr3','nef','arw','orf','raf','dng','pef','srw','rw2')
  `).all(folderPath) as { id: number; file_path: string; file_name: string }[]

  return raws.map(raw => {
    const baseName = getFileNameWithoutExt(raw.file_path).toLowerCase()
    const jpeg = db.prepare(`
      SELECT * FROM photos
      WHERE (LOWER(file_name) = ? || '.jpg' OR LOWER(file_name) = ? || '.jpeg')
      AND file_path LIKE ? || '%'
    `).get(baseName, baseName, folderPath) as { id: number; file_path: string; file_name: string } | undefined

    return { raw, jpeg: jpeg || null }
  })
}

export function findOrphanedRaws(db: Database.Database, folderPath: string): RawPair[] {
  return findRawPairs(db, folderPath).filter(pair => !pair.jpeg)
}
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: 实现重复检测和 RAW/JPEG 配对管理服务"
```

---

### Task 6: 批量操作服务

**Files:**
- Create: `src/main/services/batch-operations.ts`

- [ ] **Step 1: 实现批量重命名和导出**

`src/main/services/batch-operations.ts`:
```typescript
import { rename, copyFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import sharp from 'sharp'

interface RenameTemplate {
  date?: string
  time?: string
  camera?: string
  lens?: string
  iso?: number
  seq: number
  seqPad?: number
}

export function applyRenameTemplate(template: string, vars: RenameTemplate): string {
  let result = template
  result = result.replace(/\{date\}/g, vars.date || '')
  result = result.replace(/\{time\}/g, vars.time || '')
  result = result.replace(/\{camera\}/g, vars.camera || '')
  result = result.replace(/\{lens\}/g, vars.lens || '')
  result = result.replace(/\{iso\}/g, vars.iso?.toString() || '')
  result = result.replace(/\{seq:(\d+)\}/g, (_, pad) => {
    return vars.seq.toString().padStart(parseInt(pad), '0')
  })
  result = result.replace(/\{seq\}/g, vars.seq.toString())
  return result
}

export async function batchRename(
  photos: { id: number; file_path: string; shot_at?: string; camera_model?: string; lens_model?: string; iso?: number }[],
  template: string,
  startSeq: number = 1
): Promise<{ oldPath: string; newPath: string }[]> {
  const results: { oldPath: string; newPath: string }[] = []

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const ext = extname(photo.file_path)
    const shotDate = photo.shot_at ? new Date(photo.shot_at) : null
    const vars: RenameTemplate = {
      date: shotDate?.toISOString().split('T')[0].replace(/-/g, ''),
      time: shotDate?.toTimeString().split(' ')[0].replace(/:/g, ''),
      camera: photo.camera_model,
      lens: photo.lens_model,
      iso: photo.iso,
      seq: startSeq + i,
      seqPad: 3
    }

    const newName = applyRenameTemplate(template, vars) + ext
    const dir = photo.file_path.slice(0, photo.file_path.lastIndexOf('/'))
    const newPath = join(dir, newName)

    await rename(photo.file_path, newPath)
    results.push({ oldPath: photo.file_path, newPath })
  }

  return results
}

interface ExportOptions {
  outputDir: string
  format: 'jpeg' | 'png' | 'webp' | 'tiff'
  quality: number
  maxWidth?: number
  maxHeight?: number
  keepExif: boolean
  onProgress?: (current: number, total: number) => void
}

export async function batchExport(
  photos: { file_path: string; file_name: string }[],
  options: ExportOptions
): Promise<void> {
  await mkdir(options.outputDir, { recursive: true })

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const baseName = photo.file_name.replace(/\.[^.]+$/, '')
    const outPath = join(options.outputDir, `${baseName}.${options.format}`)

    let pipeline = sharp(photo.file_path)

    if (options.maxWidth || options.maxHeight) {
      pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    switch (options.format) {
      case 'jpeg': pipeline = pipeline.jpeg({ quality: options.quality }); break
      case 'png': pipeline = pipeline.png(); break
      case 'webp': pipeline = pipeline.webp({ quality: options.quality }); break
      case 'tiff': pipeline = pipeline.tiff(); break
    }

    await pipeline.toFile(outPath)
    options.onProgress?.(i + 1, photos.length)
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "feat: 实现批量重命名和批量导出服务"
```

---

### Task 7: IPC 通信层

**Files:**
- Create: `src/main/ipc/photos.ts`
- Create: `src/main/ipc/albums.ts`
- Create: `src/main/ipc/cleanup.ts`
- Create: `src/main/ipc/settings.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: 实现照片 IPC 处理器**

`src/main/ipc/photos.ts`:
```typescript
import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { createPhotoRepo } from '../db/photo-repo'
import { scanFolder } from '../services/scanner'
import { getThumbnailPath, generateThumbnail } from '../services/thumbnail'

export function registerPhotoIpc(db: Database.Database) {
  const repo = createPhotoRepo(db)

  ipcMain.handle('photos:getAll', (_event, options?) => {
    return repo.getAll(options)
  })

  ipcMain.handle('photos:getById', (_event, id: number) => {
    return repo.getById(id)
  })

  ipcMain.handle('photos:getToday', () => {
    return repo.getToday()
  })

  ipcMain.handle('photos:count', () => {
    return repo.count()
  })

  ipcMain.handle('photos:updateRating', (_event, id: number, rating: number) => {
    repo.updateRating(id, rating)
  })

  ipcMain.handle('photos:batchUpdateRating', (_event, ids: number[], rating: number) => {
    repo.batchUpdateRating(ids, rating)
  })

  ipcMain.handle('photos:updateColorLabel', (_event, id: number, label: string | null) => {
    repo.updateColorLabel(id, label)
  })

  ipcMain.handle('photos:updateRejected', (_event, id: number, rejected: boolean) => {
    repo.updateRejected(id, rejected)
  })

  ipcMain.handle('photos:batchDelete', async (_event, ids: number[]) => {
    const photos = ids.map(id => repo.getById(id)).filter(Boolean)
    const { unlink } = await import('fs/promises')
    for (const photo of photos) {
      if (photo) await unlink(photo.file_path).catch(() => {})
    }
    repo.batchDelete(ids)
  })

  ipcMain.handle('photos:importFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })

    if (result.canceled || !result.filePaths[0]) return

    const folderPath = result.filePaths[0]
    const count = await scanFolder(db, {
      folderPath,
      onProgress: (current, total) => {
        win.webContents.send('photos:scanProgress', { current, total })
      }
    })

    return { folderPath, count }
  })

  ipcMain.handle('photos:getThumbnail', async (_event, photoId: number) => {
    const photo = repo.getById(photoId)
    if (!photo) return null

    const thumbPath = await getThumbnailPath(photoId)
    try {
      const { access } = await import('fs/promises')
      await access(thumbPath)
    } catch {
      await generateThumbnail(photo.file_path, thumbPath)
    }

    return thumbPath
  })
}
```

- [ ] **Step 2: 实现相册 IPC 处理器**

`src/main/ipc/albums.ts`:
```typescript
import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../db/album-repo'
import { mkdir, rename } from 'fs/promises'
import { join } from 'path'

export function registerAlbumIpc(db: Database.Database) {
  const repo = createAlbumRepo(db)

  ipcMain.handle('albums:getAll', () => {
    return repo.getAll()
  })

  ipcMain.handle('albums:create', async (_event, name: string, parentPath: string) => {
    const folderPath = join(parentPath, name)
    await mkdir(folderPath, { recursive: true })
    return repo.create({ name, folder_path: folderPath, created_at: new Date().toISOString() })
  })

  ipcMain.handle('albums:delete', async (_event, id: number) => {
    const album = repo.getById(id)
    if (!album) return

    const { rm } = await import('fs/promises')
    await rm(album.folder_path, { recursive: true, force: true })
    repo.delete(id)
  })

  ipcMain.handle('albums:rename', async (_event, id: number, newName: string) => {
    const album = repo.getById(id)
    if (!album) return

    const parentDir = album.folder_path.slice(0, album.folder_path.lastIndexOf('/'))
    const newPath = join(parentDir, newName)
    await rename(album.folder_path, newPath)
    repo.rename(id, newName, newPath)
  })

  ipcMain.handle('albums:addPhoto', async (_event, albumId: number, photoId: number, photoPath: string) => {
    const album = repo.getById(albumId)
    if (!album) return

    const fileName = photoPath.split('/').pop()!
    const newPath = join(album.folder_path, fileName)
    await rename(photoPath, newPath)
    repo.addPhoto(albumId, photoId)
  })

  ipcMain.handle('albums:getPhotos', (_event, albumId: number) => {
    return repo.getPhotos(albumId)
  })
}
```

- [ ] **Step 3: 实现清理工具 IPC 处理器**

`src/main/ipc/cleanup.ts`:
```typescript
import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { detectDuplicates } from '../services/duplicate-detector'
import { findOrphanedRaws } from '../services/raw-manager'
import { unlink } from 'fs/promises'

export function registerCleanupIpc(db: Database.Database) {
  ipcMain.handle('cleanup:detectDuplicates', async (event, folderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return detectDuplicates(db, folderPath, (phase, current, total) => {
      win?.webContents.send('cleanup:progress', { phase, current, total })
    })
  })

  ipcMain.handle('cleanup:deleteFiles', async (_event, filePaths: string[]) => {
    for (const path of filePaths) {
      await unlink(path).catch(() => {})
    }
  })

  ipcMain.handle('cleanup:findOrphanedRaws', (_event, folderPath: string) => {
    return findOrphanedRaws(db, folderPath)
  })

  ipcMain.handle('cleanup:selectFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })

    return result.canceled ? null : result.filePaths[0]
  })
}
```

- [ ] **Step 4: 实现设置 IPC 处理器**

`src/main/ipc/settings.ts`:
```typescript
import { ipcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerSettingsIpc(db: Database.Database) {
  ipcMain.handle('settings:get', (_event, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row ? JSON.parse(row.value) : null
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value))
  })

  ipcMain.handle('settings:getAll', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]))
  })
}
```

- [ ] **Step 5: 在主进程中注册所有 IPC**

修改 `src/main/index.ts`，在 `createWindow` 之前添加：

```typescript
import { createDatabase } from './db/database'
import { registerPhotoIpc } from './ipc/photos'
import { registerAlbumIpc } from './ipc/albums'
import { registerCleanupIpc } from './ipc/cleanup'
import { registerSettingsIpc } from './ipc/settings'

const db = createDatabase()
registerPhotoIpc(db)
registerAlbumIpc(db)
registerCleanupIpc(db)
registerSettingsIpc(db)
```

- [ ] **Step 6: 更新预加载脚本暴露 API**

修改 `src/preload/index.ts`：

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  photos: {
    getAll: (options?) => ipcRenderer.invoke('photos:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('photos:getById', id),
    getToday: () => ipcRenderer.invoke('photos:getToday'),
    count: () => ipcRenderer.invoke('photos:count'),
    updateRating: (id: number, rating: number) => ipcRenderer.invoke('photos:updateRating', id, rating),
    batchUpdateRating: (ids: number[], rating: number) => ipcRenderer.invoke('photos:batchUpdateRating', ids, rating),
    updateColorLabel: (id: number, label: string | null) => ipcRenderer.invoke('photos:updateColorLabel', id, label),
    updateRejected: (id: number, rejected: boolean) => ipcRenderer.invoke('photos:updateRejected', id, rejected),
    batchDelete: (ids: number[]) => ipcRenderer.invoke('photos:batchDelete', ids),
    importFolder: () => ipcRenderer.invoke('photos:importFolder'),
    getThumbnail: (photoId: number) => ipcRenderer.invoke('photos:getThumbnail', photoId),
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => {
      ipcRenderer.on('photos:scanProgress', (_e, data) => callback(data))
    }
  },

  albums: {
    getAll: () => ipcRenderer.invoke('albums:getAll'),
    create: (name: string, parentPath: string) => ipcRenderer.invoke('albums:create', name, parentPath),
    delete: (id: number) => ipcRenderer.invoke('albums:delete', id),
    rename: (id: number, name: string) => ipcRenderer.invoke('albums:rename', id, name),
    addPhoto: (albumId: number, photoId: number, photoPath: string) => ipcRenderer.invoke('albums:addPhoto', albumId, photoId, photoPath),
    getPhotos: (albumId: number) => ipcRenderer.invoke('albums:getPhotos', albumId)
  },

  cleanup: {
    detectDuplicates: (folderPath: string) => ipcRenderer.invoke('cleanup:detectDuplicates', folderPath),
    deleteFiles: (filePaths: string[]) => ipcRenderer.invoke('cleanup:deleteFiles', filePaths),
    findOrphanedRaws: (folderPath: string) => ipcRenderer.invoke('cleanup:findOrphanedRaws', folderPath),
    selectFolder: () => ipcRenderer.invoke('cleanup:selectFolder'),
    onProgress: (callback: (data: { phase: string; current: number; total: number }) => void) => {
      ipcRenderer.on('cleanup:progress', (_e, data) => callback(data))
    }
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  }
})
```

- [ ] **Step 7: 验证启动**

```bash
npm run dev
```

Expected: Electron 窗口打开，控制台无报错。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: 实现 IPC 通信层（照片、相册、清理、设置）"
```

---

## Phase 3: 前端 UI 组件

### Task 8: 布局组件

**Files:**
- Create: `src/renderer/src/components/layout/TitleBar.vue`
- Create: `src/renderer/src/components/layout/Sidebar.vue`
- Create: `src/renderer/src/components/layout/Toolbar.vue`
- Create: `src/renderer/src/components/layout/StatusBar.vue`
- Create: `src/renderer/src/router/index.ts`

- [ ] **Step 1: 创建路由配置**

`src/renderer/src/router/index.ts`:
```typescript
import { createRouter, createWebHashHistory } from 'vue-router'
import AllPhotos from '../views/AllPhotos.vue'

const routes = [
  { path: '/', name: 'all', component: AllPhotos },
  { path: '/today', name: 'today', component: AllPhotos },
  { path: '/rated', name: 'rated', component: AllPhotos },
  { path: '/rejected', name: 'rejected', component: AllPhotos },
  { path: '/album/:id', name: 'album', component: AllPhotos },
  { path: '/duplicates', name: 'duplicates', component: () => import('../views/DuplicateView.vue') },
  { path: '/cleanup', name: 'cleanup', component: () => import('../views/CleanupView.vue') },
  { path: '/batch-rename', name: 'batch-rename', component: () => import('../views/BatchRenameView.vue') },
  { path: '/batch-export', name: 'batch-export', component: () => import('../views/BatchExportView.vue') },
  { path: '/map', name: 'map', component: () => import('../views/MapView.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
```

- [ ] **Step 2: 创建 TitleBar 组件**

`src/renderer/src/components/layout/TitleBar.vue`:
```vue
<script setup lang="ts">
const isMac = window.electronAPI?.platform === 'darwin'
</script>

<template>
  <div class="h-10 bg-bg-primary border-b border-white/5 flex items-center px-4 select-none"
       :class="isMac ? 'pl-20' : ''">
    <span class="font-display text-sm font-semibold text-accent tracking-wide">Image Master</span>
    <span class="ml-2 text-[10px] text-text-muted tracking-widest uppercase font-sans font-light">PRO</span>
    <div class="ml-auto flex gap-1">
      <button class="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              @click="$emit('import')">
        ↓
      </button>
      <button class="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              @click="$router.push('/settings')">
        ⚙
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 创建 Sidebar 组件**

`src/renderer/src/components/layout/Sidebar.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

interface Album { id: number; name: string }
const albums = ref<Album[]>([])

onMounted(async () => {
  if (window.electronAPI) {
    albums.value = await window.electronAPI.albums.getAll()
  }
})

const navItems = [
  { icon: '◈', label: '所有照片', route: '/', count: true },
  { icon: '☆', label: '已评分', route: '/rated' },
  { icon: '◉', label: '今日导入', route: '/today' },
  { icon: '✕', label: '已拒绝', route: '/rejected' }
]

const toolItems = [
  { icon: '⧉', label: '重复检测', route: '/duplicates' },
  { icon: '⊘', label: 'RAW 清理', route: '/cleanup' },
  { icon: '⇄', label: '批量重命名', route: '/batch-rename' },
  { icon: '↗', label: '批量导出', route: '/batch-export' }
]

const analysisItems = [
  { icon: '◉', label: '地图视图', route: '/map' }
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <aside class="w-[220px] bg-bg-primary border-r border-white/5 flex flex-col overflow-y-auto py-3">
    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">浏览</div>
      <div v-for="item in navItems" :key="item.route"
           @click="router.push(item.route)"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px] relative"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-[18px] text-center text-sm shrink-0">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2"></div>

    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">工具</div>
      <div v-for="item in toolItems" :key="item.route"
           @click="router.push(item.route)"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px]"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-[18px] text-center text-sm shrink-0">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2"></div>

    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">分析</div>
      <div v-for="item in analysisItems" :key="item.route"
           @click="router.push(item.route)"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px]"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-[18px] text-center text-sm shrink-0">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2"></div>

    <div class="px-3 flex-1">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">相册</div>
      <div v-for="album in albums" :key="album.id"
           @click="router.push(`/album/${album.id}`)"
           class="flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer transition-colors text-xs"
           :class="isActive(`/album/${album.id}`) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-2 h-2 rounded-full bg-accent shrink-0"></span>
        <span>{{ album.name }}</span>
      </div>
      <div class="flex items-center gap-2 py-1.5 px-3 text-xs text-text-muted cursor-pointer hover:text-accent transition-colors">
        + 新建相册
      </div>
    </div>
  </aside>
</template>
```

- [ ] **Step 4: 创建 Toolbar 组件**

`src/renderer/src/components/layout/Toolbar.vue`:
```vue
<script setup lang="ts">
defineProps<{
  sortBy: string
  totalCount: number
}>()

defineEmits<{
  (e: 'sort', value: string): void
}>()
</script>

<template>
  <div class="h-11 bg-bg-secondary border-b border-white/5 flex items-center px-4 gap-3">
    <div class="flex gap-0.5">
      <button v-for="opt in ['日期', '名称', '大小', '评分']" :key="opt"
              @click="$emit('sort', opt)"
              class="px-2.5 py-1 text-xs rounded-md transition-colors"
              :class="sortBy === opt ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        {{ opt }}
      </button>
    </div>
    <div class="w-px h-5 bg-white/5 mx-1.5"></div>
    <div class="flex-1"></div>
    <div class="flex items-center gap-1.5 bg-bg-tertiary border border-white/5 rounded-md px-2.5 py-1 w-48 focus-within:border-accent/30 focus-within:bg-bg-hover transition-colors">
      <span class="text-text-muted text-xs">⌕</span>
      <input type="text" placeholder="搜索照片..."
             class="bg-transparent text-text-primary text-xs outline-none w-full placeholder:text-text-muted" />
    </div>
    <span class="text-[11px] text-text-muted">{{ totalCount.toLocaleString() }} 张照片</span>
  </div>
</template>
```

- [ ] **Step 5: 创建 StatusBar 组件**

`src/renderer/src/components/layout/StatusBar.vue`:
```vue
<script setup lang="ts">
defineProps<{ selectedCount: number }>()
</script>

<template>
  <div class="h-7 bg-bg-primary border-t border-white/5 flex items-center px-4 gap-4">
    <div class="flex items-center gap-1.5 text-[11px] text-text-muted">
      <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
      就绪
    </div>
    <span class="text-[11px] text-text-muted">已选择 {{ selectedCount }} 张</span>
    <span class="ml-auto text-[11px] text-text-muted">v0.1.0</span>
  </div>
</template>
```

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 实现布局组件（TitleBar、Sidebar、Toolbar、StatusBar）"
```

---

### Task 9: 照片网格与预览

**Files:**
- Create: `src/renderer/src/components/photo/PhotoGrid.vue`
- Create: `src/renderer/src/components/photo/PhotoItem.vue`
- Create: `src/renderer/src/components/photo/PhotoPreview.vue`
- Create: `src/renderer/src/components/photo/InfoPanel.vue`
- Create: `src/renderer/src/components/common/RatingStars.vue`
- Create: `src/renderer/src/stores/photos.ts`
- Create: `src/renderer/src/stores/selection.ts`
- Create: `src/renderer/src/views/AllPhotos.vue`

- [ ] **Step 1: 创建照片状态管理**

`src/renderer/src/stores/photos.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Photo {
  id: number
  file_path: string
  file_name: string
  file_size: number
  format: string
  rating: number
  color_label: string | null
  is_rejected: number
  shot_at: string | null
  camera_model: string | null
  lens_model: string | null
  iso: number | null
  aperture: number | null
  shutter_speed: string | null
  width: number | null
  height: number | null
}

export const usePhotosStore = defineStore('photos', () => {
  const photos = ref<Photo[]>([])
  const totalCount = ref(0)
  const loading = ref(false)
  const sortBy = ref('日期')

  async function fetchPhotos(options?: { filter?: string; albumId?: number }) {
    loading.value = true
    try {
      if (window.electronAPI) {
        photos.value = await window.electronAPI.photos.getAll(options)
        totalCount.value = await window.electronAPI.photos.count()
      }
    } finally {
      loading.value = false
    }
  }

  async function updateRating(id: number, rating: number) {
    if (window.electronAPI) {
      await window.electronAPI.photos.updateRating(id, rating)
      const photo = photos.value.find(p => p.id === id)
      if (photo) photo.rating = rating
    }
  }

  async function updateColorLabel(id: number, label: string | null) {
    if (window.electronAPI) {
      await window.electronAPI.photos.updateColorLabel(id, label)
      const photo = photos.value.find(p => p.id === id)
      if (photo) photo.color_label = label
    }
  }

  return { photos, totalCount, loading, sortBy, fetchPhotos, updateRating, updateColorLabel }
})
```

- [ ] **Step 2: 创建选择状态管理**

`src/renderer/src/stores/selection.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  const selectedIds = ref<Set<number>>(new Set())
  const lastSelectedId = ref<number | null>(null)

  const count = computed(() => selectedIds.value.size)

  function toggle(id: number) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    lastSelectedId.value = id
    selectedIds.value = new Set(selectedIds.value)
  }

  function selectRange(fromId: number, toId: number, allIds: number[]) {
    const fromIdx = allIds.indexOf(fromId)
    const toIdx = allIds.indexOf(toId)
    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
    for (let i = start; i <= end; i++) {
      selectedIds.value.add(allIds[i])
    }
    selectedIds.value = new Set(selectedIds.value)
  }

  function clear() {
    selectedIds.value = new Set()
    lastSelectedId.value = null
  }

  function selectAll(ids: number[]) {
    selectedIds.value = new Set(ids)
  }

  return { selectedIds, count, toggle, selectRange, clear, selectAll }
})
```

- [ ] **Step 3: 创建 RatingStars 组件**

`src/renderer/src/components/common/RatingStars.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{ rating: number; size?: 'sm' | 'md' }>()
const emit = defineEmits<{ (e: 'rate', value: number): void }>()

const stars = [1, 2, 3, 4, 5]
</script>

<template>
  <div class="flex gap-0.5">
    <button v-for="star in stars" :key="star"
            @click.stop="emit('rate', star)"
            class="transition-colors"
            :class="[
              star <= rating ? 'text-accent' : 'text-text-muted/30',
              size === 'sm' ? 'text-[10px]' : 'text-base'
            ]">
      ★
    </button>
  </div>
</template>
```

- [ ] **Step 4: 创建 PhotoItem 组件**

`src/renderer/src/components/photo/PhotoItem.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RatingStars from '../common/RatingStars.vue'

const props = defineProps<{
  photo: { id: number; file_name: string; file_size: number; format: string; rating: number; camera_model?: string; lens_model?: string; is_rejected: number }
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
  (e: 'rate', rating: number): void
}>()

const thumbUrl = ref<string>('')

onMounted(async () => {
  if (window.electronAPI) {
    const path = await window.electronAPI.photos.getThumbnail(props.photo.id)
    if (path) thumbUrl.value = `file://${path}`
  }
})

const isRaw = props.photo.format === 'raw'
</script>

<template>
  <div class="aspect-square bg-bg-tertiary rounded-lg overflow-hidden cursor-pointer relative group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
       @click="emit('click', $event)">
    <div class="w-full h-full flex items-center justify-center relative overflow-hidden">
      <img v-if="thumbUrl" :src="thumbUrl" class="w-full h-full object-cover" loading="lazy" />
      <div v-else class="flex flex-col items-center justify-center gap-1.5">
        <span class="text-2xl opacity-20">◈</span>
        <span class="text-[10px] text-text-muted tracking-wider">{{ photo.file_name.split('.')[0] }}</span>
      </div>

      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
        <span class="text-[11px] font-medium text-white truncate">{{ photo.file_name }}</span>
        <span class="text-[10px] text-white/60 mt-0.5">{{ photo.camera_model }} · {{ photo.lens_model }}</span>
      </div>

      <div class="absolute top-2 left-2">
        <RatingStars v-if="photo.rating > 0" :rating="photo.rating" size="sm" @rate="emit('rate', $event)" />
      </div>

      <span v-if="isRaw" class="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent">RAW</span>
      <span v-if="photo.is_rejected" class="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">拒绝</span>

      <div class="absolute top-2 left-2 w-5 h-5 border-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
           :class="selected ? 'bg-accent border-accent opacity-100' : 'border-white/30 bg-black/30'"
           @click.stop="emit('click', $event)">
        <span v-if="selected" class="text-[11px] text-bg-deep font-semibold">✓</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: 创建 PhotoGrid 组件**

`src/renderer/src/components/photo/PhotoGrid.vue`:
```vue
<script setup lang="ts">
import PhotoItem from './PhotoItem.vue'
import { useSelectionStore } from '../../stores/selection'

const props = defineProps<{
  photos: { id: number; file_name: string; file_size: number; format: string; rating: number; camera_model?: string; lens_model?: string; is_rejected: number; shot_at?: string }[]
}>()

const emit = defineEmits<{
  (e: 'preview', index: number): void
  (e: 'rate', id: number, rating: number): void
}>()

const selection = useSelectionStore()

function handleClick(index: number, event: MouseEvent) {
  const photo = props.photos[index]
  if (event.ctrlKey || event.metaKey) {
    selection.toggle(photo.id)
  } else if (event.shiftKey && selection.lastSelectedId) {
    selection.selectRange(selection.lastSelectedId, photo.id, props.photos.map(p => p.id))
  } else {
    emit('preview', index)
  }
}

interface DateGroup { label: string; photos: typeof props.photos }

import { computed } from 'vue'

const dateGroups = computed(() => {
  const groups = new Map<string, typeof props.photos>()
  for (const photo of props.photos) {
    const date = photo.shot_at?.split('T')[0] || '未知日期'
    const arr = groups.get(date) || []
    arr.push(photo)
    groups.set(date, arr)
  }
  return Array.from(groups.entries()).map(([date, photos]) => ({
    label: date,
    photos
  })) as DateGroup[]
})
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4">
    <div v-for="group in dateGroups" :key="group.label" class="mb-6">
      <div class="flex items-center gap-3 mb-2.5">
        <span class="text-[11px] font-medium text-text-muted uppercase tracking-[1.5px]">{{ group.label }}</span>
        <span class="text-[10px] text-text-muted">· {{ group.photos.length }} 张</span>
        <div class="flex-1 h-px bg-white/5"></div>
      </div>
      <div class="grid gap-1.5" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
        <PhotoItem v-for="(photo, idx) in group.photos" :key="photo.id"
                   :photo="photo"
                   :selected="selection.selectedIds.has(photo.id)"
                   @click="handleClick(photos.indexOf(photo), $event)"
                   @rate="emit('rate', photo.id, $event)" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: 创建 PhotoPreview 组件**

`src/renderer/src/components/photo/PhotoPreview.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import RatingStars from '../common/RatingStars.vue'

const props = defineProps<{
  photo: { id: number; file_path: string; file_name: string; file_size: number; format: string; rating: number; camera_model?: string; lens_model?: string; iso?: number; aperture?: number; shutter_speed?: string; width?: number; height?: number } | null
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'rate', rating: number): void
}>()

const imageUrl = ref('')

watch(() => props.photo, async (photo) => {
  if (photo && window.electronAPI) {
    imageUrl.value = `file://${photo.file_path}`
  }
})

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
  if (e.key >= '1' && e.key <= '5') emit('rate', parseInt(e.key))
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 bg-bg-deep/95 backdrop-blur-sm flex items-center justify-center"
           @click.self="emit('close')">
        <button class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors text-xl"
                @click="emit('prev')">‹</button>

        <div class="max-w-[80vw] max-h-[80vh] relative">
          <img v-if="imageUrl" :src="imageUrl" class="max-w-full max-h-[80vh] object-contain rounded-lg" />
        </div>

        <button class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors text-xl"
                @click="emit('next')">›</button>

        <div v-if="photo" class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-bg-primary/80 backdrop-blur-md rounded-xl px-6 py-3 border border-white/5">
          <RatingStars :rating="photo.rating" @rate="emit('rate', $event)" />
          <div class="text-[11px] text-text-muted">
            {{ photo.file_name }} · {{ photo.camera_model }} · {{ photo.aperture }} · {{ photo.shutter_speed }} · ISO {{ photo.iso }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 7: 创建 AllPhotos 视图**

`src/renderer/src/views/AllPhotos.vue`:
```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePhotosStore } from '../stores/photos'
import { useSelectionStore } from '../stores/selection'
import PhotoGrid from '../components/photo/PhotoGrid.vue'
import PhotoPreview from '../components/photo/PhotoPreview.vue'
import Toolbar from '../components/layout/Toolbar.vue'

const route = useRoute()
const photosStore = usePhotosStore()
const selection = useSelectionStore()

const previewIndex = ref(-1)
const showPreview = ref(false)

onMounted(() => {
  photosStore.fetchPhotos()
})

function openPreview(index: number) {
  previewIndex.value = index
  showPreview.value = true
}

function closePreview() {
  showPreview.value = false
}

function prevPhoto() {
  if (previewIndex.value > 0) previewIndex.value--
}

function nextPhoto() {
  if (previewIndex.value < photosStore.photos.length - 1) previewIndex.value++
}

async function handleRate(id: number, rating: number) {
  await photosStore.updateRating(id, rating)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <Toolbar :sort-by="photosStore.sortBy" :total-count="photosStore.totalCount" @sort="photosStore.sortBy = $event" />
    <PhotoGrid :photos="photosStore.photos"
               @preview="openPreview"
               @rate="handleRate" />
    <PhotoPreview :photo="photosStore.photos[previewIndex] || null"
                  :visible="showPreview"
                  @close="closePreview"
                  @prev="prevPhoto"
                  @next="nextPhoto"
                  @rate="handleRate(photosStore.photos[previewIndex]?.id, $event)" />
  </div>
</template>
```

- [ ] **Step 8: 更新 App.vue 使用布局组件**

更新 `src/renderer/src/App.vue` 确认布局正确。

- [ ] **Step 9: 验证 UI 显示**

```bash
npm run dev
```

Expected: 看到完整的深色界面布局，左侧导航、顶部工具栏、底部状态栏。

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "feat: 实现照片网格、预览和 AllPhotos 视图"
```

---

### Task 10: 去重与清理视图

**Files:**
- Create: `src/renderer/src/views/DuplicateView.vue`
- Create: `src/renderer/src/views/CleanupView.vue`
- Create: `src/renderer/src/components/cleanup/DuplicateGroup.vue`
- Create: `src/renderer/src/components/cleanup/RawPairList.vue`

- [ ] **Step 1: 创建 DuplicateGroup 组件**

`src/renderer/src/components/cleanup/DuplicateGroup.vue`:
```vue
<script setup lang="ts">
defineProps<{
  group: { hash: string; photos: { id: number; file_path: string; file_name: string; file_size: number }[] }
}>()

defineEmits<{
  (e: 'keep', photoId: number): void
  (e: 'delete', photoId: number): void
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xs text-accent font-medium">重复组</span>
      <span class="text-[10px] text-text-muted">{{ group.photos.length }} 个文件</span>
    </div>
    <div class="space-y-2">
      <div v-for="photo in group.photos" :key="photo.id"
           class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
        <div class="w-12 h-12 bg-bg-hover rounded-md flex items-center justify-center text-lg opacity-30">◈</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-text-primary truncate">{{ photo.file_name }}</div>
          <div class="text-[11px] text-text-muted">{{ photo.file_path }}</div>
          <div class="text-[11px] text-text-muted">{{ formatSize(photo.file_size) }}</div>
        </div>
        <div class="flex gap-2">
          <button @click="$emit('keep', photo.id)"
                  class="px-3 py-1 text-xs rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
            保留
          </button>
          <button @click="$emit('delete', photo.id)"
                  class="px-3 py-1 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 创建 DuplicateView**

`src/renderer/src/views/DuplicateView.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import DuplicateGroup from '../components/cleanup/DuplicateGroup.vue'

const folderPath = ref('')
const groups = ref<{ hash: string; photos: { id: number; file_path: string; file_name: string; file_size: number }[] }[]>([])
const scanning = ref(false)
const progress = ref({ phase: '', current: 0, total: 0 })

async function selectFolder() {
  if (window.electronAPI) {
    folderPath.value = await window.electronAPI.cleanup.selectFolder() || ''
  }
}

async function startScan() {
  if (!folderPath.value) return
  scanning.value = true
  if (window.electronAPI) {
    window.electronAPI.cleanup.onProgress((data) => {
      progress.value = data
    })
    groups.value = await window.electronAPI.cleanup.detectDuplicates(folderPath.value)
  }
  scanning.value = false
}

async function deletePhoto(filePath: string) {
  if (window.electronAPI) {
    await window.electronAPI.cleanup.deleteFiles([filePath])
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">重复照片检测</h2>

    <div class="flex gap-3 mb-6">
      <button @click="selectFolder"
              class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary border border-white/5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
        {{ folderPath || '选择文件夹' }}
      </button>
      <button @click="startScan" :disabled="!folderPath || scanning"
              class="px-4 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
        {{ scanning ? '扫描中...' : '开始扫描' }}
      </button>
    </div>

    <div v-if="scanning" class="mb-4">
      <div class="text-xs text-text-muted">{{ progress.phase }}: {{ progress.current }}/{{ progress.total }}</div>
      <div class="mt-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
        <div class="h-full bg-accent rounded-full transition-all" :style="{ width: (progress.current / progress.total * 100) + '%' }"></div>
      </div>
    </div>

    <div class="space-y-4">
      <DuplicateGroup v-for="group in groups" :key="group.hash"
                      :group="group"
                      @delete="deletePhoto" />
    </div>

    <div v-if="!scanning && groups.length === 0 && folderPath" class="text-center text-text-muted text-sm mt-8">
      未发现重复照片
    </div>
  </div>
</template>
```

- [ ] **Step 3: 创建 CleanupView（RAW 清理）**

`src/renderer/src/views/CleanupView.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'

const folderPath = ref('')
const orphanedRaws = ref<{ id: number; file_path: string; file_name: string }[]>([])
const scanning = ref(false)

async function selectFolder() {
  if (window.electronAPI) {
    folderPath.value = await window.electronAPI.cleanup.selectFolder() || ''
  }
}

async function startScan() {
  if (!folderPath.value || !window.electronAPI) return
  scanning.value = true
  orphanedRaws.value = await window.electronAPI.cleanup.findOrphanedRaws(folderPath.value)
  scanning.value = false
}

async function deleteSelected() {
  if (!window.electronAPI) return
  const paths = orphanedRaws.value.map(r => r.file_path)
  await window.electronAPI.cleanup.deleteFiles(paths)
  orphanedRaws.value = []
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">RAW 文件清理</h2>

    <div class="flex gap-3 mb-6">
      <button @click="selectFolder"
              class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary border border-white/5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
        {{ folderPath || '选择文件夹' }}
      </button>
      <button @click="startScan" :disabled="!folderPath || scanning"
              class="px-4 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
        {{ scanning ? '扫描中...' : '扫描孤立 RAW' }}
      </button>
      <button v-if="orphanedRaws.length > 0" @click="deleteSelected"
              class="px-4 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
        删除全部 ({{ orphanedRaws.length }})
      </button>
    </div>

    <div class="space-y-2">
      <div v-for="raw in orphanedRaws" :key="raw.id"
           class="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border border-white/5">
        <span class="text-accent text-sm">⊘</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-text-primary truncate">{{ raw.file_name }}</div>
          <div class="text-[11px] text-text-muted truncate">{{ raw.file_path }}</div>
        </div>
      </div>
    </div>

    <div v-if="!scanning && orphanedRaws.length === 0 && folderPath" class="text-center text-text-muted text-sm mt-8">
      未发现孤立的 RAW 文件
    </div>
  </div>
</template>
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 实现去重检测和 RAW 清理视图"
```

---

### Task 11: 相册管理

**Files:**
- Create: `src/renderer/src/components/album/AlbumList.vue`
- Create: `src/renderer/src/components/album/AlbumDialog.vue`
- Create: `src/renderer/src/stores/albums.ts`

- [ ] **Step 1: 创建相册状态管理**

`src/renderer/src/stores/albums.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Album { id: number; name: string; folder_path: string; cover_photo_id: number | null; created_at: string }

export const useAlbumsStore = defineStore('albums', () => {
  const albums = ref<Album[]>([])

  async function fetchAlbums() {
    if (window.electronAPI) {
      albums.value = await window.electronAPI.albums.getAll()
    }
  }

  async function createAlbum(name: string, parentPath: string) {
    if (window.electronAPI) {
      await window.electronAPI.albums.create(name, parentPath)
      await fetchAlbums()
    }
  }

  async function deleteAlbum(id: number) {
    if (window.electronAPI) {
      await window.electronAPI.albums.delete(id)
      await fetchAlbums()
    }
  }

  async function renameAlbum(id: number, name: string) {
    if (window.electronAPI) {
      await window.electronAPI.albums.rename(id, name)
      await fetchAlbums()
    }
  }

  return { albums, fetchAlbums, createAlbum, deleteAlbum, renameAlbum }
})
```

- [ ] **Step 2: 创建 AlbumDialog 组件**

`src/renderer/src/components/album/AlbumDialog.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', name: string): void
}>()

const name = ref('')

function handleCreate() {
  if (name.value.trim()) {
    emit('create', name.value.trim())
    name.value = ''
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
           @click.self="emit('close')">
        <div class="bg-bg-secondary rounded-xl border border-white/5 p-6 w-80">
          <h3 class="font-display text-lg text-accent mb-4">新建相册</h3>
          <input v-model="name" placeholder="相册名称"
                 class="w-full bg-bg-tertiary border border-white/5 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/30 mb-4"
                 @keyup.enter="handleCreate" />
          <div class="flex gap-2 justify-end">
            <button @click="emit('close')"
                    class="px-4 py-1.5 text-sm rounded-lg text-text-secondary hover:bg-bg-hover transition-colors">
              取消
            </button>
            <button @click="handleCreate"
                    class="px-4 py-1.5 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              创建
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: 实现相册管理组件和状态"
```

---

### Task 12: 设置视图

**Files:**
- Create: `src/renderer/src/views/SettingsView.vue`
- Create: `src/renderer/src/stores/settings.ts`

- [ ] **Step 1: 创建设置视图**

`src/renderer/src/views/SettingsView.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const deleteLinkedRaw = ref(false)

onMounted(async () => {
  if (window.electronAPI) {
    deleteLinkedRaw.value = await window.electronAPI.settings.get('deleteLinkedRaw') || false
  }
})

async function saveSetting(key: string, value: unknown) {
  if (window.electronAPI) {
    await window.electronAPI.settings.set(key, value)
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">设置</h2>

    <div class="space-y-6 max-w-lg">
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">文件管理</h3>
        <label class="flex items-center gap-3 cursor-pointer">
          <div class="relative">
            <input type="checkbox" v-model="deleteLinkedRaw"
                   @change="saveSetting('deleteLinkedRaw', deleteLinkedRaw)"
                   class="sr-only peer" />
            <div class="w-9 h-5 bg-bg-tertiary rounded-full peer-checked:bg-accent/30 transition-colors"></div>
            <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-text-muted rounded-full peer-checked:translate-x-4 peer-checked:bg-accent transition-all"></div>
          </div>
          <div>
            <div class="text-sm text-text-primary">关联删除 RAW 文件</div>
            <div class="text-[11px] text-text-muted">删除 JPEG 时同时删除同名 RAW 文件</div>
          </div>
        </label>
      </div>

      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">支持的 RAW 格式</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="fmt in ['CR2', 'CR3', 'NEF', 'ARW', 'ORF', 'RAF', 'DNG', 'PEF', 'SRW', 'RW2']" :key="fmt"
                class="px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary">
            {{ fmt }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "feat: 实现设置视图（关联删除配置）"
```

---

### Task 13: 最终集成与验证

- [ ] **Step 1: 确保所有视图和组件正确连接**

检查路由、Store、组件之间的导入关系是否正确。

- [ ] **Step 2: 运行完整应用**

```bash
npm run dev
```

验证：
1. 应用启动，深色界面显示正确
2. 左侧导航可点击切换
3. 照片网格布局正确
4. 点击照片可打开预览
5. 快捷键 1-5 可评分
6. 设置页面可切换关联删除

- [ ] **Step 3: 运行测试**

```bash
npm run test:run
```

Expected: 全部 PASS。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 完成 Phase 1-3 集成，基础功能可用"
```

---

## 后续 Phase（后续计划）

以下模块在 Phase 1-3 完成后单独制定实现计划：

- **Phase 4**: 地图视图（Leaflet/OpenStreetMap 集成）
- **Phase 5**: 直方图（Canvas 绘制 RGB 通道）
- **Phase 6**: 批量重命名/导出 UI
- **Phase 7**: AI 标签（ONNX Runtime 集成）
- **Phase 8**: 智能相册规则引擎
- **Phase 9**: 拖拽到相册、右键上下文菜单
- **Phase 10**: 浅色主题、多语言支持
