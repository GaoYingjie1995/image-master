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
  // 缓存 prepared statements，避免每次调用重新 prepare
  const stmts = {
    insert: db.prepare(`
      INSERT INTO albums (name, folder_path, parent_id, cover_photo_id, description, is_collapsed, created_at)
      VALUES (@name, @folder_path, @parent_id, @cover_photo_id, @description, @is_collapsed, @created_at)
    `),
    getById: db.prepare('SELECT * FROM albums WHERE id = ?'),
    getByFolderPath: db.prepare('SELECT * FROM albums WHERE folder_path = ?'),
    getAll: db.prepare('SELECT * FROM albums ORDER BY created_at DESC'),
    getChildren: db.prepare('SELECT * FROM albums WHERE parent_id = ? ORDER BY name'),
    getRootAlbums: db.prepare('SELECT * FROM albums WHERE parent_id IS NULL ORDER BY created_at DESC'),
    getAllOrdered: db.prepare('SELECT * FROM albums ORDER BY name'),
    photoCounts: db.prepare('SELECT parent_folder, COUNT(*) as count FROM photos WHERE parent_folder IS NOT NULL GROUP BY parent_folder'),
    setCollapsed: db.prepare('UPDATE albums SET is_collapsed = ? WHERE id = ?'),
    setCover: db.prepare('UPDATE albums SET cover_photo_id = ? WHERE id = ?'),
    deleteById: db.prepare('DELETE FROM albums WHERE id = ?'),
    rename: db.prepare('UPDATE albums SET name = ?, folder_path = ? WHERE id = ?'),
    findByPathPrefix: db.prepare('SELECT id, folder_path FROM albums WHERE folder_path LIKE ?'),
    updateFolderPath: db.prepare('UPDATE albums SET folder_path = ? WHERE id = ?'),
    countPhotosByFolder: db.prepare('SELECT COUNT(*) as count FROM photos WHERE parent_folder = ?')
  }

  return {
    create(album: AlbumInsert): number {
      const result = stmts.insert.run({
        parent_id: null,
        cover_photo_id: null,
        description: null,
        is_collapsed: 0,
        ...album
      })
      return Number(result.lastInsertRowid)
    },

    getById(id: number): AlbumRow | undefined {
      return stmts.getById.get(id) as AlbumRow | undefined
    },

    getByFolderPath(folderPath: string): AlbumRow | undefined {
      return stmts.getByFolderPath.get(folderPath) as AlbumRow | undefined
    },

    getAll(): AlbumRow[] {
      return stmts.getAll.all() as AlbumRow[]
    },

    getChildren(parentId: number): AlbumRow[] {
      return stmts.getChildren.all(parentId) as AlbumRow[]
    },

    getRootAlbums(): AlbumRow[] {
      return stmts.getRootAlbums.all() as AlbumRow[]
    },

    getTree(): AlbumTreeNode[] {
      const allAlbums = stmts.getAllOrdered.all() as AlbumRow[]
      const photoCounts = stmts.photoCounts.all() as { parent_folder: string; count: number }[]

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
      stmts.setCollapsed.run(collapsed ? 1 : 0, id)
    },

    setCover(albumId: number, photoId: number): void {
      stmts.setCover.run(photoId, albumId)
    },

    delete(id: number): void {
      stmts.deleteById.run(id)
    },

    rename(id: number, name: string, newPath: string): void {
      stmts.rename.run(name, newPath, id)
    },

    updateFolderPaths(oldPath: string, newPath: string): void {
      const children = stmts.findByPathPrefix.all(oldPath + '/%') as { id: number; folder_path: string }[]
      for (const child of children) {
        const newChildPath = newPath + child.folder_path.slice(oldPath.length)
        stmts.updateFolderPath.run(newChildPath, child.id)
      }
    },

    getPhotoCountByPath(folderPath: string): number {
      return (stmts.countPhotosByFolder.get(folderPath) as { count: number }).count
    }
  }
}
