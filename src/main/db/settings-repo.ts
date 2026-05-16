import Database from 'better-sqlite3'

export function createSettingsRepo(db: Database.Database) {
  return {
    get(key: string): unknown | null {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
      return row ? JSON.parse(row.value) : null
    },

    set(key: string, value: unknown): void {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value))
    },

    getAll(): Record<string, unknown> {
      const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
      return Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]))
    }
  }
}
