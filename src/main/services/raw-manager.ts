import { getFileNameWithoutExt } from '../utils/path-utils'

export interface RawPair {
  raw: { id: number; file_path: string; file_name: string }
  jpeg: { id: number; file_path: string; file_name: string } | null
}

interface RawManagerDeps {
  getRawsInFolder: (folderPath: string) => { id: number; file_path: string; file_name: string }[]
  findJpegByName: (baseName: string, folderPath: string) => { id: number; file_path: string; file_name: string } | null
}

export function findRawPairs(deps: RawManagerDeps, folderPath: string): RawPair[] {
  const raws = deps.getRawsInFolder(folderPath)

  return raws.map(raw => {
    const baseName = getFileNameWithoutExt(raw.file_path).toLowerCase()
    const jpeg = deps.findJpegByName(baseName, folderPath)
    return { raw, jpeg }
  })
}

export function findOrphanedRaws(deps: RawManagerDeps, folderPath: string): RawPair[] {
  return findRawPairs(deps, folderPath).filter(pair => !pair.jpeg)
}
