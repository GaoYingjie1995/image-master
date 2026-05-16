import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { createPhotoRepo } from '../db/photo-repo'
import { scanFolder } from '../services/scanner'
import { getThumbnailPath, generateThumbnail } from '../services/thumbnail'

export function registerPhotoIpc(db: Database.Database) {
  const repo = createPhotoRepo(db)

  ipcMain.handle('photos:getAll', (_event, options?) => {
    return repo.getAll(options)
  })

  ipcMain.handle('photos:getById', (_event, id: number) => {
    return repo.getById(id)
  })

  ipcMain.handle('photos:getToday', () => {
    return repo.getToday()
  })

  ipcMain.handle('photos:count', () => {
    return repo.count()
  })

  ipcMain.handle('photos:updateRating', (_event, id: number, rating: number) => {
    repo.updateRating(id, rating)
  })

  ipcMain.handle('photos:batchUpdateRating', (_event, ids: number[], rating: number) => {
    repo.batchUpdateRating(ids, rating)
  })

  ipcMain.handle('photos:updateColorLabel', (_event, id: number, label: string | null) => {
    repo.updateColorLabel(id, label)
  })

  ipcMain.handle('photos:updateRejected', (_event, id: number, rejected: boolean) => {
    repo.updateRejected(id, rejected)
  })

  ipcMain.handle('photos:batchDelete', async (_event, ids: number[]) => {
    const photos = ids.map(id => repo.getById(id)).filter(Boolean)
    const { unlink } = await import('fs/promises')
    for (const photo of photos) {
      if (photo) await unlink(photo.file_path).catch(() => {})
    }
    repo.batchDelete(ids)
  })

  ipcMain.handle('photos:importFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })

    if (result.canceled || !result.filePaths[0]) return null

    const folderPath = result.filePaths[0]
    const count = await scanFolder(
      (data) => repo.insert(data),
      (path) => repo.getByFilePath(path),
      {
        folderPath,
        onProgress: (current, total) => {
          win.webContents.send('photos:scanProgress', { current, total })
        }
      }
    )

    return { folderPath, count }
  })

  ipcMain.handle('photos:getThumbnail', async (_event, photoId: number) => {
    const photo = repo.getById(photoId)
    if (!photo) return null

    const thumbPath = await getThumbnailPath(photoId)
    try {
      const { access } = await import('fs/promises')
      await access(thumbPath)
    } catch {
      await generateThumbnail(photo.file_path, thumbPath)
    }

    return thumbPath
  })
}
