import { useSelectionStore } from '../stores/selection'
import { usePhotosStore } from '../stores/photos'
import { useAlbumsStore } from '../stores/albums'

export function useBatchOperations() {
  const selection = useSelectionStore()
  const photosStore = usePhotosStore()
  const albumsStore = useAlbumsStore()
  const api = window.electronAPI!

  async function batchRate(rating: number) {
    const ids = Array.from(selection.selectedIds)
    if (ids.length === 0) return
    await api.photos.batchUpdateRating(ids, rating)
    for (const photo of photosStore.photos) {
      if (selection.selectedIds.has(photo.id)) {
        photo.rating = rating
      }
    }
  }

  async function batchColorLabel(label: string | null) {
    const ids = Array.from(selection.selectedIds)
    for (const id of ids) {
      await api.photos.updateColorLabel(id, label)
    }
    for (const photo of photosStore.photos) {
      if (selection.selectedIds.has(photo.id)) {
        photo.color_label = label
      }
    }
  }

  async function batchReject() {
    const ids = Array.from(selection.selectedIds)
    for (const id of ids) {
      await api.photos.updateRejected(id, true)
    }
    for (const photo of photosStore.photos) {
      if (selection.selectedIds.has(photo.id)) {
        photo.is_rejected = 1
      }
    }
  }

  async function batchDelete() {
    const ids = Array.from(selection.selectedIds)
    if (ids.length === 0) return
    const result = await api.photos.batchDelete(ids)
    if (result.success > 0) {
      photosStore.photos = photosStore.photos.filter(p => !selection.selectedIds.has(p.id))
      photosStore.totalCount -= result.success
      selection.clear()
      albumsStore.fetchTree()
    }
  }

  return { batchRate, batchColorLabel, batchReject, batchDelete }
}
