<script setup lang="ts">
defineProps<{
  pairs: { file_path: string; file_name: string }[]
}>()

defineEmits<{
  (e: 'delete', filePath: string): void
  (e: 'deleteAll'): void
}>()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4" v-if="pairs.length > 0">
      <span class="text-sm text-text-muted">发现 {{ pairs.length }} 个孤立 RAW 文件</span>
      <button @click="$emit('deleteAll')"
              class="px-3 py-1 text-xs rounded-md bg-fuji-red/10 text-fuji-red hover:bg-fuji-red/20 transition-colors">
        删除全部
      </button>
    </div>
    <div class="space-y-2">
      <div v-for="raw in pairs" :key="raw.file_path"
           class="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
        <span class="text-fuji-warm text-sm">⊘</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-text-primary truncate">{{ raw.file_name }}</div>
          <div class="text-[11px] text-text-muted truncate font-mono">{{ raw.file_path }}</div>
        </div>
        <button @click="$emit('delete', raw.file_path)"
                class="px-3 py-1 text-xs rounded-md bg-fuji-red/10 text-fuji-red hover:bg-fuji-red/20 transition-colors">
          删除
        </button>
      </div>
    </div>
  </div>
</template>
