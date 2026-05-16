<script setup lang="ts">
defineProps<{
  group: { hash: string; photos: { id: number; file_path: string; file_name: string; file_size: number }[] }
}>()

defineEmits<{
  (e: 'keep', photoId: number): void
  (e: 'delete', photoId: number): void
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xs text-accent font-medium">重复组</span>
      <span class="text-[10px] text-text-muted">{{ group.photos.length }} 个文件</span>
    </div>
    <div class="space-y-2">
      <div v-for="photo in group.photos" :key="photo.id"
           class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
        <div class="w-12 h-12 bg-bg-hover rounded-md flex items-center justify-center text-lg opacity-30">◈</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-text-primary truncate">{{ photo.file_name }}</div>
          <div class="text-[11px] text-text-muted truncate">{{ photo.file_path }}</div>
          <div class="text-[11px] text-text-muted">{{ formatSize(photo.file_size) }}</div>
        </div>
        <div class="flex gap-2">
          <button @click="$emit('keep', photo.id)"
                  class="px-3 py-1 text-xs rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
            保留
          </button>
          <button @click="$emit('delete', photo.id)"
                  class="px-3 py-1 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
