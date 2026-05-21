import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createPhotoRepo } from '../../../src/main/db/photo-repo'

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
      )
    `)
    repo = createPhotoRepo(db)
  })

  afterEach(() => { db.close() })

  it('insert and query photo', () => {
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

  it('filter by rating', () => {
    repo.insert({ file_path: '/a.jpg', file_name: 'a.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '', rating: 5 })
    repo.insert({ file_path: '/b.jpg', file_name: 'b.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '', rating: 0 })
    const rated = repo.getByRating(5)
    expect(rated).toHaveLength(1)
  })

  it('update rating', () => {
    const id = repo.insert({ file_path: '/a.jpg', file_name: 'a.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '' })
    repo.updateRating(id, 4)
    expect(repo.getById(id)!.rating).toBe(4)
  })

  it('batch update rating', () => {
    const id1 = repo.insert({ file_path: '/a.jpg', file_name: 'a.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '' })
    const id2 = repo.insert({ file_path: '/b.jpg', file_name: 'b.jpg', file_size: 100, format: 'jpeg', created_at: '', modified_at: '' })
    repo.batchUpdateRating([id1, id2], 3)
    expect(repo.getById(id1)!.rating).toBe(3)
    expect(repo.getById(id2)!.rating).toBe(3)
  })

  it('同目录同名存在可预览格式时应隐藏 RAW（兼容历史 format=raf）', () => {
    repo.insert({
      file_path: '/photos/DSCF0001.JPG',
      file_name: 'DSCF0001.JPG',
      file_size: 2048,
      format: 'jpg',
      created_at: '2024-01-15T00:00:00Z',
      modified_at: '2024-01-15T00:00:00Z'
    })
    repo.insert({
      file_path: '/photos/DSCF0001.RAF',
      file_name: 'DSCF0001.RAF',
      file_size: 4096,
      format: 'raf',
      created_at: '2024-01-15T00:00:00Z',
      modified_at: '2024-01-15T00:00:00Z'
    })

    const list = repo.getAll({ limit: 20, offset: 0 })
    expect(list).toHaveLength(1)
    expect(list[0].format).toBe('jpg')
  })

  it('没有同名可预览文件时应保留 RAW', () => {
    repo.insert({
      file_path: '/photos/DSCF0002.RAF',
      file_name: 'DSCF0002.RAF',
      file_size: 4096,
      format: 'raf',
      created_at: '2024-01-15T00:00:00Z',
      modified_at: '2024-01-15T00:00:00Z'
    })

    const list = repo.getAll({ limit: 20, offset: 0 })
    expect(list).toHaveLength(1)
    expect(list[0].format).toBe('raf')
  })
})
