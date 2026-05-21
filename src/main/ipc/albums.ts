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

  ipcMain.handle('albums:getTree', () => {
    return repo.getTree()
  })

  ipcMain.handle('albums:create', async (_event, name: string, parentPath: string, parentId?: number | null) => {
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null
    const folderPath = join(parentPath, name)
    await mkdir(folderPath, { recursive: true })
    return repo.create({
      name,
      folder_path: folderPath,
      parent_id: parentId ?? null,
      created_at: new Date().toISOString()
    })
  })

  ipcMain.handle('albums:delete', async (_event, id: number) => {
    const album = repo.getById(id)
    if (!album) return { success: false, error: 'Album not found' }

    try {
      await access(album.folder_path)
      await shell.trashItem(album.folder_path)
    } catch (error) {
      if (!isNotFoundError(error)) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to move album to trash' }
      }
    }
    repo.delete(id)
    return { success: true }
  })

  ipcMain.handle('albums:rename', async (_event, id: number, newName: string) => {
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
    // 级联更新子相册路径
    repo.updateFolderPaths(album.folder_path, newPath)
    // 级联更新照片路径
    db.prepare('UPDATE photos SET parent_folder = REPLACE(parent_folder, ?, ?) WHERE parent_folder LIKE ?')
      .run(album.folder_path, newPath, album.folder_path + '%')
    db.prepare('UPDATE photos SET file_path = REPLACE(file_path, ?, ?), file_name = file_name WHERE file_path LIKE ?')
      .run(album.folder_path, newPath, album.folder_path + '%')
    return { success: true }
  })

  ipcMain.handle('albums:setCollapsed', (_event, id: number, collapsed: boolean) => {
    repo.setCollapsed(id, collapsed)
    return { success: true }
  })

  ipcMain.handle('albums:setCover', (_event, albumId: number, photoId: number) => {
    repo.setCover(albumId, photoId)
    return { success: true }
  })

  ipcMain.handle('albums:getPhotoCount', (_event, albumId: number) => {
    const album = repo.getById(albumId)
    if (!album) return 0
    return repo.getPhotoCountByPath(album.folder_path)
  })

  ipcMain.handle('albums:getAllPhotoCounts', () => {
    const albums = repo.getAll()
    const map: Record<number, number> = {}
    for (const album of albums) {
      map[album.id] = repo.getPhotoCountByPath(album.folder_path)
    }
    return map
  })

  // Smart Albums
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
