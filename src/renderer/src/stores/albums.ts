import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Album {
  id: number
  name: string
  folder_path: string
  cover_photo_id: number | null
  created_at: string
}

export const useAlbumsStore = defineStore('albums', () => {
  const albums = ref<Album[]>([])

  async function fetchAlbums() {
    if (window.electronAPI) {
      albums.value = await window.electronAPI.albums.getAll()
    }
  }

  async function createAlbum(name: string, parentPath: string) {
    if (window.electronAPI) {
      await window.electronAPI.albums.create(name, parentPath)
      await fetchAlbums()
    }
  }

  async function deleteAlbum(id: number) {
    if (window.electronAPI) {
      await window.electronAPI.albums.delete(id)
      await fetchAlbums()
    }
  }

  async function renameAlbum(id: number, name: string) {
    if (window.electronAPI) {
      await window.electronAPI.albums.rename(id, name)
      await fetchAlbums()
    }
  }

  return { albums, fetchAlbums, createAlbum, deleteAlbum, renameAlbum }
})
