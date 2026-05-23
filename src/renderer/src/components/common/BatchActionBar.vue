<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Star, X, Ban, Download, Trash2, CheckSquare, Square } from 'lucide-vue-next'

const { t } = useI18n()

defineProps<{
  count: number
  totalCount?: number
}>()

const emit = defineEmits<{
  (e: 'rate', rating: number): void
  (e: 'colorLabel', label: string | null): void
  (e: 'reject'): void
  (e: 'delete'): void
  (e: 'export'): void
  (e: 'clear'): void
  (e: 'selectAll'): void
  (e: 'deselectAll'): void
}>()

const COLOR_LABELS = [
  { key: 'red', color: '#ef4444' },
  { key: 'yellow', color: '#eab308' },
  { key: 'green', color: '#22c55e' },
  { key: 'blue', color: '#3b82f6' },
  { key: 'purple', color: '#a855f7' }
]

const showColorPicker = ref(false)
</script>

<template>
  <div class="h-10 bg-bg-secondary border-b border-accent/20 flex items-center px-4 gap-2 animate-slide-down">
    <span class="text-xs text-accent font-medium mr-1">{{ $t('batchAction.selected', { count }) }}</span>
    <div class="w-px h-5 bg-white/5"></div>

    <!-- 快速评分 -->
    <div class="flex items-center gap-0.5">
      <button v-for="star in 5" :key="star"
              @click="emit('rate', star)"
              class="text-text-muted hover:text-accent transition-colors px-0.5"
              :title="$t('batchAction.rate') + ' ' + star">
        <Star :size="13" />
      </button>
      <button @click="emit('rate', 0)" class="text-text-muted hover:text-text-primary transition-colors px-1" :title="$t('contextMenu.clearRating')">
        <X :size="12" />
      </button>
    </div>

    <div class="w-px h-5 bg-white/5"></div>

    <!-- 颜色标签 -->
    <div class="relative">
      <button @click="showColorPicker = !showColorPicker"
              class="text-text-secondary hover:text-text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
              :title="$t('batchAction.colorLabel')">
        <span class="w-3 h-3 rounded-full bg-text-muted inline-block"></span>
      </button>
      <div v-if="showColorPicker" class="absolute top-full left-0 mt-1 flex gap-1 bg-bg-primary border border-white/10 rounded-lg px-2 py-1.5 shadow-xl z-10">
        <button v-for="cl in COLOR_LABELS" :key="cl.key"
                @click="emit('colorLabel', cl.key); showColorPicker = false"
                class="w-4 h-4 rounded-full hover:scale-125 transition-transform"
                :style="{ backgroundColor: cl.color }"></button>
        <button @click="emit('colorLabel', null); showColorPicker = false"
                class="text-text-muted hover:text-text-primary px-1" :title="$t('contextMenu.clearLabel')">
          <X :size="12" />
        </button>
      </div>
    </div>

    <!-- 拒绝 -->
    <button @click="emit('reject')"
            class="text-text-secondary hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
            :title="$t('batchAction.reject')">
      <Ban :size="14" />
    </button>

    <div class="w-px h-5 bg-white/5"></div>

    <!-- 导出 -->
    <button @click="emit('export')"
            class="text-text-secondary hover:text-text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
            :title="$t('batchAction.export')">
      <Download :size="14" />
    </button>

    <!-- 删除 -->
    <button @click="emit('delete')"
            class="text-text-secondary hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
            :title="$t('batchAction.delete')">
      <Trash2 :size="14" />
    </button>

    <div class="flex-1"></div>

    <!-- 全选/取消全选 -->
    <button v-if="totalCount && count < totalCount"
            @click="emit('selectAll')"
            class="text-text-secondary hover:text-text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
            :title="$t('batchAction.selectAll')">
      <CheckSquare :size="14" />
    </button>
    <button @click="emit('deselectAll')"
            class="text-text-secondary hover:text-text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
            :title="$t('batchAction.deselectAll')">
      <Square :size="14" />
    </button>

    <div class="w-px h-5 bg-white/5"></div>

    <!-- 清除选择 -->
    <button @click="emit('clear')"
            class="text-[11px] text-text-muted hover:text-text-primary transition-colors px-2 py-0.5 rounded hover:bg-bg-hover">
      {{ $t('batchAction.clearSelection') }}
    </button>
  </div>
</template>

<style scoped>
.animate-slide-down {
  animation: slideDown 0.15s ease-out;
}
@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
