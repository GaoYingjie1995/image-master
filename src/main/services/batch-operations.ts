import { rename as fsRename, copyFile, mkdir, access } from 'fs/promises'
import { join, extname, dirname, resolve, relative, isAbsolute } from 'path'
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
  // 移除路径分隔符，防止路径遍历
  result = result.replace(/[/\\]/g, '_')
  return result
}

export async function batchRename(
  photos: { id: number; file_path: string; shot_at?: string | null; camera_model?: string | null; lens_model?: string | null; iso?: number | null }[],
  template: string,
  startSeq: number = 1,
  options: {
    isTargetReserved?: (targetPath: string, sourceId: number) => boolean | Promise<boolean>
  } = {}
): Promise<{ id: number; oldPath: string; newPath: string }[]> {
  const results: { id: number; oldPath: string; newPath: string }[] = []
  const completed: { oldPath: string; newPath: string }[] = []

  try {
    // 第一轮：生成所有目标路径并预检
    const plannedPaths: { photo: typeof photos[0]; newPath: string; dir: string }[] = []
    const targetSet = new Set<string>()

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const ext = extname(photo.file_path)
      const shotDate = photo.shot_at ? new Date(photo.shot_at) : null
      const vars: RenameTemplate = {
        date: shotDate?.toISOString().split('T')[0].replace(/-/g, ''),
        time: shotDate?.toTimeString().split(' ')[0].replace(/:/g, ''),
        camera: photo.camera_model ?? undefined,
        lens: photo.lens_model ?? undefined,
        iso: photo.iso ?? undefined,
        seq: startSeq + i,
        seqPad: 3
      }

      const newName = applyRenameTemplate(template, vars) + ext
      const dir = dirname(photo.file_path)
      const newPath = join(dir, newName)

      // 防止路径遍历：确保新路径在原目录内（跨平台兼容）
      const resolvedNew = resolve(newPath)
      const resolvedDir = resolve(dir)
      const rel = relative(resolvedDir, resolvedNew)
      if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error(`Invalid rename path: ${newPath}`)
      }

      // 检测批次内重复目标路径
      const normalizedNew = resolve(newPath)
      if (targetSet.has(normalizedNew)) {
        throw new Error(`Duplicate target path in batch: ${newPath}`)
      }
      targetSet.add(normalizedNew)

      // 空文件名校验（模板生成空名称时只剩扩展名）
      const baseName = newName.replace(ext, '')
      if (!baseName || baseName.trim() === '') {
        throw new Error(`Empty filename generated for photo ${photo.id}`)
      }

      plannedPaths.push({ photo, newPath, dir })
    }

    // 第二轮：检查目标文件是否已存在并执行重命名
    for (const { photo, newPath } of plannedPaths) {
      // 检查目标路径是否已存在（源文件本身除外）
      const resolvedOld = resolve(photo.file_path)
      const resolvedNew = resolve(newPath)
      if (resolvedOld !== resolvedNew) {
        if (await options.isTargetReserved?.(newPath, photo.id)) {
          throw new Error(`Target path is already reserved: ${newPath}`)
        }

        try {
          await access(newPath)
          throw new Error(`Target file already exists: ${newPath}`)
        } catch (err: unknown) {
          // access 抛出 ENOENT 表示文件不存在，这是期望的情况
          if (err instanceof Error && err.message.startsWith('Target file already exists')) {
            throw err
          }
          // ENOENT = 文件不存在，可以继续
        }
      }

      await fsRename(photo.file_path, newPath)
      completed.push({ oldPath: photo.file_path, newPath })
      results.push({ id: photo.id, oldPath: photo.file_path, newPath })
    }
  } catch (err) {
    // 补偿事务：逆序回滚已重命名的文件
    for (let i = completed.length - 1; i >= 0; i--) {
      try {
        await fsRename(completed[i].newPath, completed[i].oldPath)
      } catch { /* 回滚失败时尽力而为 */ }
    }
    throw err
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
    let outPath = join(options.outputDir, `${baseName}.${options.format}`)

    // 处理文件名冲突：追加序号
    let suffix = 0
    while (true) {
      try {
        await access(outPath)
        suffix++
        outPath = join(options.outputDir, `${baseName}_${suffix}.${options.format}`)
      } catch {
        break // 文件不存在，可以使用此路径
      }
    }

    let pipeline = sharp(photo.file_path)

    if (options.maxWidth || options.maxHeight) {
      pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    // keepExif 为 true 时保留元数据，为 false 时 sharp 默认去除
    if (options.keepExif) {
      pipeline = pipeline.keepMetadata()
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
