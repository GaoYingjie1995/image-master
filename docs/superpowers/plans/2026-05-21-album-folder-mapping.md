# 相册系统重构：基于文件夹映射的相册 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将相册系统从手动创建+物理移动文件的模式，重构为"相册=文件夹"的映射模式，导入文件夹时自动根据子目录结构生成相册树。

**Architecture:** `albums` 表新增 `parent_id` 支持层级关系，`photos` 表新增 `parent_folder` 列用于精确匹配相册归属。删除 `album_photos` 关联表。导入文件夹时递归遍历子目录，为每个含图片的文件夹自动创建相册记录。前端侧边栏改为树状结构，支持展开/折叠。

**Tech Stack:** TypeScript, better-sqlite3, Electron IPC, Vue 3 + Pinia, Vitest

---

## File Structure

### 修改的文件
| 文件 | 变更内容 |
|------|---------|
| `src/main/db/database.ts` | Schema: albums 新增 parent_id/is_collapsed, photos 新增 parent_folder, 删除 album_photos |
| `src/main/db/album-repo.ts` | 移除 addPhoto/removePhoto/getPhotos, 新增 getTree/getByFolderPath/setCollapsed/getChildren/getPhotoCountByPath |
| `src/main/db/photo-repo.ts` | PhotoInsert/PhotoRow 新增 parent_folder, getAll/countFiltered/getIdsByFilter 改用 parent_folder 查询 |
| `src/main/services/scanner.ts` | 新增 collectFolderStructure 函数, scanFolder 返回含目录结构信息 |
| `src/main/ipc/albums.ts` | 重构: 移除 addPhoto/addPhotos/removePhoto, 新增 setCollapsed/setCover, getAll 返回树状结构 |
| `src/main/ipc/photos.ts` | importFolder 改造: 扫描后自动创建相册树 |
| `src/preload/index.ts` | 同步更新 albums API, 移除废弃方法 |
| `src/renderer/src/stores/albums.ts` | Album 接口新增字段, 新增 setCollapsed/setCover 方法 |
| `src/renderer/src/stores/photos.ts` | fetchPhotos 改用 parentFolder 查询 |
| `src/renderer/src/components/layout/Sidebar.vue` | 重构为树状相册列表 |
| `src/renderer/src/views/AllPhotos.vue` | 新增子相册卡片区域, 移除 AlbumPickerDialog/拖拽/移除功能 |
| `src/renderer/src/components/common/BatchActionBar.vue` | 移除"添加到相册"按钮 |
| `src/renderer/src/App.vue` | handleImport 刷新相册列表 |

### 删除的文件
| 文件 | 原因 |
|------|------|
| `src/renderer/src/components/album/AlbumPickerDialog.vue` | 不再需要手动选择相册 |

### 测试文件
| 文件 | 变更内容 |
|------|---------|
| `tests/main/db/album-repo.test.ts` | 重写: 测试树状查询、parent_id 级联删除、setCollapsed |
| `tests/main/db/photo-repo.test.ts` | 更新: 测试 parent_folder 字段、按文件夹查询 |

---

## Task 1: 数据库 Schema 变更

**Files:**
- Modify: `src/main/db/database.ts`
- Modify: `tests/main/db/album-repo.test.ts`
- Modify: `tests/main/db/photo-repo.test.ts`

- [ ] **Step 1: 更新 database.ts Schema**

将 `SCHEMA` 常量替换为新版，包含 `parent_id`、`is_collapsed`、`parent_folder`，移除 `album_photos`：

```typescript
// src/main/db/database.ts
const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT,
  format TEXT NOT NULL,
  parent_folder TEXT,
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
  parent_id INTEGER,
  cover_photo_id INTEGER,
  description TEXT,
  is_collapsed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES albums(id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_photos_parent_folder ON photos(parent_folder);
CREATE INDEX IF NOT EXISTS idx_albums_parent_id ON albums(parent_id);
`
```

- [ ] **Step 2: 更新 album-repo.test.ts 的 Schema 定义**

测试文件中内联的 Schema 需要同步更新。将 `album_photos` 表移除，albums 表新增字段：

```typescript
// tests/main/db/album-repo.test.ts — 在 createDatabase 调用前更新 SCHEMA
const SCHEMA = `
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  folder_path TEXT UNIQUE NOT NULL,
  parent_id INTEGER,
  cover_photo_id INTEGER,
  description TEXT,
  is_collapsed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES albums(id) ON DELETE CASCADE
);
`
```

- [ ] **Step 3: 更新 photo-repo.test.ts 的 Schema 定义**

photos 表新增 `parent_folder` 列：

```typescript
// tests/main/db/photo-repo.test.ts — 在 Schema 中添加 parent_folder
// 在 file_hash TEXT, 后面加: parent_folder TEXT,
```

- [ ] **Step 4: 运行测试确认 Schema 变更无语法错误**

Run: `pnpm test:run`
Expected: 现有测试可能因 album_photos 表不存在而失败，这是预期的（后续任务修复）

- [ ] **Step 5: Commit**

```bash
git add src/main/db/database.ts tests/main/db/album-repo.test.ts tests/main/db/photo-repo.test.ts
git commit -m "refactor: 更新数据库 schema，albums 新增 parent_id/is_collapsed，photos 新增 parent_folder，移除 album_photos"
```

---

## Task 2: Album Repository 重构

**Files:**
- Modify: `src/main/db/album-repo.ts`
- Modify: `tests/main/db/album-repo.test.ts`

- [ ] **Step 1: 重写 album-repo.ts**

移除 `addPhoto`、`removePhoto`、`getPhotos` 方法，新增 `getTree`、`getByFolderPath`、`setCollapsed`、`getChildren`、`getPhotoCountByPath`。更新接口定义：

```typescript
// src/main/db/album-repo.ts
import Database from 'better-sqlite3'

export interface AlbumInsert {
  name: string
  folder_path: string
  parent_id?: number | null
  cover_photo_id?: number
  description?: string
  is_collapsed?: number
  created_at: string
}

export interface AlbumRow {
  id: number
  name: string
  folder_path: string
  parent_id: number | null
  cover_photo_id: number | null
  description: string | null
  is_collapsed: number
  created_at: string
}

export interface AlbumTreeNode extends AlbumRow {
  children: AlbumTreeNode[]
  photoCount: number
}

export function createAlbumRepo(db: Database.Database) {
  return {
    create(album: AlbumInsert): number {
      const result = db.prepare(`
        INSERT INTO albums (name, folder_path, parent_id, cover_photo_id, description, is_collapsed, created_at)
        VALUES (@name, @folder_path, @parent_id, @cover_photo_id, @description, @is_collapsed, @created_at)
      `).run({
        parent_id: null,
        cover_photo_id: null,
        description: null,
        is_collapsed: 0,
        ...album
      })
      return Number(result.lastInsertRowid)
    },

    getById(id: number): AlbumRow | undefined {
      return db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as AlbumRow | undefined
    },

    getByFolderPath(folderPath: string): AlbumRow | undefined {
      return db.prepare('SELECT * FROM albums WHERE folder_path = ?').get(folderPath) as AlbumRow | undefined
    },

    getAll(): AlbumRow[] {
      return db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all() as AlbumRow[]
    },

    getChildren(parentId: number): AlbumRow[] {
      return db.prepare('SELECT * FROM albums WHERE parent_id = ? ORDER BY name').all(parentId) as AlbumRow[]
    },

    getRootAlbums(): AlbumRow[] {
      return db.prepare('SELECT * FROM albums WHERE parent_id IS NULL ORDER BY created_at DESC').all() as AlbumRow[]
    },

    getTree(): AlbumTreeNode[] {
      const allAlbums = db.prepare('SELECT * FROM albums ORDER BY name').all() as AlbumRow[]
      const photoCounts = db.prepare(
        'SELECT parent_folder, COUNT(*) as count FROM photos WHERE parent_folder IS NOT NULL GROUP BY parent_folder'
      .all() as { parent_folder: string; count: number }[]

      const countMap = new Map<string, number>()
      for (const row of photoCounts) {
        countMap.set(row.parent_folder, row.count)
      }

      const nodeMap = new Map<number, AlbumTreeNode>()
      for (const album of allAlbums) {
        nodeMap.set(album.id, {
          ...album,
          children: [],
          photoCount: countMap.get(album.folder_path) || 0
        })
      }

      const roots: AlbumTreeNode[] = []
      for (const album of allAlbums) {
        const node = nodeMap.get(album.id)!
        if (album.parent_id && nodeMap.has(album.parent_id)) {
          nodeMap.get(album.parent_id)!.children.push(node)
        } else {
          roots.push(node)
        }
      }

      return roots
    },

    setCollapsed(id: number, collapsed: boolean): void {
      db.prepare('UPDATE albums SET is_collapsed = ? WHERE id = ?').run(collapsed ? 1 : 0, id)
    },

    setCover(albumId: number, photoId: number): void {
      db.prepare('UPDATE albums SET cover_photo_id = ? WHERE id = ?').run(photoId, albumId)
    },

    delete(id: number): void {
      db.prepare('DELETE FROM albums WHERE id = ?').run(id)
    },

    rename(id: number, name: string, newPath: string): void {
      db.prepare('UPDATE albums SET name = ?, folder_path = ? WHERE id = ?').run(name, newPath, id)
    },

    updateFolderPaths(oldPath: string, newPath: string): void {
      // 级联更新子相册的 folder_path
      const children = db.prepare('SELECT id, folder_path FROM albums WHERE folder_path LIKE ?').all(oldPath + '/%') as { id: number; folder_path: string }[]
      for (const child of children) {
        const newChildPath = child.folder_path.replace(oldPath, newPath)
        db.prepare('UPDATE albums SET folder_path = ? WHERE id = ?').run(newChildPath, child.id)
      }
    },

    getPhotoCountByPath(folderPath: string): number {
      return (db.prepare('SELECT COUNT(*) as count FROM photos WHERE parent_folder = ?').get(folderPath) as { count: number }).count
    }
  }
}
```

- [ ] **Step 2: 重写 album-repo.test.ts**

```typescript
// tests/main/db/album-repo.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../../../src/main/db/album-repo'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  format TEXT NOT NULL,
  parent_folder TEXT,
  created_at TEXT NOT NULL,
  modified_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  folder_path TEXT UNIQUE NOT NULL,
  parent_id INTEGER,
  cover_photo_id INTEGER,
  description TEXT,
  is_collapsed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES albums(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_photos_parent_folder ON photos(parent_folder);
CREATE INDEX IF NOT EXISTS idx_albums_parent_id ON albums(parent_id);
`

describe('AlbumRepo', () => {
  let db: Database.Database
  let repo: ReturnType<typeof createAlbumRepo>

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.exec(SCHEMA)
    repo = createAlbumRepo(db)
  })

  it('create and query album', () => {
    const id = repo.create({ name: 'Vacation', folder_path: '/photos/vacation', created_at: '2024-01-01T00:00:00Z' })
    const album = repo.getById(id)
    expect(album?.name).toBe('Vacation')
    expect(album?.parent_id).toBeNull()
    expect(album?.is_collapsed).toBe(0)
  })

  it('create album with parent', () => {
    const parentId = repo.create({ name: 'Photos', folder_path: '/photos', created_at: '2024-01-01T00:00:00Z' })
    const childId = repo.create({ name: 'Vacation', folder_path: '/photos/vacation', parent_id: parentId, created_at: '2024-01-01T00:00:00Z' })
    const child = repo.getById(childId)
    expect(child?.parent_id).toBe(parentId)
  })

  it('getChildren returns child albums', () => {
    const parentId = repo.create({ name: 'Photos', folder_path: '/photos', created_at: '2024-01-01T00:00:00Z' })
    repo.create({ name: 'A', folder_path: '/photos/a', parent_id: parentId, created_at: '2024-01-01T00:00:00Z' })
    repo.create({ name: 'B', folder_path: '/photos/b', parent_id: parentId, created_at: '2024-01-01T00:00:00Z' })
    const children = repo.getChildren(parentId)
    expect(children).toHaveLength(2)
  })

  it('getByFolderPath returns album by path', () => {
    repo.create({ name: 'Vacation', folder_path: '/photos/vacation', created_at: '2024-01-01T00:00:00Z' })
    const album = repo.getByFolderPath('/photos/vacation')
    expect(album?.name).toBe('Vacation')
  })

  it('getTree builds nested structure', () => {
    const rootId = repo.create({ name: 'Root', folder_path: '/photos', created_at: '2024-01-01T00:00:00Z' })
    const childId = repo.create({ name: 'Child', folder_path: '/photos/child', parent_id: rootId, created_at: '2024-01-01T00:00:00Z' })
    repo.create({ name: 'Grandchild', folder_path: '/photos/child/grand', parent_id: childId, created_at: '2024-01-01T00:00:00Z' })

    // Insert a photo to test photoCount
    db.prepare('INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('/photos/child/img.jpg', 'img.jpg', 1000, 'jpg', '/photos/child', '2024-01-01', '2024-01-01')

    const tree = repo.getTree()
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('Root')
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].name).toBe('Child')
    expect(tree[0].children[0].photoCount).toBe(1)
    expect(tree[0].children[0].children).toHaveLength(1)
  })

  it('setCollapsed toggles collapse state', () => {
    const id = repo.create({ name: 'Test', folder_path: '/test', created_at: '2024-01-01T00:00:00Z' })
    repo.setCollapsed(id, true)
    expect(repo.getById(id)?.is_collapsed).toBe(1)
    repo.setCollapsed(id, false)
    expect(repo.getById(id)?.is_collapsed).toBe(0)
  })

  it('delete cascades to children', () => {
    const parentId = repo.create({ name: 'Parent', folder_path: '/parent', created_at: '2024-01-01T00:00:00Z' })
    const childId = repo.create({ name: 'Child', folder_path: '/parent/child', parent_id: parentId, created_at: '2024-01-01T00:00:00Z' })
    repo.delete(parentId)
    expect(repo.getById(parentId)).toBeUndefined()
    expect(repo.getById(childId)).toBeUndefined()
  })

  it('list all albums', () => {
    repo.create({ name: 'A', folder_path: '/a', created_at: '2024-01-01T00:00:00Z' })
    repo.create({ name: 'B', folder_path: '/b', created_at: '2024-01-01T00:00:00Z' })
    expect(repo.getAll()).toHaveLength(2)
  })

  it('delete album', () => {
    const id = repo.create({ name: 'Test', folder_path: '/test', created_at: '2024-01-01T00:00:00Z' })
    repo.delete(id)
    expect(repo.getById(id)).toBeUndefined()
  })

  it('getPhotoCountByPath counts photos in folder', () => {
    db.prepare('INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('/photos/a.jpg', 'a.jpg', 100, 'jpg', '/photos', '2024-01-01', '2024-01-01')
    db.prepare('INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('/photos/b.jpg', 'b.jpg', 100, 'jpg', '/photos', '2024-01-01', '2024-01-01')
    expect(repo.getPhotoCountByPath('/photos')).toBe(2)
    expect(repo.getPhotoCountByPath('/other')).toBe(0)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `pnpm test -- tests/main/db/album-repo.test.ts`
Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add src/main/db/album-repo.ts tests/main/db/album-repo.test.ts
git commit -m "refactor: 重构 album-repo，新增树状查询、parent_id 支持，移除 album_photos 操作"
```

---

## Task 3: Photo Repository 重构

**Files:**
- Modify: `src/main/db/photo-repo.ts`
- Modify: `tests/main/db/photo-repo.test.ts`

- [ ] **Step 1: 更新 PhotoInsert 和 PhotoRow 接口**

在 `PhotoInsert` 和 `PhotoRow` 接口中新增 `parent_folder` 字段：

```typescript
// src/main/db/photo-repo.ts — 在 PhotoInsert 接口中添加:
export interface PhotoInsert {
  file_path: string
  file_name: string
  file_size: number
  file_hash?: string
  format: string
  parent_folder?: string  // 新增
  raw_pair_id?: number
  // ... 其余字段不变
}

// 在 PhotoRow 接口中添加:
export interface PhotoRow {
  id: number
  file_path: string
  file_name: string
  file_size: number
  file_hash: string | null
  format: string
  parent_folder: string | null  // 新增
  raw_pair_id: number | null
  // ... 其余字段不变
}
```

- [ ] **Step 2: 更新 insert 预编译语句**

在 `insertStmt` 的 INSERT 语句中加入 `parent_folder` 列：

```typescript
const insertStmt = db.prepare(`
  INSERT INTO photos (file_path, file_name, file_size, file_hash, format, parent_folder, raw_pair_id, width, height, rating, color_label, is_rejected, created_at, modified_at, shot_at, camera_model, lens_model, iso, aperture, shutter_speed, gps_lat, gps_lng)
  VALUES (@file_path, @file_name, @file_size, @file_hash, @format, @parent_folder, @raw_pair_id, @width, @height, @rating, @color_label, @is_rejected, @created_at, @modified_at, @shot_at, @camera_model, @lens_model, @iso, @aperture, @shutter_speed, @gps_lat, @gps_lng)
`)
```

在 `insert` 方法的默认值中加入 `parent_folder: null`。

- [ ] **Step 3: 更新 getAll/countFiltered/getIdsByFilter 方法**

将 `albumId` 查询条件从 `album_photos` 子查询改为 `parent_folder` 匹配。需要新增一个 `getAlbumFolderPath` 辅助查询。

在 `getAll` 方法中，将：
```typescript
} else if (options?.albumId) {
  conditions.push('id IN (SELECT photo_id FROM album_photos WHERE album_id = ?)')
  params.push(options.albumId)
}
```

改为：
```typescript
} else if (options?.albumId) {
  const album = db.prepare('SELECT folder_path FROM albums WHERE id = ?').get(options.albumId) as { folder_path: string } | undefined
  if (album) {
    conditions.push('parent_folder = ?')
    params.push(album.folder_path)
  }
}
```

对 `countFiltered` 和 `getIdsByFilter` 方法做相同修改。

- [ ] **Step 4: 更新 photo-repo.test.ts**

在测试 Schema 中添加 `parent_folder TEXT` 列。新增按文件夹查询的测试：

```typescript
it('filter by parent_folder', () => {
  db.prepare('INSERT INTO albums (id, name, folder_path, created_at) VALUES (?, ?, ?, ?)').run(1, 'Test', '/photos/test', '2024-01-01')
  db.prepare(`INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run('/photos/test/a.jpg', 'a.jpg', 100, 'jpg', '/photos/test', '2024-01-01', '2024-01-01')
  db.prepare(`INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run('/photos/other/b.jpg', 'b.jpg', 100, 'jpg', '/photos/other', '2024-01-01', '2024-01-01')

  const repo = createPhotoRepo(db)
  const photos = repo.getAll({ albumId: 1 })
  expect(photos).toHaveLength(1)
  expect(photos[0].file_name).toBe('a.jpg')
})
```

- [ ] **Step 5: 运行测试**

Run: `pnpm test -- tests/main/db/photo-repo.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/db/photo-repo.ts tests/main/db/photo-repo.test.ts
git commit -m "refactor: photo-repo 新增 parent_folder 字段，查询改为按文件夹路径匹配"
```

---

## Task 4: Scanner 服务增强

**Files:**
- Modify: `src/main/services/scanner.ts`

- [ ] **Step 1: 新增 collectFolderStructure 函数**

在 `scanner.ts` 中新增函数，遍历目录树返回文件夹结构信息：

```typescript
// src/main/services/scanner.ts — 新增接口和函数

export interface FolderInfo {
  path: string
  name: string
  parentPath: string | null
  imageCount: number
}

export async function collectFolderStructure(dir: string): Promise<FolderInfo[]> {
  const folders: FolderInfo[] = []

  async function walk(currentDir: string, parentPath: string | null): Promise<void> {
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    let imageCount = 0
    const subdirs: string[] = []

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      if (entry.isFile()) {
        const ext = extname(entry.name).slice(1).toLowerCase()
        if (isImage(ext)) imageCount++
      } else if (entry.isDirectory()) {
        subdirs.push(join(currentDir, entry.name))
      }
    }

    // 只记录包含图片或子目录的文件夹
    if (imageCount > 0 || subdirs.length > 0) {
      folders.push({
        path: currentDir,
        name: basename(currentDir),
        parentPath,
        imageCount
      })
    }

    for (const subdir of subdirs) {
      await walk(subdir, currentDir)
    }
  }

  await walk(dir, null)
  return folders
}
```

- [ ] **Step 2: 更新 scanFolder 返回值**

修改 `scanFolder` 函数，使其同时返回导入数量和目录结构：

```typescript
export interface ScanResult {
  count: number
  folders: FolderInfo[]
}

export async function scanFolder(
  insertFn: (data: PhotoInsertData) => number,
  getExisting: (path: string) => unknown,
  options: ScanOptions
): Promise<ScanResult> {
  const folders = await collectFolderStructure(options.folderPath)
  const files = await collectImageFiles(options.folderPath, options.recursive !== false)
  let count = 0

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    if (getExisting(filePath)) continue

    const data = await scanSingleFile(filePath)
    if (data) {
      // 设置 parent_folder
      data.parent_folder = dirname(filePath)
      insertFn(data)
      count++
    }

    options.onProgress?.(i + 1, files.length)
  }

  return { count, folders }
}
```

注意：`PhotoInsertData` 接口也需要新增 `parent_folder?: string` 字段。

- [ ] **Step 3: 运行现有测试**

Run: `pnpm test:run`
Expected: 无 scanner 测试文件，不会直接失败。确认 TypeScript 编译通过。

- [ ] **Step 4: Commit**

```bash
git add src/main/services/scanner.ts
git commit -m "feat: scanner 新增 collectFolderStructure，scanFolder 返回目录结构信息"
```

---

## Task 5: Album IPC 重构

**Files:**
- Modify: `src/main/ipc/albums.ts`

- [ ] **Step 1: 重构 registerAlbumIpc**

移除 `addPhoto`、`addPhotos`、`removePhoto`、`getPhotoCount`、`getAllPhotoCounts`、`getPhotos` 处理器。新增 `setCollapsed`、`setCover`、`getTree` 处理器。修改 `getAll` 返回树状结构：

```typescript
// src/main/ipc/albums.ts — 重构后
import { ipcMain, shell } from 'electron'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../db/album-repo'
import { getSmartAlbumPhotos, validateRules } from '../services/smart-album'
import { mkdir, rename, access } from 'fs/promises'
import { join, dirname } from 'path'

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

export function registerAlbumIpc(db: Database.Database) {
  const repo = createAlbumRepo(db)

  ipcMain.handle('albums:getAll', () => {
    return repo.getAll()
  })

  ipcMain.handle('albums:getTree', () => {
    return repo.getTree()
  })

  ipcMain.handle('albums:create', async (_event, name: string, parentPath: string, parentId?: number | null) => {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null
    const folderPath = join(parentPath, name)
    await mkdir(folderPath, { recursive: true })
    return repo.create({
      name,
      folder_path: folderPath,
      parent_id: parentId ?? null,
      created_at: new Date().toISOString()
    })
  })

  ipcMain.handle('albums:delete', async (_event, id: number) => {
    const album = repo.getById(id)
    if (!album) return { success: false, error: 'Album not found' }

    try {
      await access(album.folder_path)
      await shell.trashItem(album.folder_path)
    } catch (error) {
      if (!isNotFoundError(error)) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to move album to trash' }
      }
    }
    repo.delete(id)
    return { success: true }
  })

  ipcMain.handle('albums:rename', async (_event, id: number, newName: string) => {
    if (!newName || newName.includes('..') || newName.includes('/') || newName.includes('\\')) return null
    const album = repo.getById(id)
    if (!album) return

    const parentDir = dirname(album.folder_path)
    const newPath = join(parentDir, newName)
    try {
      await access(newPath)
      return { error: 'Target album folder already exists' }
    } catch (error) {
      if (!isNotFoundError(error)) {
        return { error: error instanceof Error ? error.message : 'Cannot access target album folder' }
      }
    }
    await rename(album.folder_path, newPath)
    repo.rename(id, newName, newPath)
    // 级联更新子相册路径
    repo.updateFolderPaths(album.folder_path, newPath)
    // 级联更新照片路径
    db.prepare('UPDATE photos SET parent_folder = REPLACE(parent_folder, ?, ?) WHERE parent_folder LIKE ?')
      .run(album.folder_path, newPath, album.folder_path + '%')
    db.prepare('UPDATE photos SET file_path = REPLACE(file_path, ?, ?), file_name = file_name WHERE file_path LIKE ?')
      .run(album.folder_path, newPath, album.folder_path + '%')
    return { success: true }
  })

  ipcMain.handle('albums:setCollapsed', (_event, id: number, collapsed: boolean) => {
    repo.setCollapsed(id, collapsed)
    return { success: true }
  })

  ipcMain.handle('albums:setCover', (_event, albumId: number, photoId: number) => {
    repo.setCover(albumId, photoId)
    return { success: true }
  })

  ipcMain.handle('albums:getPhotoCount', (_event, albumId: number) => {
    const album = repo.getById(albumId)
    if (!album) return 0
    return repo.getPhotoCountByPath(album.folder_path)
  })

  ipcMain.handle('albums:getAllPhotoCounts', () => {
    const albums = repo.getAll()
    const map: Record<number, number> = {}
    for (const album of albums) {
      map[album.id] = repo.getPhotoCountByPath(album.folder_path)
    }
    return map
  })

  // Smart Albums — 保持不变
  ipcMain.handle('smartAlbums:create', (_event, name: string, rules: string) => {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return { error: 'Invalid album name' }
    }
    const validation = validateRules(rules)
    if (!validation.valid) {
      return { error: validation.error }
    }
    const result = db.prepare('INSERT INTO smart_albums (name, rules) VALUES (?, ?)').run(name, rules)
    return { id: Number(result.lastInsertRowid) }
  })

  ipcMain.handle('smartAlbums:getAll', () => {
    return db.prepare('SELECT * FROM smart_albums ORDER BY id DESC').all()
  })

  ipcMain.handle('smartAlbums:delete', (_event, id: number) => {
    db.prepare('DELETE FROM smart_albums WHERE id = ?').run(id)
  })

  ipcMain.handle('smartAlbums:rename', (_event, id: number, name: string) => {
    db.prepare('UPDATE smart_albums SET name = ? WHERE id = ?').run(name, id)
  })

  ipcMain.handle('smartAlbums:update', (_event, id: number, name: string, rules: string) => {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return { error: 'Invalid album name' }
    }
    const validation = validateRules(rules)
    if (!validation.valid) {
      return { error: validation.error }
    }
    db.prepare('UPDATE smart_albums SET name = ?, rules = ? WHERE id = ?').run(name, rules, id)
    return { success: true }
  })

  ipcMain.handle('smartAlbums:getPhotos', (_event, albumId: number) => {
    return getSmartAlbumPhotos(db, albumId)
  })
}
```

- [ ] **Step 2: 运行测试**

Run: `pnpm test:run`
Expected: album-repo 和 photo-repo 测试 PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc/albums.ts
git commit -m "refactor: 重构 album IPC，移除文件移动逻辑，新增树状查询和折叠/封面 API"
```

---

## Task 6: Photos IPC 导入改造

**Files:**
- Modify: `src/main/ipc/photos.ts`

- [ ] **Step 1: 修改 importFolder 处理器**

导入文件夹后自动创建相册树。需要导入 `createAlbumRepo` 和 `collectFolderStructure`：

```typescript
// src/main/ipc/photos.ts — 修改 importFolder 处理器
import { createAlbumRepo } from '../db/album-repo'
import { collectFolderStructure } from '../services/scanner'

// 在 registerPhotoIpc 函数内部:
ipcMain.handle('photos:importFolder', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return null

  if (process.platform === 'darwin') {
    win.focus()
  }

  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })

  if (result.canceled || !result.filePaths[0]) return null

  const folderPath = result.filePaths[0]
  const albumRepo = createAlbumRepo(db)

  const scanResult = await scanFolder(
    (data) => repo.insert(data),
    (path) => repo.getByFilePath(path),
    {
      folderPath,
      onProgress: (current, total) => {
        win.webContents.send('photos:scanProgress', { current, total })
      }
    }
  )

  // scanFolder 现在返回 ScanResult { count, folders }
  const { count, folders } = scanResult

  // 根据目录结构自动创建相册
  const albumIdMap = new Map<string, number>() // folderPath -> albumId
  for (const folder of folders) {
    // 检查是否已存在
    const existing = albumRepo.getByFolderPath(folder.path)
    if (existing) {
      albumIdMap.set(folder.path, existing.id)
      continue
    }

    const parentId = folder.parentPath ? albumIdMap.get(folder.parentPath) ?? null : null
    const albumId = albumRepo.create({
      name: folder.name,
      folder_path: folder.path,
      parent_id: parentId,
      created_at: new Date().toISOString()
    })
    albumIdMap.set(folder.path, albumId)

    // 自动设置封面为该文件夹中第一张照片
    const firstPhoto = db.prepare('SELECT id FROM photos WHERE parent_folder = ? LIMIT 1').get(folder.path) as { id: number } | undefined
    if (firstPhoto) {
      albumRepo.setCover(albumId, firstPhoto.id)
    }
  }

  return { folderPath, count }
})
```

- [ ] **Step 2: 运行测试**

Run: `pnpm test:run`
Expected: 全部 PASS

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc/photos.ts
git commit -m "feat: 导入文件夹后自动根据目录结构创建相册树"
```

---

## Task 7: Preload API 更新

**Files:**
- Modify: `src/preload/index.ts`

- [ ] **Step 1: 更新 albums 命名空间**

移除废弃方法，新增 `getTree`、`setCollapsed`、`setCover`：

```typescript
// src/preload/index.ts — albums 命名空间替换为:
albums: {
  getAll: () => ipcRenderer.invoke('albums:getAll'),
  getTree: () => ipcRenderer.invoke('albums:getTree'),
  create: (name: string, parentPath: string, parentId?: number | null) => ipcRenderer.invoke('albums:create', name, parentPath, parentId),
  delete: (id: number) => ipcRenderer.invoke('albums:delete', id),
  rename: (id: number, name: string) => ipcRenderer.invoke('albums:rename', id, name),
  setCollapsed: (id: number, collapsed: boolean) => ipcRenderer.invoke('albums:setCollapsed', id, collapsed),
  setCover: (albumId: number, photoId: number) => ipcRenderer.invoke('albums:setCover', albumId, photoId),
  getPhotoCount: (albumId: number) => ipcRenderer.invoke('albums:getPhotoCount', albumId),
  getAllPhotoCounts: () => ipcRenderer.invoke('albums:getAllPhotoCounts'),
  createSmart: (name: string, rules: string) => ipcRenderer.invoke('smartAlbums:create', name, rules),
  getAllSmart: () => ipcRenderer.invoke('smartAlbums:getAll'),
  deleteSmart: (id: number) => ipcRenderer.invoke('smartAlbums:delete', id),
  renameSmart: (id: number, name: string) => ipcRenderer.invoke('smartAlbums:rename', id, name),
  updateSmart: (id: number, name: string, rules: string) => ipcRenderer.invoke('smartAlbums:update', id, name, rules),
  getSmartPhotos: (albumId: number) => ipcRenderer.invoke('smartAlbums:getPhotos', albumId)
},
```

移除的方法：`addPhoto`、`addPhotos`、`removePhoto`、`getPhotos`

- [ ] **Step 2: 运行 TypeScript 编译检查**

Run: `pnpm build`
Expected: 编译成功（可能有前端引用旧 API 的错误，后续任务修复）

- [ ] **Step 3: Commit**

```bash
git add src/preload/index.ts
git commit -m "refactor: 更新 preload API，移除废弃的相册照片操作方法"
```

---

## Task 8: Albums Store 重构

**Files:**
- Modify: `src/renderer/src/stores/albums.ts`

- [ ] **Step 1: 重写 albums store**

更新 `Album` 接口，新增 `setCollapsed`、`setCover` 方法，`fetchAlbums` 改为获取树状结构：

```typescript
// src/renderer/src/stores/albums.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Album {
  id: number
  name: string
  folder_path: string
  parent_id: number | null
  cover_photo_id: number | null
  is_collapsed: number
  created_at: string
  children?: Album[]
  photoCount?: number
}

export const useAlbumsStore = defineStore('albums', () => {
  const albums = ref<Album[]>([])
  const flatAlbums = ref<Album[]>([])

  async function fetchAlbums() {
    if (window.electronAPI) {
      flatAlbums.value = await window.electronAPI.albums.getAll()
    }
  }

  async function fetchTree() {
    if (window.electronAPI) {
      albums.value = await window.electronAPI.albums.getTree()
    }
  }

  async function createAlbum(name: string, parentPath: string, parentId?: number | null) {
    if (window.electronAPI) {
      await window.electronAPI.albums.create(name, parentPath, parentId)
      await fetchTree()
    }
  }

  async function deleteAlbum(id: number) {
    if (window.electronAPI) {
      await window.electronAPI.albums.delete(id)
      await fetchTree()
    }
  }

  async function renameAlbum(id: number, name: string) {
    if (window.electronAPI) {
      await window.electronAPI.albums.rename(id, name)
      await fetchTree()
    }
  }

  async function setCollapsed(id: number, collapsed: boolean) {
    if (window.electronAPI) {
      await window.electronAPI.albums.setCollapsed(id, collapsed)
      await fetchTree()
    }
  }

  async function setCover(albumId: number, photoId: number) {
    if (window.electronAPI) {
      await window.electronAPI.albums.setCover(albumId, photoId)
      await fetchTree()
    }
  }

  return { albums, flatAlbums, fetchAlbums, fetchTree, createAlbum, deleteAlbum, renameAlbum, setCollapsed, setCover }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/stores/albums.ts
git commit -m "refactor: 重构 albums store，支持树状数据和折叠/封面操作"
```

---

## Task 9: Photos Store 重构

**Files:**
- Modify: `src/renderer/src/stores/photos.ts`

- [ ] **Step 1: 更新 fetchPhotos 方法**

`fetchPhotos` 中的 `albumId` 参数已经传递给后端，后端已改为 `parent_folder` 查询。前端无需修改查询逻辑，但需要确保 `currentAlbumId` 正确传递。

检查 `photos.ts` 中 `fetchPhotos` 方法的 `albumId` 传递是否正确（当前实现已经通过 `options.albumId` 传递给 `electronAPI.photos.getAll`，后端会处理）。

无需修改 photos store，后端变更已兼容。

- [ ] **Step 2: Commit**

如果无需修改，跳过 commit。

---

## Task 10: 侧边栏树状 UI

**Files:**
- Modify: `src/renderer/src/components/layout/Sidebar.vue`

- [ ] **Step 1: 重构相册数据加载**

将 `loadAlbums` 函数改为使用 `albumsStore.fetchTree()` 获取树状数据：

```typescript
// Sidebar.vue — 替换 loadAlbums 函数
import { useAlbumsStore } from '../../stores/albums'
const albumsStore = useAlbumsStore()

const albumTree = computed(() => albumsStore.albums)
const albumCoverUrls = ref<Map<number, string>>(new Map())
const albumPhotoCounts = ref<Map<number, number>>(new Map())

async function loadAlbums() {
  await albumsStore.fetchTree()
  // 加载智能相册
  if (window.electronAPI) {
    smartAlbums.value = await window.electronAPI.albums.getAllSmart()
    const counts = await window.electronAPI.albums.getAllPhotoCounts()
    albumPhotoCounts.value = new Map(Object.entries(counts).map(([k, v]) => [Number(k), v]))
  }
  // 加载封面
  await loadAlbumCovers(albumTree.value)
}

async function loadAlbumCovers(tree: Album[]) {
  for (const album of tree) {
    if (album.cover_photo_id && window.electronAPI) {
      try {
        const thumbPath = await window.electronAPI.photos.getThumbnail(album.cover_photo_id)
        if (thumbPath) {
          albumCoverUrls.value.set(album.id, createLocalFileUrl('local-thumbnail', thumbPath))
        }
      } catch { /* ignore */ }
    }
    if (album.children?.length) {
      await loadAlbumCovers(album.children)
    }
  }
}
```

- [ ] **Step 2: 新增递归树状渲染组件**

在 Sidebar.vue 模板中，将扁平的手动相册列表替换为递归树状渲染。创建一个内部组件 `AlbumTreeItem`：

```vue
<!-- Sidebar.vue — 在 <script> 中定义递归组件 -->
<script setup lang="ts">
// ... 已有代码 ...

// 递归渲染相册树的模板组件
function toggleCollapse(album: Album) {
  albumsStore.setCollapsed(album.id, !album.is_collapsed)
}
</script>

<template>
  <!-- ... 已有的导航部分不变 ... -->

  <!-- 手动相册区域 — 树状结构 -->
  <div class="mt-4">
    <div class="flex items-center justify-between px-3 mb-1">
      <span class="text-xs font-medium text-text-muted uppercase tracking-wider">{{ $t('sidebar.albums') }}</span>
      <button @click="showAlbumDialog = true" class="text-text-muted hover:text-text-primary">
        <Plus :size="14" />
      </button>
    </div>
    <div v-if="albumTree.length === 0" class="px-3 py-2 text-text-muted text-xs">
      {{ $t('sidebar.noAlbums') }}
    </div>
    <div v-for="album in albumTree" :key="album.id">
      <div
        class="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg mx-1 transition-colors"
        :class="{ 'bg-bg-hover': isActive(`/album/${album.id}`) }"
        @click="navigate(`/album/${album.id}`)"
        @contextmenu.prevent="showAlbumContext($event, album)"
      >
        <!-- 展开/折叠箭头 -->
        <button
          v-if="album.children?.length"
          @click.stop="toggleCollapse(album)"
          class="text-text-muted hover:text-text-primary transition-transform"
          :class="{ '-rotate-90': album.is_collapsed }"
        >
          <ChevronRight :size="12" />
        </button>
        <span v-else class="w-3"></span>

        <!-- 封面缩略图 -->
        <img
          v-if="albumCoverUrls.get(album.id)"
          :src="albumCoverUrls.get(album.id)"
          class="w-6 h-6 rounded object-cover flex-shrink-0"
        />
        <div v-else class="w-6 h-6 rounded bg-bg-tertiary flex-shrink-0"></div>

        <!-- 名称 -->
        <span class="text-sm text-text-primary truncate flex-1">{{ album.name }}</span>

        <!-- 照片数量 -->
        <span class="text-xs text-text-muted">{{ album.photoCount || albumPhotoCounts.get(album.id) || 0 }}</span>
      </div>

      <!-- 子相册（递归） -->
      <div v-if="!album.is_collapsed && album.children?.length" class="ml-4">
        <div v-for="child in album.children" :key="child.id">
          <!-- 递归渲染子相册（简化版，实际应提取为组件） -->
          <div
            class="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg mx-1 transition-colors"
            :class="{ 'bg-bg-hover': isActive(`/album/${child.id}`) }"
            @click="navigate(`/album/${child.id}`)"
            @contextmenu.prevent="showAlbumContext($event, child)"
          >
            <button
              v-if="child.children?.length"
              @click.stop="toggleCollapse(child)"
              class="text-text-muted hover:text-text-primary transition-transform"
              :class="{ '-rotate-90': child.is_collapsed }"
            >
              <ChevronRight :size="12" />
            </button>
            <span v-else class="w-3"></span>
            <img
              v-if="albumCoverUrls.get(child.id)"
              :src="albumCoverUrls.get(child.id)"
              class="w-6 h-6 rounded object-cover flex-shrink-0"
            />
            <div v-else class="w-6 h-6 rounded bg-bg-tertiary flex-shrink-0"></div>
            <span class="text-sm text-text-primary truncate flex-1">{{ child.name }}</span>
            <span class="text-xs text-text-muted">{{ child.photoCount || albumPhotoCounts.get(child.id) || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

注意：上面的模板使用了 2 层硬编码递归。更好的方案是提取为独立的 `AlbumTreeItem.vue` 组件实现真正的递归。考虑到 Sidebar 的复杂度，建议提取组件。

- [ ] **Step 3: 移除拖拽相关代码**

移除 `handleAlbumDragOver`、`handleAlbumDragLeave`、`handleAlbumDrop`、`dragOverAlbumId` 等拖拽相关代码。

- [ ] **Step 4: 更新 createAlbum 调用**

`handleCreateAlbum` 不再需要选择父文件夹，改为直接在当前导入的根目录下创建：

```typescript
async function handleCreateAlbum(name: string) {
  // 使用当前选中的相册路径或默认路径
  const parentPath = albumTree.value[0]?.folder_path || ''
  if (!parentPath) {
    toast.error('请先导入文件夹')
    return
  }
  await albumsStore.createAlbum(name, parentPath)
  showAlbumDialog.value = false
  toast.success('相册创建成功')
}
```

- [ ] **Step 5: 添加缺失的 import**

确保导入 `ChevronRight` 图标（来自 lucide-vue-next）。

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/layout/Sidebar.vue
git commit -m "feat: 侧边栏重构为树状相册列表，支持展开/折叠"
```

---

## Task 11: AllPhotos 视图重构

**Files:**
- Modify: `src/renderer/src/views/AllPhotos.vue`
- Modify: `src/renderer/src/components/common/BatchActionBar.vue`

- [ ] **Step 1: 在 AllPhotos 中新增子相册卡片区域**

在 `loadPhotos` 函数中，当处于相册详情页时，同时加载子相册信息。在模板中照片网格上方显示子相册卡片：

```typescript
// AllPhotos.vue — 新增子相册状态
const childAlbums = ref<Album[]>([])

async function loadPhotos() {
  // ... 已有的 loadPhotos 逻辑 ...

  // 加载子相册
  if (route.name === 'album' && window.electronAPI) {
    const tree = await window.electronAPI.albums.getTree()
    const album = findAlbumInTree(tree, Number(route.params.id))
    childAlbums.value = album?.children || []
  } else {
    childAlbums.value = []
  }
}

function findAlbumInTree(tree: Album[], id: number): Album | undefined {
  for (const album of tree) {
    if (album.id === id) return album
    if (album.children?.length) {
      const found = findAlbumInTree(album.children, id)
      if (found) return found
    }
  }
  return undefined
}
```

- [ ] **Step 2: 在模板中添加子相册卡片区域**

在 PhotoGrid 组件上方添加子相册卡片：

```vue
<template>
  <!-- ... BatchActionBar 等 ... -->

  <!-- 子相册卡片区域 -->
  <div v-if="childAlbums.length > 0" class="px-4 py-3">
    <div class="text-xs font-medium text-text-muted mb-2">子相册</div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
      <div
        v-for="child in childAlbums"
        :key="child.id"
        class="group cursor-pointer"
        @click="$router.push(`/album/${child.id}`)"
      >
        <div class="aspect-square rounded-lg overflow-hidden bg-bg-tertiary">
          <img
            v-if="child.cover_photo_id"
            :src="getCoverUrl(child)"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
        <div class="mt-1 text-sm text-text-primary truncate">{{ child.name }}</div>
        <div class="text-xs text-text-muted">{{ child.photoCount || 0 }} 张</div>
      </div>
    </div>
  </div>

  <!-- ... PhotoGrid 等 ... -->
</template>
```

- [ ] **Step 3: 新增"设为封面"右键菜单项**

在相册详情页的 `contextMenuItems` computed 中新增"设为封面"选项。需要导入 `useAlbumsStore`：

```typescript
// AllPhotos.vue — 新增导入
import { useAlbumsStore } from '../stores/albums'
const albumsStore = useAlbumsStore()

// 在 contextMenuItems computed 中新增:
if (route.name === 'album') {
  items.push({
    label: '设为封面',
    action: () => {
      if (contextMenu.value?.photoId) {
        albumsStore.setCover(Number(route.params.id), contextMenu.value.photoId)
        toast.success('封面已更新')
      }
    }
  })
}
```

- [ ] **Step 4: 移除 AlbumPickerDialog 相关代码**

从 AllPhotos.vue 中移除：
- `import AlbumPickerDialog`
- `showAlbumPicker`、`handleBatchAddToAlbum`、`handleAlbumSelected` 相关状态和函数
- 模板中的 `<AlbumPickerDialog>` 组件
- `contextRemoveFromAlbum`、`confirmRemoveFromAlbum`、`showRemoveConfirm`、`pendingRemovePhoto` 相关代码
- `contextMenuItems` 中的"从相册移除"选项

- [ ] **Step 5: 从 BatchActionBar 移除"添加到相册"按钮**

```vue
<!-- BatchActionBar.vue — 移除以下代码块 -->
<!-- 加入相册 -->
<button @click="emit('addToAlbum')"
        class="text-text-secondary hover:text-text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
        :title="$t('batchAction.addToAlbum')">
  <FolderPlus :size="14" />
</button>
```

同时从 `defineEmits` 中移除 `'addToAlbum'`。

- [ ] **Step 6: 删除 AlbumPickerDialog.vue**

```bash
rm src/renderer/src/components/album/AlbumPickerDialog.vue
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/views/AllPhotos.vue src/renderer/src/components/common/BatchActionBar.vue
git rm src/renderer/src/components/album/AlbumPickerDialog.vue
git commit -m "feat: AllPhotos 新增子相册卡片，移除手动添加照片到相册功能"
```

---

## Task 12: App.vue 和集成修复

**Files:**
- Modify: `src/renderer/src/App.vue`

- [ ] **Step 1: 更新 handleImport 刷新相册树**

导入完成后除了刷新照片列表，还需要刷新侧边栏的相册树：

```typescript
// App.vue — 修改 handleImport
import { useAlbumsStore } from './stores/albums'

const albumsStore = useAlbumsStore()

async function handleImport() {
  try {
    const result = await window.electronAPI?.photos.importFolder()
    if (result) {
      toast.success(`成功导入 ${(result as { count: number }).count} 张照片`)
      await photosStore.refresh()
      await albumsStore.fetchTree() // 刷新相册树
    }
  } catch (err) {
    toast.error('导入照片失败')
  }
}
```

- [ ] **Step 2: 运行完整测试**

Run: `pnpm test:run`
Expected: 全部 PASS

- [ ] **Step 3: TypeScript 编译检查**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 4: 手动测试**

1. `pnpm dev` 启动开发服务器
2. 导入一个包含 2-3 层子文件夹的图片目录
3. 验证侧边栏显示树状相册列表
4. 验证相册详情页显示图片和子相册卡片
5. 验证折叠/展开交互
6. 验证右键"设为封面"功能

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/App.vue
git commit -m "feat: 导入完成后自动刷新相册树，完成相册系统重构"
```

---

## Verification

1. **单元测试**: `pnpm test:run` — 所有测试通过
2. **编译检查**: `pnpm build` — 无 TypeScript 错误
3. **手动测试**:
   - 导入包含多层子文件夹的图片目录，验证相册树正确生成
   - 侧边栏树状显示，展开/折叠交互正常
   - 相册详情页显示直接图片 + 子相册卡片
   - 右键照片"设为封面"功能正常（相册详情页右键菜单中有此选项）
   - 智能相册功能不受影响
   - 重命名/删除相册功能正常
