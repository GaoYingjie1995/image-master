<script setup lang="ts">
import { computed } from 'vue'
import TitleBar from './components/layout/TitleBar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Toolbar from './components/layout/Toolbar.vue'
import StatusBar from './components/layout/StatusBar.vue'
import ToastContainer from './components/common/ToastContainer.vue'
import { usePhotosStore } from './stores/photos'
import { useSelectionStore } from './stores/selection'
import { useToastStore } from './stores/toast'

const photosStore = usePhotosStore()
const selection = useSelectionStore()
const toast = useToastStore()

const selectedCount = computed(() => selection.count)

async function handleImport() {
  try {
    const result = await window.electronAPI?.photos.importFolder()
    if (result) {
      toast.success(`成功导入 ${(result as { count: number }).count} 张照片`)
      await photosStore.refresh()
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
