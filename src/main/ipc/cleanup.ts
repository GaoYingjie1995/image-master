import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { detectDuplicates } from '../services/duplicate-detector'
import { findOrphanedRaws } from '../services/raw-manager'
import { createPhotoRepo } from '../db/photo-repo'
import { unlink } from 'fs/promises'

export function registerCleanupIpc(db: Database.Database) {
  const photoRepo = createPhotoRepo(db)

  ipcMain.handle('cleanup:detectDuplicates', async (event, folderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    return detectDuplicates(
      {
        getPhotosInFolder: (path) => {
          return db.prepare(`
            SELECT id, file_path, file_name, file_size FROM photos
            WHERE file_path LIKE ? || '%'
          `).all(path) as { id: number; file_path: string; file_name: string; file_size: number }[]
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
    for (const path of filePaths) {
      await unlink(path).catch(() => {})
    }
  })

  ipcMain.handle('cleanup:findOrphanedRaws', (_event, folderPath: string) => {
    return findOrphanedRaws(
      {
        getRawsInFolder: (path) => {
          return db.prepare(`
            SELECT id, file_path, file_name FROM photos
            WHERE file_path LIKE ? || '%'
            AND format = 'raw'
          `).all(path) as { id: number; file_path: string; file_name: string }[]
        },
        findJpegByName: (baseName, path) => {
          return db.prepare(`
            SELECT id, file_path, file_name FROM photos
            WHERE (LOWER(file_name) = ? || '.jpg' OR LOWER(file_name) = ? || '.jpeg')
            AND file_path LIKE ? || '%'
          `).get(baseName, baseName, path) as { id: number; file_path: string; file_name: string } | null
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
