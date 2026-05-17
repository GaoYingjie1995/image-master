/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  platform: string
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  photos: {
    getAll: (options?: unknown) => Promise<unknown[]>
    getById: (id: number) => Promise<unknown>
    getToday: () => Promise<unknown[]>
    count: () => Promise<number>
    countFiltered: (filter?: string, search?: string, albumId?: number) => Promise<number>
    getIdsByFilter: (options?: { filter?: string; search?: string; albumId?: number }) => Promise<number[]>
    updateRating: (id: number, rating: number) => Promise<void>
    batchUpdateRating: (ids: number[], rating: number) => Promise<void>
    updateColorLabel: (id: number, label: string | null) => Promise<void>
    updateRejected: (id: number, rejected: boolean) => Promise<void>
    batchDelete: (ids: number[]) => Promise<{ success: number; failed: number; errors: string[] }>
    importFolder: () => Promise<unknown>
    getThumbnail: (photoId: number) => Promise<string | null>
    getPreview: (photoId: number) => Promise<{ scheme: 'local-photo' | 'local-thumbnail'; path: string } | null>
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => () => void
    batchRename: (ids: number[], template: string, startSeq?: number) => Promise<unknown[]>
    batchExport: (ids: number[], options: unknown) => Promise<void>
    selectExportDir: () => Promise<string | null>
    onExportProgress: (callback: (data: { current: number; total: number }) => void) => () => void
    getWithGps: (options?: { dateFrom?: string; dateTo?: string }) => Promise<unknown[]>
    getHistogram: (photoId: number) => Promise<unknown>
    showInFolder: (filePath: string) => Promise<void>
    getCacheSize: () => Promise<{ fileCount: number; totalSize: number }>
    clearCache: () => Promise<number>
    rescanMetadata: () => Promise<{ updated: number; total: number }>
  }
  albums: {
    getAll: () => Promise<Array<{ id: number; name: string; folder_path: string; cover_photo_id: number | null; created_at: string }>>
    create: (name: string, parentPath: string) => Promise<unknown>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
    rename: (id: number, name: string) => Promise<{ success?: boolean; error?: string } | null | undefined>
    addPhoto: (albumId: number, photoId: number, photoPath: string) => Promise<void>
    addPhotos: (albumId: number, photoIds: number[]) => Promise<{ success: number; failed: number; errors: string[] }>
    removePhoto: (albumId: number, photoId: number) => Promise<{ success: boolean }>
    getPhotoCount: (albumId: number) => Promise<number>
    getAllPhotoCounts: () => Promise<Record<number, number>>
    getPhotos: (albumId: number) => Promise<unknown[]>
    createSmart: (name: string, rules: string) => Promise<{ id?: number; error?: string }>
    getAllSmart: () => Promise<unknown[]>
    deleteSmart: (id: number) => Promise<void>
    renameSmart: (id: number, name: string) => Promise<void>
    updateSmart: (id: number, name: string, rules: string) => Promise<{ error?: string; success?: boolean }>
    getSmartPhotos: (albumId: number) => Promise<unknown[]>
  }
  cleanup: {
    detectDuplicates: (folderPath: string) => Promise<unknown[]>
    deleteFiles: (filePaths: string[]) => Promise<{ success: number; failed: number }>
    findOrphanedRaws: (folderPath: string) => Promise<unknown[]>
    selectFolder: () => Promise<string | null>
    onProgress: (callback: (data: { phase: string; current: number; total: number }) => void) => () => void
  }
  settings: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    getAll: () => Promise<Record<string, unknown>>
  }
}

interface Window {
  electronAPI?: ElectronAPI
}
