import Database from 'better-sqlite3'
import { isRawFormat } from '../utils/file-types'

interface Condition {
  field: string
  op: 'equals' | 'not_equals' | 'gte' | 'lte' | 'contains' | 'in' | 'this_month' | 'this_year'
  value?: unknown
}

interface SmartAlbumRules {
  operator: 'AND' | 'OR'
  conditions: Condition[]
}

const ALLOWED_FIELDS = new Set([
  'camera_model', 'lens_model', 'rating', 'color_label',
  'is_rejected', 'format', 'iso', 'aperture', 'shot_at'
])

// 字段类型映射：number / string / boolean
const FIELD_TYPES: Record<string, 'number' | 'string' | 'boolean'> = {
  rating: 'number',
  iso: 'number',
  aperture: 'number',
  camera_model: 'string',
  lens_model: 'string',
  color_label: 'string',
  format: 'string',
  shot_at: 'string',
  is_rejected: 'boolean'
}

const ALLOWED_OPS = new Set([
  'equals', 'not_equals', 'gte', 'lte', 'contains', 'in', 'this_month', 'this_year'
])

export function validateRules(rulesStr: string): { valid: boolean; error?: string } {
  let rules: SmartAlbumRules
  try {
    rules = JSON.parse(rulesStr)
  } catch {
    return { valid: false, error: 'Invalid JSON' }
  }

  if (!rules.operator || !['AND', 'OR'].includes(rules.operator)) {
    return { valid: false, error: 'operator must be AND or OR' }
  }

  if (!Array.isArray(rules.conditions)) {
    return { valid: false, error: 'conditions must be an array' }
  }

  for (const cond of rules.conditions) {
    if (!cond.field || !ALLOWED_FIELDS.has(cond.field)) {
      return { valid: false, error: `Invalid field: ${cond.field}` }
    }
    if (!cond.op || !ALLOWED_OPS.has(cond.op)) {
      return { valid: false, error: `Invalid operator: ${cond.op}` }
    }

    // this_month/this_year 不需要 value
    if (cond.op === 'this_month' || cond.op === 'this_year') {
      continue
    }

    const fieldType = FIELD_TYPES[cond.field]

    // in 操作符：value 必须是数组
    if (cond.op === 'in') {
      if (!Array.isArray(cond.value)) {
        return { valid: false, error: `Field '${cond.field}' with 'in' operator requires array value` }
      }
      continue
    }

    // 按字段类型校验 value
    if (fieldType === 'number' && typeof cond.value !== 'number') {
      return { valid: false, error: `Field '${cond.field}' requires a number value` }
    }
    if (fieldType === 'boolean' && typeof cond.value !== 'boolean') {
      return { valid: false, error: `Field '${cond.field}' requires a boolean value` }
    }
    if (fieldType === 'string' && typeof cond.value !== 'string') {
      return { valid: false, error: `Field '${cond.field}' requires a string value` }
    }
  }

  return { valid: true }
}

function evaluateCondition(condition: Condition, photo: Record<string, unknown>): boolean {
  const { field, op, value } = condition
  const photoValue = photo[field]

  switch (op) {
    case 'equals':
      return photoValue === value
    case 'not_equals':
      return photoValue !== value
    case 'gte':
      return typeof photoValue === 'number' && typeof value === 'number' && photoValue >= value
    case 'lte':
      return typeof photoValue === 'number' && typeof value === 'number' && photoValue <= value
    case 'contains':
      return typeof photoValue === 'string' && typeof value === 'string' && photoValue.includes(value)
    case 'in':
      return Array.isArray(value) && value.includes(photoValue)
    case 'this_month': {
      if (typeof photoValue !== 'string') return false
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return photoValue.startsWith(month)
    }
    case 'this_year': {
      if (typeof photoValue !== 'string') return false
      return photoValue.startsWith(String(new Date().getFullYear()))
    }
    default:
      return false
  }
}

export function evaluateRules(rules: SmartAlbumRules, photo: Record<string, unknown>): boolean {
  if (!rules.conditions || rules.conditions.length === 0) return true

  const results = rules.conditions
    .filter(c => ALLOWED_FIELDS.has(c.field))
    .map(c => evaluateCondition(c, photo))

  return rules.operator === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean)
}

export function getSmartAlbumPhotos(db: Database.Database, albumId: number): Record<string, unknown>[] {
  const row = db.prepare('SELECT rules FROM smart_albums WHERE id = ?').get(albumId) as { rules: string } | undefined
  if (!row) return []

  let rules: SmartAlbumRules
  try {
    rules = JSON.parse(row.rules)
  } catch {
    return []
  }

  const photos = db.prepare('SELECT * FROM photos').all() as Record<string, unknown>[]
  const renderableStemInDir = new Set<string>()

  for (const photo of photos) {
    const format = String(photo.format || '').toLowerCase()
    if (isRawFormat(format)) continue
    const filePath = String(photo.file_path || '')
    const fileName = String(photo.file_name || '')
    const dir = filePath.slice(0, Math.max(0, filePath.length - fileName.length)).toLowerCase()
    const stem = fileName.replace(/\.[^.]+$/, '').toLowerCase()
    renderableStemInDir.add(`${dir}::${stem}`)
  }

  return photos.filter(photo => {
    const format = String(photo.format || '').toLowerCase()
    if (isRawFormat(format)) {
      const filePath = String(photo.file_path || '')
      const fileName = String(photo.file_name || '')
      const dir = filePath.slice(0, Math.max(0, filePath.length - fileName.length)).toLowerCase()
      const stem = fileName.replace(/\.[^.]+$/, '').toLowerCase()
      if (renderableStemInDir.has(`${dir}::${stem}`)) {
        return false
      }
    }
    return evaluateRules(rules, photo)
  })
}
