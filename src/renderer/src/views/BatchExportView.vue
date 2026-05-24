<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhotosStore } from '../stores/photos'
import { useSelectionStore } from '../stores/selection'
import { useToastStore } from '../stores/toast'

const { t } = useI18n()

const photosStore = usePhotosStore()
const selection = useSelectionStore()
const toast = useToastStore()

const outputDir = ref('')
const format = ref<'jpeg' | 'png' | 'webp' | 'tiff'>('jpeg')
const quality = ref(85)
const maxWidth = ref<number | undefined>(undefined)
const maxHeight = ref<number | undefined>(undefined)
const keepExif = ref(true)
const processing = ref(false)
const progress = ref({ current: 0, total: 0 })

let progressCleanup: (() => void) | null = null

const formats = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'tiff', label: 'TIFF' }
]

const selectedCount = computed(() => selection.count > 0 ? selection.count : photosStore.totalCount)

async function selectOutputDir() {
  if (window.electronAPI) {
    outputDir.value = await window.electronAPI.photos.selectExportDir() || ''
  }
}

async function handleExport() {
  if (!outputDir.value || !window.electronAPI) return
  processing.value = true
  progress.value = { current: 0, total: 0 }

  if (progressCleanup) {
    progressCleanup()
    progressCleanup = null
  }
  progressCleanup = window.electronAPI.photos.onExportProgress((data) => {
    progress.value = data
  })

  try {
    let ids: number[]
    if (selection.count > 0) {
      ids = photosStore.photos.filter(p => selection.selectedIds.has(p.id)).map(p => p.id)
    } else {
      ids = await window.electronAPI!.photos.getIdsByFilter({
        filter: photosStore.currentFilter || undefined,
        search: photosStore.searchQuery || undefined,
        albumId: photosStore.currentAlbumId || undefined
      })
    }

    await window.electronAPI.photos.batchExport(ids, {
      outputDir: outputDir.value,
      format: format.value,
      quality: quality.value,
      maxWidth: maxWidth.value,
      maxHeight: maxHeight.value,
      keepExif: keepExif.value
    })
    toast.success(t('toast.exportSuccess'))
  } catch (err) {
    toast.error(t('toast.exportFailed'))
  } finally {
    processing.value = false
  }
}

onUnmounted(() => {
  if (progressCleanup) {
    progressCleanup()
    progressCleanup = null
  }
})
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-hand text-xl text-fuji-warm mb-6">{{ $t('batchExport.title') }}</h2>

    <div class="max-w-2xl space-y-6">
      <!-- 输出目录 -->
      <div class="bg-bg-secondary rounded-xl border border-border-subtle p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('batchExport.outputDir') }}</h3>
        <button @click="selectOutputDir"
                class="w-full text-left px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
          {{ outputDir || $t('batchExport.selectDir') }}
        </button>
      </div>

      <!-- 格式和质量 -->
      <div class="bg-bg-secondary rounded-xl border border-border-subtle p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('batchExport.settings') }}</h3>
        <div class="space-y-4">
          <div>
            <label class="text-xs text-text-secondary block mb-1.5">{{ $t('batchExport.format') }}</label>
            <div class="flex gap-2">
              <button v-for="f in formats" :key="f.value"
                      @click="format = f.value as any"
                      class="px-3 py-1.5 text-xs rounded-lg transition-colors font-mono"
                      :class="format === f.value ? 'bg-fuji-warm-dim text-fuji-warm' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'">
                {{ f.label }}
              </button>
            </div>
          </div>

          <div v-if="format === 'jpeg' || format === 'webp'">
            <label class="text-xs text-text-secondary block mb-1.5">{{ $t('batchExport.quality', { value: quality }) }}</label>
            <input v-model.number="quality" type="range" min="1" max="100"
                   class="w-full accent-fuji-warm" />
          </div>

          <div class="flex gap-4">
            <div>
              <label class="text-xs text-text-secondary block mb-1.5">{{ $t('batchExport.maxWidth') }}</label>
              <input v-model.number="maxWidth" type="number" placeholder="不限"
                     class="w-32 bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-fuji-warm/30" />
            </div>
            <div>
              <label class="text-xs text-text-secondary block mb-1.5">{{ $t('batchExport.maxHeight') }}</label>
              <input v-model.number="maxHeight" type="number" placeholder="不限"
                     class="w-32 bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-fuji-warm/30" />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="keepExif" type="checkbox" class="accent-fuji-warm" />
            <span class="text-sm text-text-secondary">{{ $t('batchExport.keepExif') }}</span>
          </label>
        </div>
      </div>

      <!-- 导出数量 -->
      <div class="text-sm text-text-muted">
        {{ $t('batchExport.willExport', { count: selectedCount }) }}
      </div>

      <!-- 进度 -->
      <div v-if="processing" class="mb-2">
        <div class="text-xs text-text-muted mb-1 font-mono">{{ progress.current }} / {{ progress.total }}</div>
        <div class="h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div class="h-full bg-fuji-warm rounded-full transition-all"
               :style="{ width: (progress.total > 0 ? progress.current / progress.total * 100 : 0) + '%' }"></div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <button @click="handleExport" :disabled="processing || !outputDir"
              class="px-6 py-2.5 text-sm rounded-lg bg-fuji-warm/10 text-fuji-warm hover:bg-fuji-warm/20 transition-colors disabled:opacity-50">
        {{ processing ? $t('batchExport.processing') : $t('batchExport.execute') }}
      </button>
    </div>
  </div>
</template>
