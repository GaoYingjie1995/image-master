import Database from 'better-sqlite3'

export interface ImportSourceInsert {
  folder_path: string
  imported_at: string
}

export interface ImportSourceRow {
  id: number
  folder_path: string
  imported_at: string
}

export interface ImportSourceWithStats extends ImportSourceRow {
  albumCount: number
  photoCount: number
}

export interface AlbumTreeNode {
  id: number
  name: string
  folder_path: string
  parent_id: number | null
  photoCount: number
  children: AlbumTreeNode[]
}

export interface RemovedFolder {
  id: number
  source_id: number
  folder_path: string
  removed_at: string
}

export function createImportSourceRepo(db: Database.Database) {
  return {
    create(source: ImportSourceInsert): number {
      const result = db.prepare(`
        INSERT INTO import_sources (folder_path, imported_at)
        VALUES (@folder_path, @imported_at)
      `).run(source)
      return Number(result.lastInsertRowid)
    },

    getById(id: number): ImportSourceRow | undefined {
      return db.prepare('SELECT * FROM import_sources WHERE id = ?').get(id) as ImportSourceRow | undefined
    },

    getByFolderPath(folderPath: string): ImportSourceRow | undefined {
      return db.prepare('SELECT * FROM import_sources WHERE folder_path = ?').get(folderPath) as ImportSourceRow | undefined
    },

    getAll(): ImportSourceRow[] {
      return db.prepare('SELECT * FROM import_sources ORDER BY imported_at DESC').all() as ImportSourceRow[]
    },

    getAllWithStats(): ImportSourceWithStats[] {
      const sources = db.prepare('SELECT * FROM import_sources ORDER BY imported_at DESC').all() as ImportSourceRow[]
      return sources.map(source => {
        // 查找顶层相册（parent_id IS NULL 且属于此 source）
        const rootAlbum = db.prepare(`
          SELECT id FROM albums WHERE import_source_id = ? AND parent_id IS NULL LIMIT 1
        `).get(source.id) as { id: number } | undefined

        let albumCount = 0
        let photoCount = 0

        if (rootAlbum) {
          // 直接子目录数
          albumCount = (db.prepare(`
            SELECT COUNT(*) as count FROM albums WHERE parent_id = ?
          `).get(rootAlbum.id) as { count: number }).count

          // 递归统计所有子目录下的照片数
          const childPaths = db.prepare(`
            SELECT folder_path FROM albums WHERE import_source_id = ?
          `).all(source.id) as { folder_path: string }[]
          for (const row of childPaths) {
            const count = (db.prepare(`
              SELECT COUNT(*) as count FROM photos WHERE parent_folder = ?
            `).get(row.folder_path) as { count: number }).count
            photoCount += count
          }
        }

        return { ...source, albumCount, photoCount }
      })
    },

    delete(id: number): void {
      db.prepare('DELETE FROM import_sources WHERE id = ?').run(id)
    },

    getAlbumIdsBySourceId(id: number): number[] {
      const rows = db.prepare('SELECT id FROM albums WHERE import_source_id = ?').all(id) as { id: number }[]
      return rows.map(r => r.id)
    },

    getPhotoIdsBySourceId(id: number): number[] {
      const rows = db.prepare(`
        SELECT DISTINCT p.id FROM photos p
        JOIN albums a ON p.parent_folder = a.folder_path
        WHERE a.import_source_id = ?
      `).all(id) as { id: number }[]
      return rows.map(r => r.id)
    },

    getAlbumTreeBySourceId(sourceId: number): AlbumTreeNode[] {
      const albums = db.prepare(`
        SELECT id, name, folder_path, parent_id FROM albums
        WHERE import_source_id = ?
        ORDER BY name
      `).all(sourceId) as { id: number; name: string; folder_path: string; parent_id: number | null }[]

      console.log('[getAlbumTree] sourceId:', sourceId, 'albumCount:', albums.length)
      for (const a of albums) {
        console.log('  -', a.id, a.name, 'parent_id:', a.parent_id, 'path:', a.folder_path)
      }

      const photoCounts = db.prepare(`
        SELECT parent_folder, COUNT(*) as count FROM photos
        WHERE parent_folder IN (SELECT folder_path FROM albums WHERE import_source_id = ?)
        GROUP BY parent_folder
      `).all(sourceId) as { parent_folder: string; count: number }[]

      const countMap = new Map<string, number>()
      for (const row of photoCounts) {
        countMap.set(row.parent_folder, row.count)
      }

      const idMap = new Map<number, AlbumTreeNode>()
      const pathMap = new Map<string, AlbumTreeNode>()
      for (const album of albums) {
        const node: AlbumTreeNode = {
          id: album.id,
          name: album.name,
          folder_path: album.folder_path,
          parent_id: album.parent_id,
          photoCount: countMap.get(album.folder_path) || 0,
          children: []
        }
        idMap.set(album.id, node)
        pathMap.set(album.folder_path, node)
      }

      // 构建父子关系：先用 parent_id，再用路径匹配兜底
      const roots: AlbumTreeNode[] = []
      for (const album of albums) {
        const node = idMap.get(album.id)!
        let parentFound = false

        // 方法1：通过 parent_id
        if (album.parent_id && idMap.has(album.parent_id)) {
          idMap.get(album.parent_id)!.children.push(node)
          parentFound = true
        }

        // 方法2：通过路径匹配
        if (!parentFound) {
          const parentDir = album.folder_path.substring(0, album.folder_path.lastIndexOf('/'))
          const parentNode = pathMap.get(parentDir)
          if (parentNode) {
            parentNode.children.push(node)
            node.parent_id = parentNode.id
            parentFound = true
          }
        }

        if (!parentFound) {
          roots.push(node)
        }
      }

      console.log('[getAlbumTree] roots:', roots.length)
      for (const r of roots) {
        console.log('  ROOT:', r.name, 'children:', r.children.length, r.children.map(c => c.name).join(', '))
      }
      return roots
    },

    // 移除子文件夹：记录到 removed 表，删除照片和相册
    removeSubfolder(sourceId: number, folderPath: string): { photoCount: number; albumCount: number } {
      return db.transaction(() => {
        // 记录移除
        db.prepare(`
          INSERT OR IGNORE INTO import_removed_folders (source_id, folder_path, removed_at)
          VALUES (?, ?, datetime('now'))
        `).run(sourceId, folderPath)

        // 获取该文件夹及其子文件夹的相册
        const albums = db.prepare(`
          SELECT id, folder_path FROM albums
          WHERE import_source_id = ? AND (folder_path = ? OR folder_path LIKE ?)
        `).all(sourceId, folderPath, folderPath + '/%') as { id: number; folder_path: string }[]

        const albumIds = albums.map(a => a.id)
        const folderPaths = albums.map(a => a.folder_path)

        // 删除这些文件夹下的照片
        let photoCount = 0
        for (const fp of folderPaths) {
          const photos = db.prepare('SELECT id FROM photos WHERE parent_folder = ?').all(fp) as { id: number }[]
          for (const p of photos) {
            db.prepare('DELETE FROM photos WHERE id = ?').run(p.id)
            photoCount++
          }
        }

        // 删除相册
        for (const aid of albumIds) {
          db.prepare('DELETE FROM albums WHERE id = ?').run(aid)
        }

        return { photoCount, albumCount: albumIds.length }
      })()
    },

    // 获取被移除的子文件夹列表
    getRemovedFolders(sourceId: number): RemovedFolder[] {
      return db.prepare(`
        SELECT * FROM import_removed_folders
        WHERE source_id = ?
        ORDER BY folder_path
      `).all(sourceId) as RemovedFolder[]
    },

    // 重新导入被移除的子文件夹
    reimportSubfolder(sourceId: number, folderPath: string): void {
      db.prepare(`
        DELETE FROM import_removed_folders
        WHERE source_id = ? AND folder_path = ?
      `).run(sourceId, folderPath)
    }
  }
}
