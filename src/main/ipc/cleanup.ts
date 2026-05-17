import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { detectDuplicates } from '../services/duplicate-detector'
import { findOrphanedRaws } from '../services/raw-manager'
import { createPhotoRepo } from '../db/photo-repo'
import { deletePhotos, findPhotoIdsByPaths } from '../services/delete-service'
import { isPathInsideOrEqual } from '../utils/path-utils'
import { resolve } from 'path'

export function registerCleanupIpc(db: Database.Database) {
  const photoRepo = createPhotoRepo(db)

  ipcMain.handle('cleanup:detectDuplicates', async (event, folderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    return detectDuplicates(
      {
        getPhotosInFolder: (path) => {
          const rows = db.prepare('SELECT id, file_path, file_name, file_size FROM photos').all() as { id: number; file_path: string; file_name: string; file_size: number }[]
          return rows.filter(photo => isPathInsideOrEqual(path, photo.file_path))
        },
        updateHash: (id, hash) => photoRepo.updateHash(id, hash)
      },
      folderPath,
      (phase, current, total) => {
        win?.webContents.send('cleanup:progress', { phase, current, total })
      }
    )
  })

  ipcMain.handle('cleanup:deleteFiles', async (_event, filePaths: string[]) => {
    // 通过文件路径查找对应的数据库记录 ID，再走统一删除逻辑
    const validPaths = filePaths.filter(p => {
      if (!p || typeof p !== 'string') return false
      const resolved = resolve(p)
      return !resolved.includes('\0')
    })
    const ids = findPhotoIdsByPaths(db, validPaths)
    if (ids.length === 0) return { success: 0, failed: 0, errors: [] }
    return deletePhotos(db, ids)
  })

  ipcMain.handle('cleanup:findOrphanedRaws', (_event, folderPath: string) => {
    return findOrphanedRaws(
      {
        getRawsInFolder: (path) => {
          const rows = db.prepare(`
            SELECT id, file_path, file_name FROM photos
            WHERE format = 'raw'
          `).all() as { id: number; file_path: string; file_name: string }[]
          return rows.filter(photo => isPathInsideOrEqual(path, photo.file_path))
        },
        findJpegByName: (baseName, path) => {
          const rows = db.prepare(`
            SELECT id, file_path, file_name FROM photos
            WHERE (LOWER(file_name) = ? || '.jpg' OR LOWER(file_name) = ? || '.jpeg')
          `).all(baseName, baseName) as { id: number; file_path: string; file_name: string }[]
          return rows.find(photo => isPathInsideOrEqual(path, photo.file_path)) ?? null
        }
      },
      folderPath
    )
  })

  ipcMain.handle('cleanup:selectFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })

    return result.canceled ? null : result.filePaths[0]
  })
}
