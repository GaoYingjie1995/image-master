import Database from 'better-sqlite3'
import { join, dirname, basename } from 'path'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS import_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_path TEXT UNIQUE NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_removed_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES import_sources(id) ON DELETE CASCADE,
  folder_path TEXT NOT NULL,
  removed_at TEXT NOT NULL,
  UNIQUE(source_id, folder_path)
);

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
  import_source_id INTEGER REFERENCES import_sources(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_albums_import_source_id ON albums(import_source_id);
`

export function createDatabase(dbPath?: string): Database.Database {
  if (!dbPath) {
    // 动态导入 app 以支持测试环境（测试时传入 dbPath）
    try {
      const { app } = require('electron')
      const { join } = require('path')
      dbPath = join(app.getPath('userData'), 'image-master.db')
    } catch {
      dbPath = ':memory:'
    }
  }
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // 迁移：为旧数据库添加缺失的列
  for (const stmt of [
    'ALTER TABLE photos ADD COLUMN parent_folder TEXT',
    'ALTER TABLE albums ADD COLUMN parent_id INTEGER REFERENCES albums(id) ON DELETE CASCADE',
    'ALTER TABLE albums ADD COLUMN cover_photo_id INTEGER',
    'ALTER TABLE albums ADD COLUMN is_collapsed INTEGER DEFAULT 0',
    'ALTER TABLE albums ADD COLUMN import_source_id INTEGER REFERENCES import_sources(id) ON DELETE SET NULL',
  ]) {
    try { db.exec(stmt) } catch { /* 列已存在则忽略 */ }
  }

  db.exec(SCHEMA)

  // 迁移：为已有照片填充 parent_folder，并自动创建相册记录
  try {
    const orphanPhotos = db.prepare(
      'SELECT id, file_path FROM photos WHERE parent_folder IS NULL'
    ).all() as { id: number; file_path: string }[]

    if (orphanPhotos.length > 0) {
      // 用 Node.js path 模块提取目录路径（兼容所有平台）
      const updateStmt = db.prepare('UPDATE photos SET parent_folder = ? WHERE id = ?')
      const folderSet = new Set<string>()
      const migrate = db.transaction(() => {
        for (const photo of orphanPhotos) {
          const dir = dirname(photo.file_path)
          updateStmt.run(dir, photo.id)
          folderSet.add(dir)
        }
        // 为尚未创建相册的目录自动创建相册记录
        const existingAlbums = db.prepare('SELECT folder_path FROM albums').all() as { folder_path: string }[]
        const existingSet = new Set(existingAlbums.map(a => a.folder_path))
        const insertStmt = db.prepare(
          'INSERT INTO albums (name, folder_path, parent_id, is_collapsed, created_at) VALUES (?, ?, NULL, 0, datetime(\'now\'))'
        )
        // 按路径深度排序，确保父目录先创建
        const sortedFolders = [...folderSet].filter(f => !existingSet.has(f)).sort((a, b) => a.length - b.length)
        for (const folder of sortedFolders) {
          insertStmt.run(basename(folder), folder)
        }
        // 建立层级关系：为每个相册找到最近的父相册
        const allAlbums = db.prepare('SELECT id, folder_path FROM albums WHERE parent_id IS NULL').all() as { id: number; folder_path: string }[]
        const updateParent = db.prepare('UPDATE albums SET parent_id = ? WHERE id = ?')
        for (const album of allAlbums) {
          const parentDir = dirname(album.folder_path)
          if (parentDir !== album.folder_path) {
            const parent = allAlbums.find(a => a.folder_path === parentDir)
            if (parent) {
              updateParent.run(parent.id, album.id)
            }
          }
        }
        // 为每个相册设置封面（该目录下的第一张照片）
        const setCover = db.prepare('UPDATE albums SET cover_photo_id = ? WHERE id = ?')
        const allAlbumsWithPath = db.prepare('SELECT id, folder_path FROM albums').all() as { id: number; folder_path: string }[]
        for (const album of allAlbumsWithPath) {
          const firstPhoto = db.prepare('SELECT id FROM photos WHERE parent_folder = ? LIMIT 1').get(album.folder_path) as { id: number } | undefined
          if (firstPhoto) {
            setCover.run(firstPhoto.id, album.id)
          }
        }
      })
      migrate()
    }
  } catch { /* 迁移失败不阻塞启动 */ }

  // 迁移：为现有数据创建 import_sources 记录
  try {
    const hasImportSources = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='import_sources'").get()
    if (hasImportSources) {
      const existingSources = db.prepare('SELECT COUNT(*) as count FROM import_sources').get() as { count: number }
      if (existingSources.count === 0) {
        // 识别根相册：folder_path 不是其他相册 folder_path 的子路径
        const rootAlbums = db.prepare(`
          SELECT a.id, a.folder_path, a.created_at FROM albums a
          WHERE a.parent_id IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM albums b
              WHERE b.id != a.id
                AND a.folder_path LIKE b.folder_path || '/%'
            )
          ORDER BY a.created_at ASC
        `).all() as { id: number; folder_path: string; created_at: string }[]

        const insertSource = db.prepare('INSERT INTO import_sources (folder_path, imported_at) VALUES (?, ?)')
        const updateAlbum = db.prepare('UPDATE albums SET import_source_id = ? WHERE id = ?')
        const updateDescendants = db.prepare('UPDATE albums SET import_source_id = ? WHERE folder_path LIKE ?')

        const migrate = db.transaction(() => {
          for (const album of rootAlbums) {
            const result = insertSource.run(album.folder_path, album.created_at)
            const sourceId = Number(result.lastInsertRowid)
            updateAlbum.run(sourceId, album.id)
            updateDescendants.run(sourceId, album.folder_path + '/%')
          }
        })
        migrate()
      }
    }
  } catch { /* 迁移失败不阻塞启动 */ }

  return db
}
