import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'
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
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
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

export async function scanSingleFile(filePath: string): Promise<PhotoInsertData | null> {
  try {
    const ext = extname(filePath).slice(1).toLowerCase()
    if (!isImage(ext)) return null

    const fileStat = await stat(filePath)
    const exif = await parseExif(filePath)

    return {
      file_path: filePath,
      file_name: filePath.split('/').pop()!,
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

export async function scanFolder(
  insertFn: (data: PhotoInsertData) => number,
  getExisting: (path: string) => unknown,
  options: ScanOptions
): Promise<number> {
  const files = await collectImageFiles(options.folderPath, options.recursive !== false)
  let count = 0

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    if (getExisting(filePath)) continue

    const data = await scanSingleFile(filePath)
    if (data) {
      insertFn(data)
      count++
    }

    options.onProgress?.(i + 1, files.length)
  }

  return count
}
