import Database from 'better-sqlite3'

export interface PhotoInsert {
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

export interface PhotoRow {
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
