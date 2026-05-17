import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import Database from 'better-sqlite3'
import { createPhotoRepo } from '../db/photo-repo'
import { scanFolder } from '../services/scanner'
import { getThumbnailPath, getThumbnailPathForPhoto, getPreviewPathForPhoto, generateThumbnail, generatePreview, getCacheSize, clearCache } from '../services/thumbnail'
import { batchRename, batchExport } from '../services/batch-operations'
import { computeHistogram } from '../services/histogram'
import { deletePhotos } from '../services/delete-service'
import { parseExif } from '../services/exif-parser'
import { rename as fsRename } from 'fs/promises'
import { basename } from 'path'

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

  ipcMain.handle('photos:countFiltered', (_event, filter?: string, search?: string, albumId?: number) => {
    return repo.countFiltered(filter, search, albumId)
  })

  ipcMain.handle('photos:getIdsByFilter', (_event, options?: { filter?: string; search?: string; albumId?: number }) => {
    return repo.getIdsByFilter(options?.filter, options?.search, options?.albumId)
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
    return deletePhotos(db, ids)
  })

  ipcMain.handle('photos:importFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    // macOS 无边框窗口下需要先聚焦窗口，否则对话框可能被挡在后面
    if (process.platform === 'darwin') {
      win.focus()
    }

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

    const thumbPath = await getThumbnailPathForPhoto(photoId, photo.file_path)
    try {
      const { access } = await import('fs/promises')
      await access(thumbPath)
    } catch {
      await generateThumbnail(photo.file_path, thumbPath)
      // 兼容清理旧版仅按 photoId 命名的缓存文件，避免误命中历史缩略图
      try {
        const { unlink } = await import('fs/promises')
        const legacyPath = await getThumbnailPath(photoId)
        if (legacyPath !== thumbPath) {
          await unlink(legacyPath)
        }
      } catch { /* ignore */ }
    }

    return thumbPath
  })

  ipcMain.handle('photos:getPreview', async (_event, photoId: number) => {
    const photo = repo.getById(photoId)
    if (!photo) return null

    if (photo.format !== 'raw') {
      return { scheme: 'local-photo', path: photo.file_path }
    }

    const previewPath = await getPreviewPathForPhoto(photoId, photo.file_path)
    try {
      const { access } = await import('fs/promises')
      await access(previewPath)
    } catch {
      await generatePreview(photo.file_path, previewPath)
    }

    return { scheme: 'local-thumbnail', path: previewPath }
  })

  ipcMain.handle('photos:batchRename', async (_event, ids: number[], template: string, startSeq: number) => {
    const photos = ids.map(id => repo.getById(id)).filter((p): p is NonNullable<typeof p> => p !== undefined)
    const results = await batchRename(photos, template, startSeq, {
      isTargetReserved: (targetPath, sourceId) => {
        const existing = repo.getByFilePath(targetPath)
        return !!existing && existing.id !== sourceId
      }
    })
    // 重命名成功后同步更新数据库路径
    const updatePathBatch = db.transaction((items: { id: number; newPath: string }[]) => {
      for (const item of items) {
        repo.updatePath(item.id, item.newPath, basename(item.newPath))
      }
    })
    try {
      updatePathBatch(results.map(r => ({ id: r.id, newPath: r.newPath })))
    } catch (err) {
      for (let i = results.length - 1; i >= 0; i--) {
        try {
          await fsRename(results[i].newPath, results[i].oldPath)
        } catch { /* 回滚失败时保留原始错误 */ }
      }
      throw err
    }
    return results
  })

  ipcMain.handle('photos:batchExport', async (event, ids: number[], options: { outputDir: string; format: string; quality: number; maxWidth?: number; maxHeight?: number; keepExif: boolean }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const photos = ids.map(id => repo.getById(id)).filter((p): p is NonNullable<typeof p> => p !== undefined)
    await batchExport(photos, {
      ...options,
      format: options.format as 'jpeg' | 'png' | 'webp' | 'tiff',
      onProgress: (current, total) => {
        win?.webContents.send('photos:exportProgress', { current, total })
      }
    })
  })

  ipcMain.handle('photos:getHistogram', async (_event, photoId: number) => {
    const photo = repo.getById(photoId)
    if (!photo) return null
    return computeHistogram(photo.file_path)
  })

  ipcMain.handle('photos:getWithGps', (_event, options?: { dateFrom?: string; dateTo?: string }) => {
    return repo.getWithGps(options)
  })

  ipcMain.handle('photos:showInFolder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('photos:getCacheSize', async () => {
    return getCacheSize()
  })

  ipcMain.handle('photos:clearCache', async () => {
    return clearCache()
  })

  ipcMain.handle('photos:rescanMetadata', async () => {
    const photos = repo.getAll() as { id: number; file_path: string }[]
    let updated = 0
    for (const photo of photos) {
      try {
        const exif = await parseExif(photo.file_path)
        if (exif) {
          db.prepare(`UPDATE photos SET shot_at = ?, camera_model = ?, lens_model = ?, iso = ?, aperture = ?, shutter_speed = ?, width = ?, height = ?, gps_lat = ?, gps_lng = ? WHERE id = ?`)
            .run(exif.shot_at || null, exif.camera_model || null, exif.lens_model || null, exif.iso || null, exif.aperture || null, exif.shutter_speed || null, exif.width || null, exif.height || null, exif.gps_lat || null, exif.gps_lng || null, photo.id)
          updated++
        }
      } catch { /* skip unreadable files */ }
    }
    return { updated, total: photos.length }
  })

  ipcMain.handle('photos:selectExportDir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
}
