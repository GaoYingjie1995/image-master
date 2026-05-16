import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { createSettingsRepo } from '../db/settings-repo'

export function registerSettingsIpc(db: Database.Database) {
  const repo = createSettingsRepo(db)

  ipcMain.handle('settings:get', (_event, key: string) => {
    return repo.get(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    repo.set(key, value)
  })

  ipcMain.handle('settings:getAll', () => {
    return repo.getAll()
  })
}
