<script setup lang="ts">
import { ref } from 'vue'
import RawPairList from '../components/cleanup/RawPairList.vue'

const folderPath = ref('')
const orphanedRaws = ref<{ id: number; file_path: string; file_name: string }[]>([])
const scanning = ref(false)

async function selectFolder() {
  if (window.electronAPI) {
    folderPath.value = await window.electronAPI.cleanup.selectFolder() || ''
  }
}

async function startScan() {
  if (!folderPath.value || !window.electronAPI) return
  scanning.value = true
  orphanedRaws.value = await window.electronAPI.cleanup.findOrphanedRaws(folderPath.value)
  scanning.value = false
}

async function deleteFile(filePath: string) {
  if (!window.electronAPI) return
  await window.electronAPI.cleanup.deleteFiles([filePath])
  orphanedRaws.value = orphanedRaws.value.filter(r => r.file_path !== filePath)
}

async function deleteAll() {
  if (!window.electronAPI) return
  const paths = orphanedRaws.value.map(r => r.file_path)
  await window.electronAPI.cleanup.deleteFiles(paths)
  orphanedRaws.value = []
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">RAW 文件清理</h2>

    <div class="flex gap-3 mb-6">
      <button @click="selectFolder"
              class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary border border-white/5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
        {{ folderPath || '选择文件夹' }}
      </button>
      <button @click="startScan" :disabled="!folderPath || scanning"
              class="px-4 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
        {{ scanning ? '扫描中...' : '扫描孤立 RAW' }}
      </button>
    </div>

    <RawPairList :pairs="orphanedRaws"
                 @delete="deleteFile"
                 @deleteAll="deleteAll" />

    <div v-if="!scanning && orphanedRaws.length === 0 && folderPath" class="text-center text-text-muted text-sm mt-8">
      未发现孤立的 RAW 文件
    </div>
  </div>
</template>
