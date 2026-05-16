import { rename as fsRename, copyFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import sharp from 'sharp'

interface RenameTemplate {
  date?: string
  time?: string
  camera?: string
  lens?: string
  iso?: number
  seq: number
  seqPad?: number
}

export function applyRenameTemplate(template: string, vars: RenameTemplate): string {
  let result = template
  result = result.replace(/\{date\}/g, vars.date || '')
  result = result.replace(/\{time\}/g, vars.time || '')
  result = result.replace(/\{camera\}/g, vars.camera || '')
  result = result.replace(/\{lens\}/g, vars.lens || '')
  result = result.replace(/\{iso\}/g, vars.iso?.toString() || '')
  result = result.replace(/\{seq:(\d+)\}/g, (_, pad) => {
    return vars.seq.toString().padStart(parseInt(pad), '0')
  })
  result = result.replace(/\{seq\}/g, vars.seq.toString())
  return result
}

export async function batchRename(
  photos: { id: number; file_path: string; shot_at?: string; camera_model?: string; lens_model?: string; iso?: number }[],
  template: string,
  startSeq: number = 1
): Promise<{ oldPath: string; newPath: string }[]> {
  const results: { oldPath: string; newPath: string }[] = []

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const ext = extname(photo.file_path)
    const shotDate = photo.shot_at ? new Date(photo.shot_at) : null
    const vars: RenameTemplate = {
      date: shotDate?.toISOString().split('T')[0].replace(/-/g, ''),
      time: shotDate?.toTimeString().split(' ')[0].replace(/:/g, ''),
      camera: photo.camera_model,
      lens: photo.lens_model,
      iso: photo.iso,
      seq: startSeq + i,
      seqPad: 3
    }

    const newName = applyRenameTemplate(template, vars) + ext
    const dir = photo.file_path.slice(0, photo.file_path.lastIndexOf('/'))
    const newPath = join(dir, newName)

    await fsRename(photo.file_path, newPath)
    results.push({ oldPath: photo.file_path, newPath })
  }

  return results
}

export interface ExportOptions {
  outputDir: string
  format: 'jpeg' | 'png' | 'webp' | 'tiff'
  quality: number
  maxWidth?: number
  maxHeight?: number
  keepExif: boolean
  onProgress?: (current: number, total: number) => void
}

export async function batchExport(
  photos: { file_path: string; file_name: string }[],
  options: ExportOptions
): Promise<void> {
  await mkdir(options.outputDir, { recursive: true })

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const baseName = photo.file_name.replace(/\.[^.]+$/, '')
    const outPath = join(options.outputDir, `${baseName}.${options.format}`)

    let pipeline = sharp(photo.file_path)

    if (options.maxWidth || options.maxHeight) {
      pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    switch (options.format) {
      case 'jpeg': pipeline = pipeline.jpeg({ quality: options.quality }); break
      case 'png': pipeline = pipeline.png(); break
      case 'webp': pipeline = pipeline.webp({ quality: options.quality }); break
      case 'tiff': pipeline = pipeline.tiff(); break
    }

    await pipeline.toFile(outPath)
    options.onProgress?.(i + 1, photos.length)
  }
}
