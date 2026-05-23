import { ipcMain, dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { createImportSourceRepo } from '../db/import-source-repo'
import { createPhotoRepo } from '../db/photo-repo'
import { createAlbumRepo } from '../db/album-repo'
import { scanFolder, collectFolderStructure } from '../services/scanner'

export function registerImportSourceIpc(db: Database.Database) {
  const sourceRepo = createImportSourceRepo(db)
  const photoRepo = createPhotoRepo(db)
  const albumRepo = createAlbumRepo(db)

  ipcMain.handle('importSources:getAll', () => {
    return sourceRepo.getAllWithStats()
  })

  ipcMain.handle('importSources:getAlbumTree', (_event, sourceId: number) => {
    return sourceRepo.getAlbumTreeBySourceId(sourceId)
  })

  ipcMain.handle('importSources:add', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    if (process.platform === 'darwin') {
      win.focus()
    }

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })

    if (result.canceled || !result.filePaths[0]) return null

    const folderPath = result.filePaths[0]

    // 检查是否已导入
    const existing = sourceRepo.getByFolderPath(folderPath)
    if (existing) {
      return { folderPath, count: 0, alreadyImported: true }
    }

    // 创建 import_source 记录
    const sourceId = sourceRepo.create({
      folder_path: folderPath,
      imported_at: new Date().toISOString()
    })

    const scanResult = await scanFolder(
      (data) => photoRepo.insert(data),
      (path) => photoRepo.getByFilePath(path),
      {
        folderPath,
        onProgress: (current, total) => {
          win.webContents.send('photos:scanProgress', { current, total })
        }
      }
    )

    // 根据目录结构自动创建相册树
    const albumIdMap = new Map<string, number>()
    for (const folder of scanResult.folders) {
      const existingAlbum = albumRepo.getByFolderPath(folder.path)
      if (existingAlbum) {
        // 已存在的相册也需要更新 parent_id 和 import_source_id
        const parentId = folder.parentPath ? albumIdMap.get(folder.parentPath) ?? null : null
        db.prepare('UPDATE albums SET parent_id = ?, import_source_id = ? WHERE id = ?').run(parentId, sourceId, existingAlbum.id)
        albumIdMap.set(folder.path, existingAlbum.id)
        continue
      }

      const parentId = folder.parentPath ? albumIdMap.get(folder.parentPath) ?? null : null
      const albumId = albumRepo.create({
        name: folder.name,
        folder_path: folder.path,
        parent_id: parentId,
        created_at: new Date().toISOString()
      })
      db.prepare('UPDATE albums SET import_source_id = ? WHERE id = ?').run(sourceId, albumId)
      albumIdMap.set(folder.path, albumId)

      const firstPhoto = db.prepare('SELECT id FROM photos WHERE parent_folder = ? LIMIT 1').get(folder.path) as { id: number } | undefined
      if (firstPhoto) {
        albumRepo.setCover(albumId, firstPhoto.id)
      }
    }

    return { folderPath, count: scanResult.count }
  })

  ipcMain.handle('importSources:remove', (_event, id: number) => {
    const source = sourceRepo.getById(id)
    if (!source) return { success: false }

    const transaction = db.transaction(() => {
      const photoIds = sourceRepo.getPhotoIdsBySourceId(id)
      const albumIds = sourceRepo.getAlbumIdsBySourceId(id)

      const deletePhoto = db.prepare('DELETE FROM photos WHERE id = ?')
      for (const pid of photoIds) {
        deletePhoto.run(pid)
      }

      db.prepare('DELETE FROM albums WHERE import_source_id = ?').run(id)
      sourceRepo.delete(id)

      return { photoCount: photoIds.length, albumCount: albumIds.length }
    })

    const result = transaction()
    return { success: true, ...result }
  })

  // 移除子文件夹（记录到 removed 表，删除照片和相册）
  ipcMain.handle('importSources:removeSubfolder', (_event, sourceId: number, folderPath: string) => {
    const source = sourceRepo.getById(sourceId)
    if (!source) return { success: false }

    const result = sourceRepo.removeSubfolder(sourceId, folderPath)
    return { success: true, ...result }
  })

  // 刷新：扫描文件系统，返回当前已导入的子目录和被移除的子目录
  ipcMain.handle('importSources:refresh', async (_event, sourceId: number) => {
    const source = sourceRepo.getById(sourceId)
    if (!source) return { imported: [], removed: [] }

    // 获取文件系统上的子目录
    const folders = await collectFolderStructure(source.folder_path)
    const sourcePath = source.folder_path

    // 筛选出直接子目录（parentPath === sourcePath）
    const subFolders = folders.filter(f => f.parentPath === sourcePath)
    const subFolderPaths = new Set(subFolders.map(f => f.path))

    // 获取当前已导入的子目录（所有属于该 source 的相册中，路径是 source 直接子目录的）
    const allAlbums = db.prepare(`
      SELECT id, name, folder_path FROM albums
      WHERE import_source_id = ?
      ORDER BY folder_path
    `).all(sourceId) as { id: number; name: string; folder_path: string }[]
    const importedAlbums = allAlbums.filter(a => subFolderPaths.has(a.folder_path))

    // 获取被移除的子目录
    const removedFolders = sourceRepo.getRemovedFolders(sourceId)
    const removedPaths = new Set(removedFolders.map(r => r.folder_path))

    // 标记哪些子目录是新发现的（在文件系统上存在，但既没导入也没被移除）
    const importedPaths = new Set(importedAlbums.map(a => a.folder_path))
    const newFolders = subFolders
      .filter(f => !importedPaths.has(f.path) && !removedPaths.has(f.path))
      .map(f => ({ path: f.path, name: f.name }))

    return {
      imported: importedAlbums,
      removed: removedFolders.map(r => ({ path: r.folder_path, removed_at: r.removed_at })),
      new: newFolders
    }
  })

  // 重新导入被移除的子文件夹
  ipcMain.handle('importSources:reimportSubfolder', async (event, sourceId: number, folderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const source = sourceRepo.getById(sourceId)
    if (!source || !win) return null

    // 从 removed 表中移除
    sourceRepo.reimportSubfolder(sourceId, folderPath)

    // 扫描并导入
    const scanResult = await scanFolder(
      (data) => photoRepo.insert(data),
      (path) => photoRepo.getByFilePath(path),
      {
        folderPath,
        onProgress: (current, total) => {
          win.webContents.send('photos:scanProgress', { current, total })
        }
      }
    )

    // 创建相册
    const albumIdMap = new Map<string, number>()
    for (const folder of scanResult.folders) {
      const existingAlbum = albumRepo.getByFolderPath(folder.path)
      if (existingAlbum) {
        const parentId = folder.parentPath ? albumIdMap.get(folder.parentPath) ?? null : null
        db.prepare('UPDATE albums SET parent_id = ?, import_source_id = ? WHERE id = ?').run(parentId, sourceId, existingAlbum.id)
        albumIdMap.set(folder.path, existingAlbum.id)
        continue
      }

      const parentId = folder.parentPath ? albumIdMap.get(folder.parentPath) ?? null : null
      const albumId = albumRepo.create({
        name: folder.name,
        folder_path: folder.path,
        parent_id: parentId,
        created_at: new Date().toISOString()
      })
      db.prepare('UPDATE albums SET import_source_id = ? WHERE id = ?').run(sourceId, albumId)
      albumIdMap.set(folder.path, albumId)

      const firstPhoto = db.prepare('SELECT id FROM photos WHERE parent_folder = ? LIMIT 1').get(folder.path) as { id: number } | undefined
      if (firstPhoto) {
        albumRepo.setCover(albumId, firstPhoto.id)
      }
    }

    return { folderPath, count: scanResult.count }
  })
}
