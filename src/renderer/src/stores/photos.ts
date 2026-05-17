import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Photo {
  id: number
  file_path: string
  file_name: string
  file_size: number
  format: string
  rating: number
  color_label: string | null
  is_rejected: number
  shot_at: string | null
  camera_model: string | null
  lens_model: string | null
  iso: number | null
  aperture: number | null
  shutter_speed: string | null
  width: number | null
  height: number | null
  created_at: string
}

const SORT_MAP: Record<string, string> = {
  date: 'shot_at DESC',
  name: 'file_name ASC',
  size: 'file_size DESC',
  rating: 'rating DESC',
  camera: 'camera_model ASC',
  lens: 'lens_model ASC',
  iso: 'iso DESC'
}

export const usePhotosStore = defineStore('photos', () => {
  const photos = ref<Photo[]>([])
  const totalCount = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(true)
  const sortBy = ref('date')
  const searchQuery = ref('')
  const currentFilter = ref<string | undefined>(undefined)
  const currentAlbumId = ref<number | undefined>(undefined)

  const PAGE_SIZE = 200
  const orderBy = computed(() => SORT_MAP[sortBy.value] || 'shot_at DESC')

  async function fetchPhotos(options?: { filter?: string; albumId?: number; search?: string }) {
    loading.value = true
    hasMore.value = true
    currentFilter.value = options?.filter
    currentAlbumId.value = options?.albumId
    if (options?.search !== undefined) searchQuery.value = options.search
    try {
      if (window.electronAPI) {
        const results = (await window.electronAPI.photos.getAll({
          orderBy: orderBy.value,
          limit: PAGE_SIZE,
          offset: 0,
          filter: options?.filter,
          albumId: options?.albumId,
          search: options?.search || searchQuery.value || undefined
        })) as Photo[]
        photos.value = results
        hasMore.value = results.length >= PAGE_SIZE
        totalCount.value = await window.electronAPI.photos.countFiltered(options?.filter, options?.search || searchQuery.value || undefined, options?.albumId)
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchNextPage() {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    try {
      if (window.electronAPI) {
        const results = (await window.electronAPI.photos.getAll({
          orderBy: orderBy.value,
          limit: PAGE_SIZE,
          offset: photos.value.length,
          filter: currentFilter.value,
          albumId: currentAlbumId.value,
          search: searchQuery.value || undefined
        })) as Photo[]
        photos.value.push(...results)
        hasMore.value = results.length >= PAGE_SIZE
      }
    } finally {
      loadingMore.value = false
    }
  }

  async function fetchSmartAlbumPhotos(albumId: number) {
    loading.value = true
    hasMore.value = false
    currentFilter.value = undefined
    currentAlbumId.value = undefined
    try {
      if (window.electronAPI) {
        photos.value = (await window.electronAPI.albums.getSmartPhotos(albumId)) as Photo[]
        totalCount.value = photos.value.length
      }
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    await fetchPhotos({ filter: currentFilter.value, albumId: currentAlbumId.value, search: searchQuery.value })
  }

  async function updateRating(id: number, rating: number) {
    if (window.electronAPI) {
      await window.electronAPI.photos.updateRating(id, rating)
      const photo = photos.value.find(p => p.id === id)
      if (photo) photo.rating = rating
    }
  }

  async function updateColorLabel(id: number, label: string | null) {
    if (window.electronAPI) {
      await window.electronAPI.photos.updateColorLabel(id, label)
      const photo = photos.value.find(p => p.id === id)
      if (photo) photo.color_label = label
    }
  }

  return { photos, totalCount, loading, loadingMore, hasMore, sortBy, searchQuery, currentFilter, fetchPhotos, fetchNextPage, fetchSmartAlbumPhotos, refresh, updateRating, updateColorLabel }
})
