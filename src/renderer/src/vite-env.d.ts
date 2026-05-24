/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
  export * from '@vue/runtime-core'
}

interface Photo {
  id: number
  file_path: string
  file_name: string
  file_size: number
  file_hash: string | null
  format: string
  parent_folder: string | null
  raw_pair_id: number | null
  width: number | null
  height: number | null
  rating: number
  color_label: string | null
  is_rejected: number
  created_at: string
  modified_at: string
  shot_at: string | null
  camera_model: string | null
  lens_model: string | null
  iso: number | null
  aperture: number | null
  shutter_speed: string | null
  gps_lat: number | null
  gps_lng: number | null
}

interface Album {
  id: number
  name: string
  folder_path: string
  parent_id: number | null
  cover_photo_id: number | null
  is_collapsed: number
  description: string | null
  created_at: string
}

interface AlbumTreeNode extends Album {
  children: AlbumTreeNode[]
  photoCount: number
}

interface SmartAlbum {
  id: number
  name: string
  rules: string
}

interface DuplicateGroup {
  hash: string
  photos: Photo[]
}

interface HistogramData {
  r: number[]
  g: number[]
  b: number[]
  luminance: number[]
}

interface ElectronAPI {
  platform: string
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  photos: {
    getAll: (options?: { orderBy?: string; limit?: number; offset?: number; filter?: string; albumId?: number; search?: string }) => Promise<Photo[]>
    getById: (id: number) => Promise<Photo | undefined>
    getToday: () => Promise<Photo[]>
    count: () => Promise<number>
    countFiltered: (filter?: string, search?: string, albumId?: number) => Promise<number>
    getIdsByFilter: (options?: { filter?: string; search?: string; albumId?: number }) => Promise<number[]>
    updateRating: (id: number, rating: number) => Promise<void>
    batchUpdateRating: (ids: number[], rating: number) => Promise<void>
    updateColorLabel: (id: number, label: string | null) => Promise<void>
    updateRejected: (id: number, rejected: boolean) => Promise<void>
    batchDelete: (ids: number[]) => Promise<{ success: number; failed: number; errors: string[] }>
    importFolder: () => Promise<{ folderPath: string; count: number } | null>
    getThumbnail: (photoId: number) => Promise<string | null>
    getPreview: (photoId: number) => Promise<{ scheme: 'local-photo' | 'local-thumbnail'; path: string } | null>
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => () => void
    batchRename: (ids: number[], template: string, startSeq?: number) => Promise<{ success: number; failed: number; errors: string[] }>
    batchExport: (ids: number[], options: { format: string; quality: number; maxWidth?: number; maxHeight?: number; outputDir?: string; stripExif?: boolean }) => Promise<void>
    selectExportDir: () => Promise<string | null>
    onExportProgress: (callback: (data: { current: number; total: number }) => void) => () => void
    getWithGps: (options?: { dateFrom?: string; dateTo?: string }) => Promise<Photo[]>
    getHistogram: (photoId: number) => Promise<HistogramData>
    showInFolder: (filePath: string) => Promise<void>
    getCacheSize: () => Promise<{ fileCount: number; totalSize: number }>
    clearCache: () => Promise<number>
    rescanMetadata: () => Promise<{ updated: number; total: number }>
  }
  albums: {
    getAll: () => Promise<Album[]>
    getTree: () => Promise<AlbumTreeNode[]>
    create: (name: string, parentPath: string, parentId?: number | null) => Promise<number | null>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
    rename: (id: number, name: string) => Promise<{ success?: boolean; error?: string } | null | undefined>
    setCollapsed: (id: number, collapsed: boolean) => Promise<void>
    setCover: (albumId: number, photoId: number) => Promise<void>
    getPhotoCount: (albumId: number) => Promise<number>
    getAllPhotoCounts: () => Promise<Record<number, number>>
    createSmart: (name: string, rules: string) => Promise<{ id?: number; error?: string }>
    getAllSmart: () => Promise<SmartAlbum[]>
    deleteSmart: (id: number) => Promise<void>
    renameSmart: (id: number, name: string) => Promise<void>
    updateSmart: (id: number, name: string, rules: string) => Promise<{ error?: string; success?: boolean }>
    getSmartPhotos: (albumId: number) => Promise<Photo[]>
  }
  cleanup: {
    detectDuplicates: (folderPath: string) => Promise<DuplicateGroup[]>
    deleteFiles: (filePaths: string[]) => Promise<{ success: number; failed: number }>
    findOrphanedRaws: (folderPath: string) => Promise<{ file_path: string; file_name: string }[]>
    selectFolder: () => Promise<string | null>
    onProgress: (callback: (data: { phase: string; current: number; total: number }) => void) => () => void
  }
  settings: {
    get: <T = unknown>(key: string) => Promise<T | null>
    set: (key: string, value: unknown) => Promise<void>
    getAll: () => Promise<Record<string, unknown>>
  }
  importSources: {
    getAll: () => Promise<Array<{ id: number; folder_path: string; imported_at: string; albumCount: number; photoCount: number }>>
    getAlbumTree: (sourceId: number) => Promise<Array<{ id: number; name: string; folder_path: string; parent_id: number | null; photoCount: number; children: any[] }>>
    add: () => Promise<{ folderPath: string; count: number; alreadyImported?: boolean } | null>
    remove: (id: number) => Promise<{ success: boolean; photoCount?: number; albumCount?: number }>
    removeSubfolder: (sourceId: number, folderPath: string) => Promise<{ success: boolean; photoCount?: number; albumCount?: number }>
    refresh: (sourceId: number) => Promise<{ imported: Array<{ id: number; name: string; folder_path: string }>; removed: Array<{ path: string; removed_at: string }>; new: Array<{ path: string; name: string }> }>
    reimportSubfolder: (sourceId: number, folderPath: string) => Promise<{ folderPath: string; count: number } | null>
    onScanProgress: (callback: (data: { current: number; total: number }) => void) => () => void
  }
}

interface Window {
  electronAPI?: ElectronAPI
}
