import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { findPhotoIdsByPaths } from '../../../src/main/services/delete-service'
import { validateRules } from '../../../src/main/services/smart-album'

describe('findPhotoIdsByPaths', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        format TEXT DEFAULT 'jpeg',
        hash TEXT,
        rating INTEGER DEFAULT 0,
        color_label TEXT,
        is_rejected INTEGER DEFAULT 0,
        camera_model TEXT,
        lens_model TEXT,
        iso INTEGER,
        aperture REAL,
        shutter_speed TEXT,
        shot_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
    db.prepare('INSERT INTO photos (file_path, file_name) VALUES (?, ?)').run('/photos/img1.jpg', 'img1.jpg')
    db.prepare('INSERT INTO photos (file_path, file_name) VALUES (?, ?)').run('/photos/img2.jpg', 'img2.jpg')
    db.prepare('INSERT INTO photos (file_path, file_name) VALUES (?, ?)').run('/photos/img3.jpg', 'img3.jpg')
  })

  afterEach(() => {
    db.close()
  })

  it('应返回匹配的照片 ID', () => {
    const ids = findPhotoIdsByPaths(db, ['/photos/img1.jpg', '/photos/img3.jpg'])
    expect(ids).toEqual([1, 3])
  })

  it('应忽略不存在的路径', () => {
    const ids = findPhotoIdsByPaths(db, ['/photos/img1.jpg', '/nonexistent.jpg'])
    expect(ids).toEqual([1])
  })

  it('空数组应返回空结果', () => {
    const ids = findPhotoIdsByPaths(db, [])
    expect(ids).toEqual([])
  })

  it('所有路径都不存在时应返回空数组', () => {
    const ids = findPhotoIdsByPaths(db, ['/a.jpg', '/b.jpg'])
    expect(ids).toEqual([])
  })
})

describe('validateRules', () => {
  it('有效规则应通过校验', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'rating', op: 'gte', value: 4 }]
    })
    expect(validateRules(rules)).toEqual({ valid: true })
  })

  it('无效 JSON 应返回错误', () => {
    expect(validateRules('not json')).toEqual({ valid: false, error: 'Invalid JSON' })
  })

  it('无效 operator 应返回错误', () => {
    const rules = JSON.stringify({
      operator: 'XOR',
      conditions: [{ field: 'rating', op: 'gte', value: 4 }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: 'operator must be AND or OR' })
  })

  it('无效 field 应返回错误', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'hacked_field', op: 'equals', value: 'x' }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: 'Invalid field: hacked_field' })
  })

  it('无效 op 应返回错误', () => {
    const rules = JSON.stringify({
      operator: 'OR',
      conditions: [{ field: 'rating', op: 'drop_table', value: 0 }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: 'Invalid operator: drop_table' })
  })

  it('conditions 非数组应返回错误', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: 'not_an_array'
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: 'conditions must be an array' })
  })

  it('多个条件全部有效时应通过', () => {
    const rules = JSON.stringify({
      operator: 'OR',
      conditions: [
        { field: 'rating', op: 'gte', value: 4 },
        { field: 'camera_model', op: 'contains', value: 'Sony' },
        { field: 'shot_at', op: 'this_month' }
      ]
    })
    expect(validateRules(rules)).toEqual({ valid: true })
  })
})
