import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },

  photos: {
    getAll: (options?: unknown) => ipcRenderer.invoke('photos:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('photos:getById', id),
    getToday: () => ipcRenderer.invoke('photos:getToday'),
    count: () => ipcRenderer.invoke('photos:count'),
    countFiltered: (filter?: string, search?: string, albumId?: number) => ipcRenderer.invoke('photos:countFiltered', filter, search, albumId),
    getIdsByFilter: (options?: { filter?: string; search?: string; albumId?: number }) => ipcRenderer.invoke('photos:getIdsByFilter', options),
    updateRating: (id: number, rating: number) => ipcRenderer.invoke('photos:updateRating', id, rating),
    batchUpdateRating: (ids: number[], rating: number) => ipcRenderer.invoke('photos:batchUpdateRating', ids, rating),
    updateColorLabel: (id: number, label: string | null) => ipcRenderer.invoke('photos:updateColorLabel', id, label),
    batchUpdateColorLabel: (ids: number[], label: string | null) => ipcRenderer.invoke('photos:batchUpdateColorLabel', ids, label),
    updateRejected: (id: number, rejected: boolean) => ipcRenderer.invoke('photos:updateRejected', id, rejected),
    batchUpdateRejected: (ids: number[], rejected: boolean) => ipcRenderer.invoke('photos:batchUpdateRejected', ids, rejected),
    batchDelete: (ids: number[]) => ipcRenderer.invoke('photos:batchDelete', ids),
    importFolder: () => ipcRenderer.invoke('photos:importFolder'),
    getThumbnail: (photoId: number) => ipcRenderer.invoke('photos:getThumbnail', photoId),
    getThumbnails: (photoIds: number[]) => ipcRenderer.invoke('photos:getThumbnails', photoIds),
    getPreview: (photoId: number) => ipcRenderer.invoke('photos:getPreview', photoId),
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { current: number; total: number }) => callback(data)
      ipcRenderer.on('photos:scanProgress', handler)
      return () => { ipcRenderer.removeListener('photos:scanProgress', handler) }
    },
    batchRename: (ids: number[], template: string, startSeq?: number) => ipcRenderer.invoke('photos:batchRename', ids, template, startSeq),
    batchExport: (ids: number[], options: unknown) => ipcRenderer.invoke('photos:batchExport', ids, options),
    selectExportDir: () => ipcRenderer.invoke('photos:selectExportDir'),
    onExportProgress: (callback: (data: { current: number; total: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { current: number; total: number }) => callback(data)
      ipcRenderer.on('photos:exportProgress', handler)
      return () => { ipcRenderer.removeListener('photos:exportProgress', handler) }
    },
    getWithGps: (options?: { dateFrom?: string; dateTo?: string }) => ipcRenderer.invoke('photos:getWithGps', options),
    getHistogram: (photoId: number) => ipcRenderer.invoke('photos:getHistogram', photoId),
    showInFolder: (filePath: string) => ipcRenderer.invoke('photos:showInFolder', filePath),
    getCacheSize: () => ipcRenderer.invoke('photos:getCacheSize'),
    clearCache: () => ipcRenderer.invoke('photos:clearCache'),
    rescanMetadata: () => ipcRenderer.invoke('photos:rescanMetadata')
  },

  albums: {
    getAll: () => ipcRenderer.invoke('albums:getAll'),
    getTree: () => ipcRenderer.invoke('albums:getTree'),
    create: (name: string, parentPath: string, parentId?: number | null) => ipcRenderer.invoke('albums:create', name, parentPath, parentId),
    delete: (id: number) => ipcRenderer.invoke('albums:delete', id),
    rename: (id: number, name: string) => ipcRenderer.invoke('albums:rename', id, name),
    setCollapsed: (id: number, collapsed: boolean) => ipcRenderer.invoke('albums:setCollapsed', id, collapsed),
    setCover: (albumId: number, photoId: number) => ipcRenderer.invoke('albums:setCover', albumId, photoId),
    getPhotoCount: (albumId: number) => ipcRenderer.invoke('albums:getPhotoCount', albumId),
    getAllPhotoCounts: () => ipcRenderer.invoke('albums:getAllPhotoCounts'),
    createSmart: (name: string, rules: string) => ipcRenderer.invoke('smartAlbums:create', name, rules),
    getAllSmart: () => ipcRenderer.invoke('smartAlbums:getAll'),
    deleteSmart: (id: number) => ipcRenderer.invoke('smartAlbums:delete', id),
    renameSmart: (id: number, name: string) => ipcRenderer.invoke('smartAlbums:rename', id, name),
    updateSmart: (id: number, name: string, rules: string) => ipcRenderer.invoke('smartAlbums:update', id, name, rules),
    getSmartPhotos: (albumId: number) => ipcRenderer.invoke('smartAlbums:getPhotos', albumId)
  },

  cleanup: {
    detectDuplicates: (folderPath: string) => ipcRenderer.invoke('cleanup:detectDuplicates', folderPath),
    deleteFiles: (filePaths: string[]) => ipcRenderer.invoke('cleanup:deleteFiles', filePaths),
    findOrphanedRaws: (folderPath: string) => ipcRenderer.invoke('cleanup:findOrphanedRaws', folderPath),
    selectFolder: () => ipcRenderer.invoke('cleanup:selectFolder'),
    onProgress: (callback: (data: { phase: string; current: number; total: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { phase: string; current: number; total: number }) => callback(data)
      ipcRenderer.on('cleanup:progress', handler)
      return () => { ipcRenderer.removeListener('cleanup:progress', handler) }
    }
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  },

  importSources: {
    getAll: () => ipcRenderer.invoke('importSources:getAll'),
    getAlbumTree: (sourceId: number) => ipcRenderer.invoke('importSources:getAlbumTree', sourceId),
    add: () => ipcRenderer.invoke('importSources:add'),
    remove: (id: number) => ipcRenderer.invoke('importSources:remove', id),
    removeSubfolder: (sourceId: number, folderPath: string) => ipcRenderer.invoke('importSources:removeSubfolder', sourceId, folderPath),
    refresh: (sourceId: number) => ipcRenderer.invoke('importSources:refresh', sourceId),
    reimportSubfolder: (sourceId: number, folderPath: string) => ipcRenderer.invoke('importSources:reimportSubfolder', sourceId, folderPath),
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { current: number; total: number }) => callback(data)
      ipcRenderer.on('photos:scanProgress', handler)
      return () => { ipcRenderer.removeListener('photos:scanProgress', handler) }
    }
  }
})
