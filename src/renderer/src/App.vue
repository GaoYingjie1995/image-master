<script setup lang="ts">
import { computed } from 'vue'
import TitleBar from './components/layout/TitleBar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Toolbar from './components/layout/Toolbar.vue'
import StatusBar from './components/layout/StatusBar.vue'
import ToastContainer from './components/common/ToastContainer.vue'
import { usePhotosStore } from './stores/photos'
import { useAlbumsStore } from './stores/albums'
import { useSelectionStore } from './stores/selection'
import { useToastStore } from './stores/toast'

const photosStore = usePhotosStore()
const albumsStore = useAlbumsStore()
const selection = useSelectionStore()
const toast = useToastStore()

const selectedCount = computed(() => selection.count)

async function handleImport() {
  try {
    const result = await window.electronAPI?.photos.importFolder()
    if (result) {
      const count = (result as { count: number }).count
      if (count > 0) {
        toast.success(`成功导入 ${count} 张照片`)
      } else {
        toast.info('该文件夹中的照片已全部导入过')
      }
      await photosStore.refresh()
      await albumsStore.fetchTree()
    }
  } catch (err) {
    toast.error('导入照片失败')
  }
}

async function handleSearch(query: string) {
  await photosStore.fetchPhotos({ search: query })
}
</script>

<template>
  <div class="flex flex-col h-screen bg-bg-deep">
    <TitleBar @import="handleImport" />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <div class="flex-1 flex flex-col overflow-hidden">
        <Toolbar :sort-by="photosStore.sortBy" :total-count="photosStore.totalCount" @sort="photosStore.sortBy = $event" @search="handleSearch" />
        <main class="flex-1 overflow-hidden">
          <router-view />
        </main>
      </div>
    </div>
    <StatusBar :selected-count="selectedCount" />
    <ToastContainer />
  </div>
</template>
