import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { detectDuplicates } from '../services/duplicate-detector'
import { createPhotoRepo } from '../db/photo-repo'
import { deletePhotos, findPhotoIdsByPaths } from '../services/delete-service'
import { isPathInsideOrEqual, getFileNameWithoutExt } from '../utils/path-utils'
import { getRawExtensions, isImage } from '../utils/file-types'
import { resolve } from 'path'
import { collectImageFiles, scanSingleFile } from '../services/scanner'

export function registerCleanupIpc(db: Database.Database) {
  const photoRepo = createPhotoRepo(db)
  const RAW_EXTENSIONS = new Set(getRawExtensions())

  ipcMain.handle('cleanup:detectDuplicates', async (event, folderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    // 自动扫描文件夹，将磁盘上存在但数据库中没有的文件导入
    // 这解决了从回收站还原文件后重复检测失效的问题
    win?.webContents.send('cleanup:progress', { phase: '扫描文件', current: 0, total: 0 })
    const imageFiles = await collectImageFiles(folderPath)
    for (let i = 0; i < imageFiles.length; i++) {
      const filePath = imageFiles[i]
      if (!photoRepo.getByFilePath(filePath)) {
        const data = await scanSingleFile(filePath)
        if (data) photoRepo.insert(data)
      }
      if (i % 50 === 0) {
        win?.webContents.send('cleanup:progress', { phase: '扫描文件', current: i + 1, total: imageFiles.length })
      }
    }

    return detectDuplicates(
      {
        getPhotosInFolder: (path) => {
          const rows = db.prepare("SELECT id, file_path, file_name, file_size FROM photos WHERE file_path LIKE ? || '%'").all(path) as { id: number; file_path: string; file_name: string; file_size: number }[]
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
    if (ids.length === 0) {
      console.warn('[cleanup:deleteFiles] 未找到匹配的数据库记录，请求路径:', validPaths)
      return { success: 0, failed: validPaths.length, errors: validPaths.map(p => `${p}: 数据库中未找到对应记录`) }
    }
    return deletePhotos(db, ids)
  })

  ipcMain.handle('cleanup:findOrphanedRaws', async (_event, folderPath: string) => {
    const { readdir } = await import('fs/promises')
    const { join, extname } = await import('path')

    const files = await readdir(folderPath)

    const imageFiles = files.filter(file => {
      const ext = extname(file).slice(1).toLowerCase()
      return isImage(ext)
    })

    // 分离RAW和JPG/JPEG文件
    const rawFiles: string[] = []
    const jpegBaseNames = new Set<string>()

    for (const file of imageFiles) {
      const ext = extname(file).slice(1).toLowerCase()
      const baseName = getFileNameWithoutExt(file).toLowerCase()

      if (RAW_EXTENSIONS.has(ext)) {
        rawFiles.push(file)
      } else if (ext === 'jpg' || ext === 'jpeg') {
        jpegBaseNames.add(baseName)
      }
    }

    // 找出孤立的RAW文件（没有同名JPG/JPEG的）
    const orphanedRaws: { file_path: string; file_name: string }[] = []
    for (const rawFile of rawFiles) {
      const baseName = getFileNameWithoutExt(rawFile).toLowerCase()
      if (!jpegBaseNames.has(baseName)) {
        orphanedRaws.push({
          file_path: join(folderPath, rawFile),
          file_name: rawFile
        })
      }
    }

    return orphanedRaws
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
