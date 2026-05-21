import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../../../src/main/db/album-repo'

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
        parent_id INTEGER,
        cover_photo_id INTEGER,
        description TEXT,
        is_collapsed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES albums(id) ON DELETE CASCADE
      );
      CREATE TABLE album_photos (
        album_id INTEGER NOT NULL,
        photo_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY (album_id, photo_id),
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
      )
    `)
    repo = createAlbumRepo(db)
  })

  afterEach(() => { db.close() })

  it('create and query album', () => {
    const id = repo.create({ name: 'Travel', folder_path: '/photos/travel', created_at: '2024-01-15' })
    const album = repo.getById(id)
    expect(album!.name).toBe('Travel')
  })

  it('list all albums', () => {
    repo.create({ name: 'A', folder_path: '/a', created_at: '2024-01-01' })
    repo.create({ name: 'B', folder_path: '/b', created_at: '2024-01-02' })
    expect(repo.getAll()).toHaveLength(2)
  })

  it('delete album', () => {
    const id = repo.create({ name: 'Test', folder_path: '/test', created_at: '' })
    repo.delete(id)
    expect(repo.getById(id)).toBeUndefined()
  })
})
