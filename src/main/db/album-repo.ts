import Database from 'better-sqlite3'

export interface AlbumInsert {
  name: string
  folder_path: string
  cover_photo_id?: number
  description?: string
  created_at: string
}

export interface AlbumRow {
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
