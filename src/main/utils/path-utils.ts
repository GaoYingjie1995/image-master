import { basename, extname, dirname, join, resolve, relative, isAbsolute } from 'path'

export function getFileNameWithoutExt(filePath: string): string {
  const name = basename(filePath)
  const ext = extname(name)
  return ext ? name.slice(0, -ext.length) : name
}

export function getJpegPairForRaw(rawPath: string): string[] {
  const base = getFileNameWithoutExt(rawPath)
  const dir = dirname(rawPath)
  return [join(dir, base + '.jpg'), join(dir, base + '.jpeg')]
}

export function isPathInsideOrEqual(parentPath: string, candidatePath: string): boolean {
  const parent = resolve(parentPath)
  const candidate = resolve(candidatePath)
  if (parent === candidate) return true

  const rel = relative(parent, candidate)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}
