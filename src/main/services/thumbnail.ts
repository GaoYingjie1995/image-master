import sharp from 'sharp'
import { join } from 'path'
import { mkdir, access } from 'fs/promises'

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
