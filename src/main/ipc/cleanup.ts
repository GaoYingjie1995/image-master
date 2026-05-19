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
    if (ids.length === 0) {
      console.warn('[cleanup:deleteFiles] 未找到匹配的数据库记录，请求路径:', validPaths)
      return { success: 0, failed: validPaths.length, errors: validPaths.map(p => `${p}: 数据库中未找到对应记录`) }
    }
    return deletePhotos(db, ids)
  })

  ipcMain.handle('cleanup:findOrphanedRaws', async (_event, folderPath: string) => {
    // 直接遍历文件夹中的文件
    const { readdir } = require('fs/promises')
    const { join, extname } = require('path')

    console.log('[cleanup:findOrphanedRaws] folderPath:', folderPath)

    const files = await readdir(folderPath)
    console.log('[cleanup:findOrphanedRaws] total files in folder:', files.length)
    console.log('[cleanup:findOrphanedRaws] sample files:', files.slice(0, 5))

    const imageFiles = files.filter(file => {
      const ext = extname(file).slice(1).toLowerCase()
      const isImg = isImage(ext)
      return isImg
    })

    console.log('[cleanup:findOrphanedRaws] image files:', imageFiles.length)

    // 列出非图片文件
    const nonImageFiles = files.filter(file => {
      const ext = extname(file).slice(1).toLowerCase()
      return !isImage(ext)
    })
    console.log('[cleanup:findOrphanedRaws] non-image files:', nonImageFiles)

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

    console.log('[cleanup:findOrphanedRaws] raw files:', rawFiles.length)
    console.log('[cleanup:findOrphanedRaws] jpeg baseNames:', jpegBaseNames.size)
    console.log('[cleanup:findOrphanedRaws] sample raw files:', rawFiles.slice(0, 3))
    console.log('[cleanup:findOrphanedRaws] sample jpeg baseNames:', Array.from(jpegBaseNames).slice(0, 3))

    // 列出所有包含 0183 的文件，并检查是否真的存在
    const files0183 = imageFiles.filter(f => f.includes('0183'))
    console.log('[cleanup:findOrphanedRaws] files containing 0183:', files0183)

    // 检查每个文件是否真的存在
    const { existsSync } = require('fs')
    for (const file of files0183) {
      const fullPath = join(folderPath, file)
      const exists = existsSync(fullPath)
      console.log(`[cleanup:findOrphanedRaws] File ${file} exists: ${exists}`)
    }

    // 列出所有 JPG/JPEG 文件
    const allJpgFiles = imageFiles.filter(f => {
      const ext = extname(f).slice(1).toLowerCase()
      return ext === 'jpg' || ext === 'jpeg'
    })
    console.log('[cleanup:findOrphanedRaws] all JPG/JPEG files:', allJpgFiles.length)
    console.log('[cleanup:findOrphanedRaws] sample JPG/JPEG files:', allJpgFiles.slice(0, 10))

    // 找出孤立的RAW文件（没有同名JPG/JPEG的）
    const orphanedRaws: { file_path: string; file_name: string }[] = []
    for (const rawFile of rawFiles) {
      const baseName = getFileNameWithoutExt(rawFile).toLowerCase()
      const hasJpeg = jpegBaseNames.has(baseName)

      // 详细日志：检查 DSCF0183 的匹配情况
      if (rawFile.includes('DSCF0183')) {
        console.log(`[cleanup:findOrphanedRaws] Checking ${rawFile}:`)
        console.log(`  baseName: ${baseName}`)
        console.log(`  hasJpeg: ${hasJpeg}`)
        console.log(`  jpegBaseNames contains: ${jpegBaseNames.has(baseName)}`)
        console.log(`  All jpeg baseNames:`, Array.from(jpegBaseNames).filter(b => b.includes('0183')))
      }

      if (!hasJpeg) {
        orphanedRaws.push({
          file_path: join(folderPath, rawFile),
          file_name: rawFile
        })
      }
    }

    console.log('[cleanup:findOrphanedRaws] orphaned RAW files:', orphanedRaws.length)
    if (orphanedRaws.length > 0) {
      console.log('[cleanup:findOrphanedRaws] sample orphaned RAW:', orphanedRaws.slice(0, 3))
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
