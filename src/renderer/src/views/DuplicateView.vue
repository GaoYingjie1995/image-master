<script setup lang="ts">
import { ref } from 'vue'
import DuplicateGroup from '../components/cleanup/DuplicateGroup.vue'

const folderPath = ref('')
const groups = ref<{ hash: string; photos: { id: number; file_path: string; file_name: string; file_size: number }[] }[]>([])
const scanning = ref(false)
const progress = ref({ phase: '', current: 0, total: 0 })

async function selectFolder() {
  if (window.electronAPI) {
    folderPath.value = await window.electronAPI.cleanup.selectFolder() || ''
  }
}

async function startScan() {
  if (!folderPath.value) return
  scanning.value = true
  if (window.electronAPI) {
    window.electronAPI.cleanup.onProgress((data) => {
      progress.value = data
    })
    groups.value = await window.electronAPI.cleanup.detectDuplicates(folderPath.value)
  }
  scanning.value = false
}

async function deletePhoto(filePath: string) {
  if (window.electronAPI) {
    await window.electronAPI.cleanup.deleteFiles([filePath])
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">重复照片检测</h2>

    <div class="flex gap-3 mb-6">
      <button @click="selectFolder"
              class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary border border-white/5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
        {{ folderPath || '选择文件夹' }}
      </button>
      <button @click="startScan" :disabled="!folderPath || scanning"
              class="px-4 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
        {{ scanning ? '扫描中...' : '开始扫描' }}
      </button>
    </div>

    <div v-if="scanning" class="mb-4">
      <div class="text-xs text-text-muted">{{ progress.phase }}: {{ progress.current }}/{{ progress.total }}</div>
      <div class="mt-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
        <div class="h-full bg-accent rounded-full transition-all" :style="{ width: (progress.total > 0 ? progress.current / progress.total * 100 : 0) + '%' }"></div>
      </div>
    </div>

    <div class="space-y-4">
      <DuplicateGroup v-for="group in groups" :key="group.hash"
                      :group="group"
                      @delete="deletePhoto" />
    </div>

    <div v-if="!scanning && groups.length === 0 && folderPath" class="text-center text-text-muted text-sm mt-8">
      未发现重复照片
    </div>
  </div>
</template>
