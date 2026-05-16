<script setup lang="ts">
defineProps<{
  sortBy: string
  totalCount: number
}>()

defineEmits<{
  (e: 'sort', value: string): void
}>()
</script>

<template>
  <div class="h-11 bg-bg-secondary border-b border-white/5 flex items-center px-4 gap-3">
    <div class="flex gap-0.5">
      <button v-for="opt in ['日期', '名称', '大小', '评分']" :key="opt"
              @click="$emit('sort', opt)"
              class="px-2.5 py-1 text-xs rounded-md transition-colors"
              :class="sortBy === opt ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        {{ opt }}
      </button>
    </div>
    <div class="w-px h-5 bg-white/5 mx-1.5"></div>
    <div class="flex-1"></div>
    <div class="flex items-center gap-1.5 bg-bg-tertiary border border-white/5 rounded-md px-2.5 py-1 w-48 focus-within:border-accent/30 focus-within:bg-bg-hover transition-colors">
      <span class="text-text-muted text-xs">⌕</span>
      <input type="text" placeholder="搜索照片..."
             class="bg-transparent text-text-primary text-xs outline-none w-full placeholder:text-text-muted" />
    </div>
    <span class="text-[11px] text-text-muted">{{ totalCount.toLocaleString() }} 张照片</span>
  </div>
</template>
