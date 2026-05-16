import { hashFileQuick, hashFileFull } from './hasher'

interface DuplicatePhoto {
  id: number
  file_path: string
  file_name: string
  file_size: number
}

export interface DuplicateGroup {
  hash: string
  photos: DuplicatePhoto[]
}

interface DuplicateDetectorDeps {
  getPhotosInFolder: (folderPath: string) => DuplicatePhoto[]
  updateHash: (id: number, hash: string) => void
}

export async function detectDuplicates(
  deps: DuplicateDetectorDeps,
  folderPath: string,
  onProgress?: (phase: string, current: number, total: number) => void
): Promise<DuplicateGroup[]> {
  const photos = deps.getPhotosInFolder(folderPath)

  // Phase 1: Quick hash (file size + first 64KB)
  const quickHashes = new Map<string, DuplicatePhoto[]>()
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    try {
      const quickHash = await hashFileQuick(photo.file_path)
      const group = quickHashes.get(quickHash) || []
      group.push(photo)
      quickHashes.set(quickHash, group)
    } catch {
      // Skip files that can't be read
    }
    onProgress?.('快速筛选', i + 1, photos.length)
  }

  // Phase 2: Full SHA-256 for candidates
  const candidates = Array.from(quickHashes.values()).filter(g => g.length > 1)
  const groups: DuplicateGroup[] = []

  for (let i = 0; i < candidates.length; i++) {
    const group = candidates[i]
    const fullHashMap = new Map<string, DuplicatePhoto[]>()

    for (const photo of group) {
      try {
        const fullHash = await hashFileFull(photo.file_path)
        deps.updateHash(photo.id, fullHash)
        const dupGroup = fullHashMap.get(fullHash) || []
        dupGroup.push(photo)
        fullHashMap.set(fullHash, dupGroup)
      } catch {
        // Skip files that can't be read
      }
    }

    for (const [hash, dups] of fullHashMap) {
      if (dups.length > 1) {
        groups.push({ hash, photos: dups })
      }
    }

    onProgress?.('精确比对', i + 1, candidates.length)
  }

  return groups
}
