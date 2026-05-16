/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  platform: string
  photos: {
    getAll: (options?: unknown) => Promise<unknown[]>
    getById: (id: number) => Promise<unknown>
    getToday: () => Promise<unknown[]>
    count: () => Promise<number>
    updateRating: (id: number, rating: number) => Promise<void>
    batchUpdateRating: (ids: number[], rating: number) => Promise<void>
    updateColorLabel: (id: number, label: string | null) => Promise<void>
    updateRejected: (id: number, rejected: boolean) => Promise<void>
    batchDelete: (ids: number[]) => Promise<void>
    importFolder: () => Promise<unknown>
    getThumbnail: (photoId: number) => Promise<string | null>
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => void
  }
  albums: {
    getAll: () => Promise<Array<{ id: number; name: string }>>
    create: (name: string, parentPath: string) => Promise<unknown>
    delete: (id: number) => Promise<void>
    rename: (id: number, name: string) => Promise<void>
    addPhoto: (albumId: number, photoId: number, photoPath: string) => Promise<void>
    getPhotos: (albumId: number) => Promise<unknown[]>
  }
  cleanup: {
    detectDuplicates: (folderPath: string) => Promise<unknown[]>
    deleteFiles: (filePaths: string[]) => Promise<void>
    findOrphanedRaws: (folderPath: string) => Promise<unknown[]>
    selectFolder: () => Promise<string | null>
    onProgress: (callback: (data: { phase: string; current: number; total: number }) => void) => void
  }
  settings: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    getAll: () => Promise<Record<string, unknown>>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
