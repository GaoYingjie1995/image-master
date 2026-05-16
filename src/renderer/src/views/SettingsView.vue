<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()
const deleteLinkedRaw = ref(false)

onMounted(async () => {
  await settingsStore.fetchSettings()
  deleteLinkedRaw.value = settingsStore.getSetting('deleteLinkedRaw', false)
})

async function toggleDeleteLinkedRaw() {
  deleteLinkedRaw.value = !deleteLinkedRaw.value
  await settingsStore.setSetting('deleteLinkedRaw', deleteLinkedRaw.value)
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">设置</h2>

    <div class="space-y-6 max-w-lg">
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">文件管理</h3>
        <label class="flex items-center gap-3 cursor-pointer" @click="toggleDeleteLinkedRaw">
          <div class="relative">
            <div class="w-9 h-5 rounded-full transition-colors"
                 :class="deleteLinkedRaw ? 'bg-accent/30' : 'bg-bg-tertiary'">
              <div class="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                   :class="deleteLinkedRaw ? 'left-[18px] bg-accent' : 'left-0.5 bg-text-muted'"></div>
            </div>
          </div>
          <div>
            <div class="text-sm text-text-primary">关联删除 RAW 文件</div>
            <div class="text-[11px] text-text-muted">删除 JPEG 时同时删除同名 RAW 文件</div>
          </div>
        </label>
      </div>

      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">支持的 RAW 格式</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="fmt in ['CR2', 'CR3', 'NEF', 'ARW', 'ORF', 'RAF', 'DNG', 'PEF', 'SRW', 'RW2']" :key="fmt"
                class="px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary">
            {{ fmt }}
          </span>
        </div>
      </div>

      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">关于</h3>
        <div class="text-[11px] text-text-muted space-y-1">
          <div>Image Master v0.1.0</div>
          <div>面向摄影爱好者和专业摄影师的照片管理工具</div>
          <div>基于 Electron + Vue 3 + Tailwind CSS</div>
        </div>
      </div>
    </div>
  </div>
</template>
