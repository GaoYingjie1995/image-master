<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  sortBy: string
  totalCount: number
}>()

const emit = defineEmits<{
  (e: 'sort', value: string): void
  (e: 'search', value: string): void
}>()

const searchInput = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('search', val)
  }, 300)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="h-11 bg-bg-secondary border-b border-border-subtle flex items-center px-4 gap-3">
    <div class="flex gap-0.5">
      <button v-for="opt in [{ value: 'date', labelKey: 'toolbar.date' }, { value: 'size', labelKey: 'toolbar.size' }, { value: 'rating', labelKey: 'toolbar.rating' }]" :key="opt.value"
              @click="$emit('sort', opt.value)"
              class="px-2.5 py-1 text-xs rounded-md transition-colors"
              :class="sortBy === opt.value ? 'bg-fuji-warm-dim text-fuji-warm' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        {{ $t(opt.labelKey) }}
      </button>
    </div>
    <div class="w-px h-5 bg-border-subtle mx-1.5"></div>
    <div class="flex-1"></div>
    <div class="flex items-center gap-1.5 bg-bg-tertiary border border-border-subtle rounded-md px-2.5 py-1 w-48 focus-within:border-fuji-warm/30 focus-within:bg-bg-hover transition-colors">
      <Search :size="14" class="text-text-muted" />
      <input v-model="searchInput" type="text" :placeholder="$t('toolbar.search')"
             class="bg-transparent text-text-primary text-xs outline-none w-full placeholder:text-text-muted" />
    </div>
    <span class="text-[11px] text-text-muted">{{ $t('toolbar.photos', { count: totalCount.toLocaleString() }) }}</span>
  </div>
</template>
