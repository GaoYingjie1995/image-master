import { basename, extname, join } from 'path'

export function getFileNameWithoutExt(filePath: string): string {
  const name = basename(filePath)
  const ext = extname(name)
  return name.slice(0, -ext.length)
}

export function getJpegPairForRaw(rawPath: string): string[] {
  const base = getFileNameWithoutExt(rawPath)
  const dir = rawPath.slice(0, rawPath.lastIndexOf('/'))
  return [join(dir, base + '.jpg'), join(dir, base + '.jpeg')]
}
