import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../../../src/main/db/album-repo'

describe('AlbumRepo', () => {
  let db: Database.Database
  let repo: ReturnType<typeof createAlbumRepo>

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash TEXT,
        format TEXT NOT NULL,
        parent_folder TEXT,
        width INTEGER,
        height INTEGER,
        rating INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL
      );
      CREATE TABLE albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        folder_path TEXT UNIQUE NOT NULL,
        parent_id INTEGER,
        cover_photo_id INTEGER,
        description TEXT,
        is_collapsed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES albums(id) ON DELETE CASCADE
      );
      CREATE TABLE album_photos (
        album_id INTEGER NOT NULL,
        photo_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY (album_id, photo_id),
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
      );
    `)
    repo = createAlbumRepo(db)
  })

  afterEach(() => { db.close() })

  describe('create', () => {
    it('should create album and return id', () => {
      const id = repo.create({ name: 'Travel', folder_path: '/photos/travel', created_at: '2024-01-15' })
      expect(id).toBeGreaterThan(0)
    })

    it('should create album with new fields (parent_id, is_collapsed)', () => {
      const parentId = repo.create({ name: 'Parent', folder_path: '/photos/parent', created_at: '2024-01-01' })
      const childId = repo.create({ name: 'Child', folder_path: '/photos/parent/child', parent_id: parentId, is_collapsed: 1, created_at: '2024-01-02' })
      const child = repo.getById(childId)
      expect(child!.parent_id).toBe(parentId)
      expect(child!.is_collapsed).toBe(1)
    })

    it('should default parent_id to null and is_collapsed to 0', () => {
      const id = repo.create({ name: 'Solo', folder_path: '/photos/solo', created_at: '2024-01-01' })
      const album = repo.getById(id)
      expect(album!.parent_id).toBeNull()
      expect(album!.is_collapsed).toBe(0)
    })
  })

  describe('getById', () => {
    it('should return album by id', () => {
      const id = repo.create({ name: 'Travel', folder_path: '/photos/travel', created_at: '2024-01-15' })
      const album = repo.getById(id)
      expect(album!.name).toBe('Travel')
      expect(album!.folder_path).toBe('/photos/travel')
    })

    it('should return undefined for non-existent id', () => {
      expect(repo.getById(999)).toBeUndefined()
    })
  })

  describe('getByFolderPath', () => {
    it('should return album by folder path', () => {
      repo.create({ name: 'Travel', folder_path: '/photos/travel', created_at: '2024-01-15' })
      const album = repo.getByFolderPath('/photos/travel')
      expect(album!.name).toBe('Travel')
    })

    it('should return undefined for non-existent path', () => {
      expect(repo.getByFolderPath('/nonexistent')).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should list all albums ordered by created_at DESC', () => {
      repo.create({ name: 'A', folder_path: '/a', created_at: '2024-01-01' })
      repo.create({ name: 'B', folder_path: '/b', created_at: '2024-01-02' })
      repo.create({ name: 'C', folder_path: '/c', created_at: '2024-01-03' })
      const all = repo.getAll()
      expect(all).toHaveLength(3)
      expect(all[0].name).toBe('C')
      expect(all[2].name).toBe('A')
    })
  })

  describe('getChildren', () => {
    it('should return child albums of a parent', () => {
      const parentId = repo.create({ name: 'Parent', folder_path: '/parent', created_at: '2024-01-01' })
      repo.create({ name: 'Child B', folder_path: '/parent/b', parent_id: parentId, created_at: '2024-01-02' })
      repo.create({ name: 'Child A', folder_path: '/parent/a', parent_id: parentId, created_at: '2024-01-03' })
      const children = repo.getChildren(parentId)
      expect(children).toHaveLength(2)
      expect(children[0].name).toBe('Child A')
      expect(children[1].name).toBe('Child B')
    })

    it('should return empty array for album with no children', () => {
      const id = repo.create({ name: 'Leaf', folder_path: '/leaf', created_at: '2024-01-01' })
      expect(repo.getChildren(id)).toHaveLength(0)
    })
  })

  describe('getRootAlbums', () => {
    it('should return only root albums (parent_id IS NULL)', () => {
      const rootId = repo.create({ name: 'Root', folder_path: '/root', created_at: '2024-01-01' })
      repo.create({ name: 'Child', folder_path: '/root/child', parent_id: rootId, created_at: '2024-01-02' })
      const roots = repo.getRootAlbums()
      expect(roots).toHaveLength(1)
      expect(roots[0].name).toBe('Root')
    })
  })

  describe('getTree', () => {
    it('should build nested tree structure with photoCount', () => {
      // 创建相册
      const parentId = repo.create({ name: 'Parent', folder_path: '/photos', created_at: '2024-01-01' })
      repo.create({ name: 'Child A', folder_path: '/photos/a', parent_id: parentId, created_at: '2024-01-02' })
      repo.create({ name: 'Child B', folder_path: '/photos/b', parent_id: parentId, created_at: '2024-01-03' })

      // 插入照片
      db.prepare("INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run('/photos/a/1.jpg', '1.jpg', 1000, 'jpg', '/photos/a', '2024-01-01', '2024-01-01')
      db.prepare("INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run('/photos/a/2.jpg', '2.jpg', 2000, 'jpg', '/photos/a', '2024-01-01', '2024-01-01')
      db.prepare("INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run('/photos/b/3.jpg', '3.jpg', 3000, 'jpg', '/photos/b', '2024-01-01', '2024-01-01')

      const tree = repo.getTree()
      expect(tree).toHaveLength(1)
      expect(tree[0].name).toBe('Parent')
      expect(tree[0].photoCount).toBe(0)
      expect(tree[0].children).toHaveLength(2)

      const childA = tree[0].children.find(c => c.name === 'Child A')
      const childB = tree[0].children.find(c => c.name === 'Child B')
      expect(childA!.photoCount).toBe(2)
      expect(childB!.photoCount).toBe(1)
    })

    it('should return empty array when no albums exist', () => {
      expect(repo.getTree()).toEqual([])
    })

    it('should handle orphaned albums (parent_id references non-existent album)', () => {
      repo.create({ name: 'Orphan', folder_path: '/orphan', parent_id: 9999, created_at: '2024-01-01' })
      const tree = repo.getTree()
      expect(tree).toHaveLength(1)
      expect(tree[0].name).toBe('Orphan')
      expect(tree[0].children).toEqual([])
    })
  })

  describe('setCollapsed', () => {
    it('should toggle collapse state', () => {
      const id = repo.create({ name: 'Test', folder_path: '/test', created_at: '2024-01-01' })
      expect(repo.getById(id)!.is_collapsed).toBe(0)

      repo.setCollapsed(id, true)
      expect(repo.getById(id)!.is_collapsed).toBe(1)

      repo.setCollapsed(id, false)
      expect(repo.getById(id)!.is_collapsed).toBe(0)
    })
  })

  describe('delete', () => {
    it('should delete album', () => {
      const id = repo.create({ name: 'Test', folder_path: '/test', created_at: '' })
      repo.delete(id)
      expect(repo.getById(id)).toBeUndefined()
    })

    it('should cascade delete children when parent is deleted', () => {
      const parentId = repo.create({ name: 'Parent', folder_path: '/parent', created_at: '2024-01-01' })
      const childId = repo.create({ name: 'Child', folder_path: '/parent/child', parent_id: parentId, created_at: '2024-01-02' })

      repo.delete(parentId)

      expect(repo.getById(parentId)).toBeUndefined()
      expect(repo.getById(childId)).toBeUndefined()
    })
  })

  describe('rename', () => {
    it('should update name and folder_path', () => {
      const id = repo.create({ name: 'Old', folder_path: '/old', created_at: '2024-01-01' })
      repo.rename(id, 'New', '/new')
      const album = repo.getById(id)
      expect(album!.name).toBe('New')
      expect(album!.folder_path).toBe('/new')
    })
  })

  describe('updateFolderPaths', () => {
    it('should update child album folder paths when parent moves', () => {
      const parentId = repo.create({ name: 'Parent', folder_path: '/old-parent', created_at: '2024-01-01' })
      repo.create({ name: 'Child', folder_path: '/old-parent/child', parent_id: parentId, created_at: '2024-01-02' })

      repo.updateFolderPaths('/old-parent', '/new-parent')

      const child = repo.getByFolderPath('/new-parent/child')
      expect(child).toBeDefined()
      expect(child!.folder_path).toBe('/new-parent/child')
    })
  })

  describe('getPhotoCountByPath', () => {
    it('should count photos in a folder', () => {
      db.prepare("INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run('/photos/a/1.jpg', '1.jpg', 1000, 'jpg', '/photos/a', '2024-01-01', '2024-01-01')
      db.prepare("INSERT INTO photos (file_path, file_name, file_size, format, parent_folder, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run('/photos/a/2.jpg', '2.jpg', 2000, 'jpg', '/photos/a', '2024-01-01', '2024-01-01')

      expect(repo.getPhotoCountByPath('/photos/a')).toBe(2)
    })

    it('should return 0 for folder with no photos', () => {
      expect(repo.getPhotoCountByPath('/empty')).toBe(0)
    })
  })

  describe('setCover', () => {
    it('should update cover_photo_id', () => {
      const id = repo.create({ name: 'Test', folder_path: '/test', created_at: '2024-01-01' })
      repo.setCover(id, 42)
      expect(repo.getById(id)!.cover_photo_id).toBe(42)
    })
  })
})
