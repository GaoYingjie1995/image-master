import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { createAlbumRepo } from '../db/album-repo'
import { mkdir, rename } from 'fs/promises'
import { join } from 'path'

export function registerAlbumIpc(db: Database.Database) {
  const repo = createAlbumRepo(db)

  ipcMain.handle('albums:getAll', () => {
    return repo.getAll()
  })

  ipcMain.handle('albums:create', async (_event, name: string, parentPath: string) => {
    const folderPath = join(parentPath, name)
    await mkdir(folderPath, { recursive: true })
    return repo.create({ name, folder_path: folderPath, created_at: new Date().toISOString() })
  })

  ipcMain.handle('albums:delete', async (_event, id: number) => {
    const album = repo.getById(id)
    if (!album) return

    const { rm } = await import('fs/promises')
    await rm(album.folder_path, { recursive: true, force: true })
    repo.delete(id)
  })

  ipcMain.handle('albums:rename', async (_event, id: number, newName: string) => {
    const album = repo.getById(id)
    if (!album) return

    const parentDir = album.folder_path.slice(0, album.folder_path.lastIndexOf('/'))
    const newPath = join(parentDir, newName)
    await rename(album.folder_path, newPath)
    repo.rename(id, newName, newPath)
  })

  ipcMain.handle('albums:addPhoto', async (_event, albumId: number, photoId: number, photoPath: string) => {
    const album = repo.getById(albumId)
    if (!album) return

    const fileName = photoPath.split('/').pop()!
    const newPath = join(album.folder_path, fileName)
    await rename(photoPath, newPath)
    repo.addPhoto(albumId, photoId)
  })

  ipcMain.handle('albums:getPhotos', (_event, albumId: number) => {
    return repo.getPhotos(albumId)
  })
}
