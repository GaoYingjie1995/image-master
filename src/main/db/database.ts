import Database from 'better-sqlite3'
import { join } from 'path'

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
  db.exec(SCHEMA)
  return db
}
