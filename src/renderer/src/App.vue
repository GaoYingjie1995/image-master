<script setup lang="ts">
import { ref } from 'vue'
import TitleBar from './components/layout/TitleBar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Toolbar from './components/layout/Toolbar.vue'
import StatusBar from './components/layout/StatusBar.vue'

const sortBy = ref('日期')
const totalCount = ref(0)
const selectedCount = ref(0)

function handleSort(value: string) {
  sortBy.value = value
}
</script>

<template>
  <div class="flex flex-col h-screen bg-bg-deep">
    <TitleBar @import="() => window.electronAPI?.photos.importFolder()" />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <div class="flex-1 flex flex-col overflow-hidden">
        <Toolbar :sort-by="sortBy" :total-count="totalCount" @sort="handleSort" />
        <main class="flex-1 overflow-hidden">
          <router-view />
        </main>
      </div>
    </div>
    <StatusBar :selected-count="selectedCount" />
  </div>
</template>
