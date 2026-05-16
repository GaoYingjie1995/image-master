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
  const path = dbPath || ':memory:'
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}
