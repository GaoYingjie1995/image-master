import { readdir, stat } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import { isImage, getFormat } from '../utils/file-types'
import { parseExif } from './exif-parser'

interface ScanOptions {
  folderPath: string
  recursive?: boolean
  onProgress?: (current: number, total: number) => void
}

interface PhotoInsertData {
  file_path: string
  file_name: string
  file_size: number
  format: string
  parent_folder?: string
  created_at: string
  modified_at: string
  shot_at?: string
  camera_model?: string
  lens_model?: string
  iso?: number
  aperture?: number
  shutter_speed?: string
  width?: number
  height?: number
  gps_lat?: number
  gps_lng?: number
}

export async function collectImageFiles(dir: string, recursive: boolean = true): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return [] // 目录不存在或无权限，跳过
  }
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    // 跳过符号链接防止循环
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory() && recursive) {
      files.push(...await collectImageFiles(fullPath, true))
    } else if (entry.isFile()) {
      const ext = extname(entry.name).slice(1).toLowerCase()
      if (isImage(ext)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

export interface FolderInfo {
  path: string
  name: string
  parentPath: string | null
  imageCount: number
}

export async function collectFolderStructure(dir: string): Promise<FolderInfo[]> {
  const folders: FolderInfo[] = []

  async function walk(currentDir: string, parentPath: string | null): Promise<void> {
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    let imageCount = 0
    const subdirs: string[] = []

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      if (entry.isFile()) {
        const ext = extname(entry.name).slice(1).toLowerCase()
        if (isImage(ext)) imageCount++
      } else if (entry.isDirectory()) {
        subdirs.push(join(currentDir, entry.name))
      }
    }

    // Only record folders that contain images or subdirectories
    if (imageCount > 0 || subdirs.length > 0) {
      folders.push({
        path: currentDir,
        name: basename(currentDir),
        parentPath,
        imageCount
      })
    }

    for (const subdir of subdirs) {
      await walk(subdir, currentDir)
    }
  }

  await walk(dir, null)
  return folders
}

export async function scanSingleFile(filePath: string): Promise<PhotoInsertData | null> {
  try {
    const ext = extname(filePath).slice(1).toLowerCase()
    if (!isImage(ext)) return null

    const fileStat = await stat(filePath)
    const exif = await parseExif(filePath)

    return {
      file_path: filePath,
      file_name: basename(filePath),
      file_size: fileStat.size,
      format: getFormat(ext),
      created_at: fileStat.birthtime.toISOString(),
      modified_at: fileStat.mtime.toISOString(),
      ...exif
    }
  } catch {
    return null
  }
}

export interface ScanResult {
  count: number
  folders: FolderInfo[]
}

export async function scanFolder(
  insertFn: (data: PhotoInsertData) => number,
  getExisting: (path: string) => unknown,
  options: ScanOptions
): Promise<ScanResult> {
  const folders = await collectFolderStructure(options.folderPath)
  const files = await collectImageFiles(options.folderPath, options.recursive !== false)
  let count = 0

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    if (getExisting(filePath)) continue

    const data = await scanSingleFile(filePath)
    if (data) {
      data.parent_folder = dirname(filePath)
      insertFn(data)
      count++
    }

    options.onProgress?.(i + 1, files.length)
  }

  return { count, folders }
}
