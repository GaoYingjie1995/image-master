import { ipcMain, shell } from 'electron'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../db/album-repo'
import { getSmartAlbumPhotos, validateRules } from '../services/smart-album'
import { mkdir, rename, access } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'

/**
 * 解决文件名冲突：如果目标路径已存在，自动追加 _1、_2 等后缀
 */
export async function resolveConflictPath(
  dir: string,
  fileName: string,
  options: { isReserved?: (targetPath: string) => boolean | Promise<boolean> } = {}
): Promise<{ path: string; name: string }> {
  const ext = extname(fileName)
  const baseName = fileName.slice(0, fileName.length - ext.length)
  let candidate = join(dir, fileName)
  let suffix = 0

  while (true) {
    if (await options.isReserved?.(candidate)) {
      suffix++
      const newName = `${baseName}_${suffix}${ext}`
      candidate = join(dir, newName)
      continue
    }

    try {
      await access(candidate)
      // 文件存在，追加后缀
      suffix++
      const newName = `${baseName}_${suffix}${ext}`
      candidate = join(dir, newName)
    } catch {
      // 文件不存在（ENOENT），可以使用此路径
      break
    }
  }

  return { path: candidate, name: basename(candidate) }
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

export function registerAlbumIpc(db: Database.Database) {
  const repo = createAlbumRepo(db)

  ipcMain.handle('albums:getAll', () => {
    return repo.getAll()
  })

  ipcMain.handle('albums:create', async (_event, name: string, parentPath: string) => {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null
    const folderPath = join(parentPath, name)
    await mkdir(folderPath, { recursive: true })
    return repo.create({ name, folder_path: folderPath, created_at: new Date().toISOString() })
  })

  ipcMain.handle('albums:delete', async (_event, id: number) => {
    const album = repo.getById(id)
    if (!album) return { success: false, error: 'Album not found' }

    try {
      await access(album.folder_path)
      await shell.trashItem(album.folder_path)
    } catch (error) {
      // 目录不存在时清理数据库记录；移入回收站失败时保留记录，避免磁盘和数据库分叉
      if (!isNotFoundError(error)) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to move album to trash' }
      }
    }
    repo.delete(id)
    return { success: true }
  })

  ipcMain.handle('albums:rename', async (_event, id: number, newName: string) => {
    // 与 albums:create 一致的名称验证
    if (!newName || newName.includes('..') || newName.includes('/') || newName.includes('\\')) return null
    const album = repo.getById(id)
    if (!album) return

    const parentDir = dirname(album.folder_path)
    const newPath = join(parentDir, newName)
    try {
      await access(newPath)
      return { error: 'Target album folder already exists' }
    } catch (error) {
      if (!isNotFoundError(error)) {
        return { error: error instanceof Error ? error.message : 'Cannot access target album folder' }
      }
    }
    await rename(album.folder_path, newPath)
    repo.rename(id, newName, newPath)
    return { success: true }
  })

  ipcMain.handle('albums:addPhoto', async (_event, albumId: number, photoId: number, photoPath: string) => {
    const album = repo.getById(albumId)
    if (!album) return

    // 验证 photoPath 是数据库中已知的照片
    const photo = db.prepare('SELECT 1 FROM photos WHERE file_path = ? AND id = ?').get(photoPath, photoId)
    if (!photo) return

    const fileName = basename(photoPath)
    const resolved = await resolveConflictPath(album.folder_path, fileName, {
      isReserved: (targetPath) => {
        const existing = db.prepare('SELECT 1 FROM photos WHERE file_path = ? AND id <> ?').get(targetPath, photoId)
        return !!existing
      }
    })
    await rename(photoPath, resolved.path)
    // 移动文件后同步更新照片路径
    try {
      db.prepare('UPDATE photos SET file_path = ?, file_name = ? WHERE id = ?').run(resolved.path, resolved.name, photoId)
      repo.addPhoto(albumId, photoId)
    } catch (error) {
      try {
        await rename(resolved.path, photoPath)
      } catch { /* 保留原始数据库错误 */ }
      throw error
    }
    // 自动设置相册封面（第一张照片）
    const albumRow = repo.getById(albumId)
    if (albumRow && !albumRow.cover_photo_id) {
      repo.setCover(albumId, photoId)
    }
  })

  ipcMain.handle('albums:addPhotos', async (_event, albumId: number, photoIds: number[]) => {
    const album = repo.getById(albumId)
    if (!album) return { success: 0, failed: 0, errors: [] }

    const succeeded: number[] = []
    const errors: string[] = []

    for (const photoId of photoIds) {
      const photo = db.prepare('SELECT id, file_path, file_name FROM photos WHERE id = ?').get(photoId) as { id: number; file_path: string; file_name: string } | undefined
      if (!photo) {
        errors.push(`ID ${photoId}: 照片不存在`)
        continue
      }

      try {
        const resolved = await resolveConflictPath(album.folder_path, photo.file_name, {
          isReserved: (targetPath) => {
            const existing = db.prepare('SELECT 1 FROM photos WHERE file_path = ? AND id <> ?').get(targetPath, photoId)
            return !!existing
          }
        })
        await rename(photo.file_path, resolved.path)
        try {
          db.prepare('UPDATE photos SET file_path = ?, file_name = ? WHERE id = ?').run(resolved.path, resolved.name, photoId)
          repo.addPhoto(albumId, photoId)
        } catch (error) {
          try {
            await rename(resolved.path, photo.file_path)
          } catch { /* 保留原始数据库错误 */ }
          throw error
        }
        // 自动设置相册封面（第一张照片）
        const albumRow = repo.getById(albumId)
        if (albumRow && !albumRow.cover_photo_id) {
          repo.setCover(albumId, photoId)
        }
        succeeded.push(photoId)
      } catch (e) {
        errors.push(`${photo.file_name}: ${e instanceof Error ? e.message : '移动失败'}`)
      }
    }

    return { success: succeeded.length, failed: errors.length, errors }
  })

  ipcMain.handle('albums:removePhoto', (_event, albumId: number, photoId: number) => {
    repo.removePhoto(albumId, photoId)
    return { success: true }
  })

  ipcMain.handle('albums:getPhotoCount', (_event, albumId: number) => {
    const row = db.prepare('SELECT COUNT(*) as count FROM album_photos WHERE album_id = ?').get(albumId) as { count: number }
    return row.count
  })

  ipcMain.handle('albums:getAllPhotoCounts', () => {
    const rows = db.prepare('SELECT album_id, COUNT(*) as count FROM album_photos GROUP BY album_id').all() as { album_id: number; count: number }[]
    const map: Record<number, number> = {}
    for (const row of rows) {
      map[row.album_id] = row.count
    }
    return map
  })

  ipcMain.handle('albums:getPhotos', (_event, albumId: number) => {
    return repo.getPhotos(albumId)
  })

  ipcMain.handle('smartAlbums:create', (_event, name: string, rules: string) => {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return { error: 'Invalid album name' }
    }
    const validation = validateRules(rules)
    if (!validation.valid) {
      return { error: validation.error }
    }
    const result = db.prepare('INSERT INTO smart_albums (name, rules) VALUES (?, ?)').run(name, rules)
    return { id: Number(result.lastInsertRowid) }
  })

  ipcMain.handle('smartAlbums:getAll', () => {
    return db.prepare('SELECT * FROM smart_albums ORDER BY id DESC').all()
  })

  ipcMain.handle('smartAlbums:delete', (_event, id: number) => {
    db.prepare('DELETE FROM smart_albums WHERE id = ?').run(id)
  })

  ipcMain.handle('smartAlbums:rename', (_event, id: number, name: string) => {
    db.prepare('UPDATE smart_albums SET name = ? WHERE id = ?').run(name, id)
  })

  ipcMain.handle('smartAlbums:update', (_event, id: number, name: string, rules: string) => {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return { error: 'Invalid album name' }
    }
    const validation = validateRules(rules)
    if (!validation.valid) {
      return { error: validation.error }
    }
    db.prepare('UPDATE smart_albums SET name = ?, rules = ? WHERE id = ?').run(name, rules, id)
    return { success: true }
  })

  ipcMain.handle('smartAlbums:getPhotos', (_event, albumId: number) => {
    return getSmartAlbumPhotos(db, albumId)
  })
}
