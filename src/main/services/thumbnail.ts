import sharp from 'sharp'
import { join } from 'path'
import { mkdir, access, readdir, stat, unlink } from 'fs/promises'
import { createHash } from 'crypto'

const THUMB_SIZE = 300
const THUMB_QUALITY = 80

let thumbnailDir: string | null = null

export function setThumbnailDir(dir: string): void {
  thumbnailDir = dir
}

export function getThumbnailDir(): string {
  return thumbnailDir || join(process.cwd(), 'thumbnails')
}

export async function ensureThumbnailDir(): Promise<string> {
  const dir = getThumbnailDir()
  await mkdir(dir, { recursive: true })
  return dir
}

export async function getThumbnailPath(photoId: number): Promise<string> {
  const dir = await ensureThumbnailDir()
  return join(dir, `${photoId}.webp`)
}

function hashFilePath(filePath: string): string {
  return createHash('sha1').update(filePath).digest('hex').slice(0, 12)
}

export async function getThumbnailPathForPhoto(photoId: number, filePath: string): Promise<string> {
  const dir = await ensureThumbnailDir()
  const fileKey = hashFilePath(filePath)
  return join(dir, `${photoId}-${fileKey}.webp`)
}

export async function generateThumbnail(filePath: string, outputPath: string): Promise<void> {
  await sharp(filePath)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toFile(outputPath)
}

export async function thumbnailExists(photoId: number): Promise<boolean> {
  try {
    await access(await getThumbnailPath(photoId))
    return true
  } catch {
    return false
  }
}

export async function getCacheSize(): Promise<{ fileCount: number; totalSize: number }> {
  const dir = getThumbnailDir()
  try {
    const files = await readdir(dir)
    let totalSize = 0
    for (const file of files) {
      if (file.endsWith('.webp')) {
        try {
          const s = await stat(join(dir, file))
          totalSize += s.size
        } catch { /* ignore */ }
      }
    }
    return { fileCount: files.filter(f => f.endsWith('.webp')).length, totalSize }
  } catch {
    return { fileCount: 0, totalSize: 0 }
  }
}

export async function clearCache(): Promise<number> {
  const dir = getThumbnailDir()
  try {
    const files = await readdir(dir)
    let count = 0
    for (const file of files) {
      if (file.endsWith('.webp')) {
        try {
          await unlink(join(dir, file))
          count++
        } catch { /* ignore */ }
      }
    }
    return count
  } catch {
    return 0
  }
}
