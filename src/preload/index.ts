import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  photos: {
    getAll: (options?: unknown) => ipcRenderer.invoke('photos:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('photos:getById', id),
    getToday: () => ipcRenderer.invoke('photos:getToday'),
    count: () => ipcRenderer.invoke('photos:count'),
    updateRating: (id: number, rating: number) => ipcRenderer.invoke('photos:updateRating', id, rating),
    batchUpdateRating: (ids: number[], rating: number) => ipcRenderer.invoke('photos:batchUpdateRating', ids, rating),
    updateColorLabel: (id: number, label: string | null) => ipcRenderer.invoke('photos:updateColorLabel', id, label),
    updateRejected: (id: number, rejected: boolean) => ipcRenderer.invoke('photos:updateRejected', id, rejected),
    batchDelete: (ids: number[]) => ipcRenderer.invoke('photos:batchDelete', ids),
    importFolder: () => ipcRenderer.invoke('photos:importFolder'),
    getThumbnail: (photoId: number) => ipcRenderer.invoke('photos:getThumbnail', photoId),
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => {
      ipcRenderer.on('photos:scanProgress', (_e, data) => callback(data))
    }
  },

  albums: {
    getAll: () => ipcRenderer.invoke('albums:getAll'),
    create: (name: string, parentPath: string) => ipcRenderer.invoke('albums:create', name, parentPath),
    delete: (id: number) => ipcRenderer.invoke('albums:delete', id),
    rename: (id: number, name: string) => ipcRenderer.invoke('albums:rename', id, name),
    addPhoto: (albumId: number, photoId: number, photoPath: string) => ipcRenderer.invoke('albums:addPhoto', albumId, photoId, photoPath),
    getPhotos: (albumId: number) => ipcRenderer.invoke('albums:getPhotos', albumId)
  },

  cleanup: {
    detectDuplicates: (folderPath: string) => ipcRenderer.invoke('cleanup:detectDuplicates', folderPath),
    deleteFiles: (filePaths: string[]) => ipcRenderer.invoke('cleanup:deleteFiles', filePaths),
    findOrphanedRaws: (folderPath: string) => ipcRenderer.invoke('cleanup:findOrphanedRaws', folderPath),
    selectFolder: () => ipcRenderer.invoke('cleanup:selectFolder'),
    onProgress: (callback: (data: { phase: string; current: number; total: number }) => void) => {
      ipcRenderer.on('cleanup:progress', (_e, data) => callback(data))
    }
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  }
})
