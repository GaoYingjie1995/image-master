import { defineStore } from 'pinia'
import { ref } from 'vue'

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

export const usePhotosStore = defineStore('photos', () => {
  const photos = ref<Photo[]>([])
  const totalCount = ref(0)
  const loading = ref(false)
  const sortBy = ref('日期')

  async function fetchPhotos() {
    loading.value = true
    try {
      if (window.electronAPI) {
        photos.value = (await window.electronAPI.photos.getAll()) as Photo[]
        totalCount.value = await window.electronAPI.photos.count()
      }
    } finally {
      loading.value = false
    }
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

  return { photos, totalCount, loading, sortBy, fetchPhotos, updateRating, updateColorLabel }
})
