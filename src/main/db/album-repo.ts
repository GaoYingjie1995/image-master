import Database from 'better-sqlite3'

export interface AlbumInsert {
  name: string
  folder_path: string
  parent_id?: number | null
  cover_photo_id?: number
  description?: string
  is_collapsed?: number
  created_at: string
}

export interface AlbumRow {
  id: number
  name: string
  folder_path: string
  parent_id: number | null
  cover_photo_id: number | null
  description: string | null
  is_collapsed: number
  created_at: string
}

export interface AlbumTreeNode extends AlbumRow {
  children: AlbumTreeNode[]
  photoCount: number
}

export function createAlbumRepo(db: Database.Database) {
  return {
    create(album: AlbumInsert): number {
      const result = db.prepare(`
        INSERT INTO albums (name, folder_path, parent_id, cover_photo_id, description, is_collapsed, created_at)
        VALUES (@name, @folder_path, @parent_id, @cover_photo_id, @description, @is_collapsed, @created_at)
      `).run({
        parent_id: null,
        cover_photo_id: null,
        description: null,
        is_collapsed: 0,
        ...album
      })
      return Number(result.lastInsertRowid)
    },

    getById(id: number): AlbumRow | undefined {
      return db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as AlbumRow | undefined
    },

    getByFolderPath(folderPath: string): AlbumRow | undefined {
      return db.prepare('SELECT * FROM albums WHERE folder_path = ?').get(folderPath) as AlbumRow | undefined
    },

    getAll(): AlbumRow[] {
      return db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all() as AlbumRow[]
    },

    getChildren(parentId: number): AlbumRow[] {
      return db.prepare('SELECT * FROM albums WHERE parent_id = ? ORDER BY name').all(parentId) as AlbumRow[]
    },

    getRootAlbums(): AlbumRow[] {
      return db.prepare('SELECT * FROM albums WHERE parent_id IS NULL ORDER BY created_at DESC').all() as AlbumRow[]
    },

    getTree(): AlbumTreeNode[] {
      const allAlbums = db.prepare('SELECT * FROM albums ORDER BY name').all() as AlbumRow[]
      const photoCounts = db.prepare(
        'SELECT parent_folder, COUNT(*) as count FROM photos WHERE parent_folder IS NOT NULL GROUP BY parent_folder'
      ).all() as { parent_folder: string; count: number }[]

      const countMap = new Map<string, number>()
      for (const row of photoCounts) {
        countMap.set(row.parent_folder, row.count)
      }

      const nodeMap = new Map<number, AlbumTreeNode>()
      for (const album of allAlbums) {
        nodeMap.set(album.id, {
          ...album,
          children: [],
          photoCount: countMap.get(album.folder_path) || 0
        })
      }

      const roots: AlbumTreeNode[] = []
      for (const album of allAlbums) {
        const node = nodeMap.get(album.id)!
        if (album.parent_id && nodeMap.has(album.parent_id)) {
          nodeMap.get(album.parent_id)!.children.push(node)
        } else {
          roots.push(node)
        }
      }

      return roots
    },

    setCollapsed(id: number, collapsed: boolean): void {
      db.prepare('UPDATE albums SET is_collapsed = ? WHERE id = ?').run(collapsed ? 1 : 0, id)
    },

    setCover(albumId: number, photoId: number): void {
      db.prepare('UPDATE albums SET cover_photo_id = ? WHERE id = ?').run(photoId, albumId)
    },

    delete(id: number): void {
      db.prepare('DELETE FROM albums WHERE id = ?').run(id)
    },

    rename(id: number, name: string, newPath: string): void {
      db.prepare('UPDATE albums SET name = ?, folder_path = ? WHERE id = ?').run(name, newPath, id)
    },

    updateFolderPaths(oldPath: string, newPath: string): void {
      const children = db.prepare('SELECT id, folder_path FROM albums WHERE folder_path LIKE ?').all(oldPath + '/%') as { id: number; folder_path: string }[]
      for (const child of children) {
        const newChildPath = child.folder_path.replace(oldPath, newPath)
        db.prepare('UPDATE albums SET folder_path = ? WHERE id = ?').run(newChildPath, child.id)
      }
    },

    getPhotoCountByPath(folderPath: string): number {
      return (db.prepare('SELECT COUNT(*) as count FROM photos WHERE parent_folder = ?').get(folderPath) as { count: number }).count
    }
  }
}
