import { shell } from 'electron'
import Database from 'better-sqlite3'
import { createPhotoRepo } from '../db/photo-repo'
import { createSettingsRepo } from '../db/settings-repo'
import { getThumbnailDir } from './thumbnail'
import { getFileNameWithoutExt } from '../utils/path-utils'
import { dirname, join } from 'path'
import { unlink } from 'fs/promises'

const RAW_EXTENSIONS = ['cr2', 'cr3', 'nef', 'arw', 'orf', 'raf', 'dng', 'pef', 'srw', 'rw2']

export interface DeleteResult {
  success: number
  failed: number
  errors: string[]
}

/**
 * 统一的照片删除服务：删除文件 → 关联 RAW → 清理缩略图 → 删除 DB 记录
 * 被 photos:batchDelete 和 cleanup:deleteFiles 共同复用
 */
export async function deletePhotos(db: Database.Database, ids: number[]): Promise<DeleteResult> {
  const repo = createPhotoRepo(db)
  const settingsRepo = createSettingsRepo(db)
  const deleteLinkedRaw = settingsRepo.get('deleteLinkedRaw') === true

  const photos = ids.map(id => repo.getById(id)).filter((p): p is NonNullable<typeof p> => p !== undefined)
  const succeededIds: number[] = []
  const errors: string[] = []

  for (const photo of photos) {
    try {
      await shell.trashItem(photo.file_path)
      succeededIds.push(photo.id)

      // 关联删除 RAW 文件
      if (deleteLinkedRaw && photo.format !== 'raw') {
        const baseName = getFileNameWithoutExt(photo.file_path)
        const dir = dirname(photo.file_path)
        for (const ext of RAW_EXTENSIONS) {
          const rawPath = join(dir, baseName + '.' + ext)
          const rawPhoto = db.prepare('SELECT id, file_path FROM photos WHERE file_path = ?').get(rawPath) as { id: number; file_path: string } | undefined
          if (rawPhoto) {
            try {
              await shell.trashItem(rawPhoto.file_path)
              succeededIds.push(rawPhoto.id)
            } catch { /* RAW 删除失败不阻塞主流程 */ }
          }
        }
      }
    } catch (e) {
      errors.push(`${photo.file_name}: ${e instanceof Error ? e.message : '删除失败'}`)
    }
  }

  // 清理缩略图文件
  const thumbDir = getThumbnailDir()
  for (const id of succeededIds) {
    try {
      await unlink(join(thumbDir, `${id}.webp`))
    } catch { /* 缩略图不存在则忽略 */ }
  }

  // 只删除成功移入回收站的数据库记录
  if (succeededIds.length > 0) {
    repo.batchDelete(succeededIds)
  }

  return { success: succeededIds.length, failed: errors.length, errors }
}

/**
 * 通过文件路径查找照片 ID，用于 cleanup:deleteFiles 按路径删除的场景
 */
export function findPhotoIdsByPaths(db: Database.Database, filePaths: string[]): number[] {
  const ids: number[] = []
  for (const p of filePaths) {
    const row = db.prepare('SELECT id FROM photos WHERE file_path = ?').get(p) as { id: number } | undefined
    if (row) ids.push(row.id)
  }
  return ids
}
