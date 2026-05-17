import sharp from 'sharp'
import exifr from 'exifr'
import { basename, join } from 'path'
import { mkdir, access, readdir, stat, unlink, mkdtemp, readFile, rm } from 'fs/promises'
import { createHash } from 'crypto'
import { tmpdir } from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'

const THUMB_SIZE = 300
const THUMB_QUALITY = 80
const PREVIEW_SIZE = 2400
const PREVIEW_QUALITY = 88
const execFileAsync = promisify(execFile)

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

export async function getPreviewPathForPhoto(photoId: number, filePath: string): Promise<string> {
  const dir = await ensureThumbnailDir()
  const fileKey = hashFilePath(filePath)
  return join(dir, `${photoId}-${fileKey}-preview.jpg`)
}

async function getEmbeddedPreviewBuffer(filePath: string): Promise<Buffer | null> {
  try {
    const embedded = await exifr.thumbnail(filePath)
    if (!embedded) return null
    if (Buffer.isBuffer(embedded)) return embedded
    if (embedded instanceof Uint8Array) return Buffer.from(embedded)
    if (Object.prototype.toString.call(embedded) === '[object ArrayBuffer]') {
      return Buffer.from(new Uint8Array(embedded as ArrayBuffer))
    }
    return null
  } catch {
    return null
  }
}

async function getQuickLookPreviewBuffer(filePath: string, size: number): Promise<Buffer | null> {
  if (process.platform !== 'darwin') return null
  const outDir = await mkdtemp(join(tmpdir(), 'image-master-ql-'))
  try {
    await execFileAsync('/usr/bin/qlmanage', ['-t', '-s', String(size), '-o', outDir, filePath], { timeout: 20000 })
    const files = await readdir(outDir)
    const base = basename(filePath)
    const candidate = files.find(name =>
      name.startsWith(base) && (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))
    )
    if (!candidate) return null
    return await readFile(join(outDir, candidate))
  } catch {
    return null
  } finally {
    try {
      await rm(outDir, { recursive: true, force: true })
    } catch { /* ignore */ }
  }
}

async function createPlaceholder(outputPath: string, size: number): Promise<void> {
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 30, g: 30, b: 30 }
    }
  })

  if (outputPath.endsWith('.webp')) {
    await image.webp({ quality: THUMB_QUALITY }).toFile(outputPath)
  } else {
    await image.jpeg({ quality: PREVIEW_QUALITY }).toFile(outputPath)
  }
}

export async function generateThumbnail(filePath: string, outputPath: string): Promise<void> {
  try {
    await sharp(filePath)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toFile(outputPath)
  } catch {
    const previewBuffer = (await getEmbeddedPreviewBuffer(filePath)) || (await getQuickLookPreviewBuffer(filePath, THUMB_SIZE))
    if (previewBuffer) {
      await sharp(previewBuffer)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(outputPath)
      return
    }
    await createPlaceholder(outputPath, THUMB_SIZE)
  }
}

export async function generatePreview(filePath: string, outputPath: string): Promise<void> {
  try {
    await sharp(filePath)
      .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: PREVIEW_QUALITY })
      .toFile(outputPath)
  } catch {
    const previewBuffer = (await getEmbeddedPreviewBuffer(filePath)) || (await getQuickLookPreviewBuffer(filePath, PREVIEW_SIZE))
    if (previewBuffer) {
      await sharp(previewBuffer)
        .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: PREVIEW_QUALITY })
        .toFile(outputPath)
      return
    }
    await createPlaceholder(outputPath, Math.min(PREVIEW_SIZE, 1600))
  }
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
      if (file.endsWith('.webp') || file.endsWith('.jpg')) {
        try {
          const s = await stat(join(dir, file))
          totalSize += s.size
        } catch { /* ignore */ }
      }
    }
    return { fileCount: files.filter(f => f.endsWith('.webp') || f.endsWith('.jpg')).length, totalSize }
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
      if (file.endsWith('.webp') || file.endsWith('.jpg')) {
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
