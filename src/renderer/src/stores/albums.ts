import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Album {
  id: number
  name: string
  folder_path: string
  parent_id: number | null
  cover_photo_id: number | null
  is_collapsed: number
  description: string | null
  created_at: string
  children?: Album[]
  photoCount?: number
}

export const useAlbumsStore = defineStore('albums', () => {
  const albums = ref<Album[]>([])
  const flatAlbums = ref<Album[]>([])

  async function fetchAlbums() {
    if (window.electronAPI) {
      flatAlbums.value = await window.electronAPI.albums.getAll()
    }
  }

  async function fetchTree() {
    if (window.electronAPI) {
      albums.value = await window.electronAPI.albums.getTree()
    }
  }

  async function createAlbum(name: string, parentPath: string, parentId?: number | null) {
    if (window.electronAPI) {
      await window.electronAPI.albums.create(name, parentPath, parentId)
      await fetchTree()
    }
  }

  async function deleteAlbum(id: number) {
    if (window.electronAPI) {
      await window.electronAPI.albums.delete(id)
      await fetchTree()
    }
  }

  async function renameAlbum(id: number, name: string) {
    if (window.electronAPI) {
      await window.electronAPI.albums.rename(id, name)
      await fetchTree()
    }
  }

  async function setCollapsed(id: number, collapsed: boolean) {
    if (window.electronAPI) {
      await window.electronAPI.albums.setCollapsed(id, collapsed)
      await fetchTree()
    }
  }

  async function setCover(albumId: number, photoId: number) {
    if (window.electronAPI) {
      await window.electronAPI.albums.setCover(albumId, photoId)
      await fetchTree()
    }
  }

  return { albums, flatAlbums, fetchAlbums, fetchTree, createAlbum, deleteAlbum, renameAlbum, setCollapsed, setCover }
})
