import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { validateRules, getSmartAlbumPhotos } from '../../../src/main/services/smart-album'

describe('validateRules', () => {
  it('有效规则应通过校验', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'rating', op: 'gte', value: 4 }]
    })
    expect(validateRules(rules)).toEqual({ valid: true })
  })

  it('无效 JSON 应失败', () => {
    expect(validateRules('not json')).toEqual({ valid: false, error: 'Invalid JSON' })
  })

  it('无效 operator 应失败', () => {
    const rules = JSON.stringify({
      operator: 'XOR',
      conditions: [{ field: 'rating', op: 'gte', value: 4 }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: 'operator must be AND or OR' })
  })

  it('无效 field 应失败', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'invalid_field', op: 'equals', value: 'test' }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: 'Invalid field: invalid_field' })
  })

  it('无效 operator op 应失败', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'rating', op: 'between', value: 4 }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: 'Invalid operator: between' })
  })

  it('数值字段使用字符串值应失败', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'rating', op: 'gte', value: 'abc' }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: "Field 'rating' requires a number value" })
  })

  it('字符串字段使用数值应失败', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'camera_model', op: 'equals', value: 123 }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: "Field 'camera_model' requires a string value" })
  })

  it('布尔字段使用非布尔值应失败', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'is_rejected', op: 'equals', value: 'true' }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: "Field 'is_rejected' requires a boolean value" })
  })

  it('in 操作符使用非数组值应失败', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'color_label', op: 'in', value: 'red' }]
    })
    expect(validateRules(rules)).toEqual({ valid: false, error: "Field 'color_label' with 'in' operator requires array value" })
  })

  it('in 操作符使用数组值应通过', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'color_label', op: 'in', value: ['red', 'blue'] }]
    })
    expect(validateRules(rules)).toEqual({ valid: true })
  })

  it('this_month 操作符不需要 value 应通过', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'shot_at', op: 'this_month' }]
    })
    expect(validateRules(rules)).toEqual({ valid: true })
  })

  it('this_year 操作符不需要 value 应通过', () => {
    const rules = JSON.stringify({
      operator: 'AND',
      conditions: [{ field: 'shot_at', op: 'this_year' }]
    })
    expect(validateRules(rules)).toEqual({ valid: true })
  })

  it('多个条件混合校验', () => {
    const rules = JSON.stringify({
      operator: 'OR',
      conditions: [
        { field: 'rating', op: 'gte', value: 4 },
        { field: 'camera_model', op: 'contains', value: 'Sony' },
        { field: 'is_rejected', op: 'equals', value: false }
      ]
    })
    expect(validateRules(rules)).toEqual({ valid: true })
  })
})

describe('getSmartAlbumPhotos', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE smart_albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rules TEXT NOT NULL
      );
      CREATE TABLE photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        format TEXT NOT NULL,
        rating INTEGER DEFAULT 0,
        color_label TEXT,
        is_rejected INTEGER DEFAULT 0,
        shot_at TEXT,
        camera_model TEXT,
        lens_model TEXT,
        iso INTEGER,
        aperture REAL
      );
    `)
    db.prepare('INSERT INTO smart_albums (name, rules) VALUES (?, ?)').run('all', JSON.stringify({ operator: 'AND', conditions: [] }))
  })

  afterEach(() => {
    db.close()
  })

  it('有同目录同名可预览文件时应隐藏 RAW（兼容 format=raf）', () => {
    db.prepare('INSERT INTO photos (file_path, file_name, format) VALUES (?, ?, ?)').run('/photos/DSCF1000.jpg', 'DSCF1000.jpg', 'jpg')
    db.prepare('INSERT INTO photos (file_path, file_name, format) VALUES (?, ?, ?)').run('/photos/DSCF1000.raf', 'DSCF1000.raf', 'raf')

    const photos = getSmartAlbumPhotos(db, 1)
    expect(photos).toHaveLength(1)
    expect(photos[0].format).toBe('jpg')
  })
})
