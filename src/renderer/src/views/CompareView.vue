<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhotosStore } from '../stores/photos'
import { ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { createLocalFileUrl } from '@shared/local-protocol'

const { t } = useI18n()
const router = useRouter()
const photosStore = usePhotosStore()

const selectedLeft = ref<number | null>(null)
const selectedRight = ref<number | null>(null)
const leftThumbUrl = ref('')
const rightThumbUrl = ref('')
const syncZoom = ref(true)
const zoom = ref(1)

const leftPhoto = computed(() => {
  if (!selectedLeft.value) return null
  return photosStore.photos.find(p => p.id === selectedLeft.value) || null
})

const rightPhoto = computed(() => {
  if (!selectedRight.value) return null
  return photosStore.photos.find(p => p.id === selectedRight.value) || null
})

const canCompare = computed(() => leftPhoto.value && rightPhoto.value)

async function loadThumbnail(photoId: number): Promise<string> {
  if (!window.electronAPI) return ''
  const path = await window.electronAPI.photos.getThumbnail(photoId)
  return path ? createLocalFileUrl('local-thumbnail', path) : ''
}

watch(selectedLeft, async (id) => {
  leftThumbUrl.value = id ? await loadThumbnail(id) : ''
})

watch(selectedRight, async (id) => {
  rightThumbUrl.value = id ? await loadThumbnail(id) : ''
})

function selectPhoto(id: number) {
  if (!selectedLeft.value) {
    selectedLeft.value = id
  } else if (!selectedRight.value) {
    selectedRight.value = id
  } else {
    selectedLeft.value = id
    selectedRight.value = null
  }
}

function clearSelection() {
  selectedLeft.value = null
  selectedRight.value = null
  leftThumbUrl.value = ''
  rightThumbUrl.value = ''
}

function handleWheel(e: WheelEvent) {
  if (!syncZoom.value) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoom.value = Math.max(0.1, Math.min(5, zoom.value + delta))
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 顶部工具栏 -->
    <div class="h-10 bg-bg-secondary border-b border-white/5 flex items-center px-4 gap-3">
      <button @click="router.back()" class="text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft :size="16" />
      </button>
      <h2 class="text-sm font-medium text-text-primary">{{ $t('compare.title') }}</h2>
      <div class="flex-1"></div>
      <label class="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
        <input type="checkbox" v-model="syncZoom" class="accent-accent" />
        Sync Zoom
      </label>
      <button v-if="selectedLeft || selectedRight"
              @click="clearSelection"
              class="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-hover">
        Clear
      </button>
    </div>

    <!-- 状态提示 -->
    <div v-if="!canCompare" class="flex-1 flex items-center justify-center">
      <div class="text-center text-text-muted text-sm">
        <p v-if="!selectedLeft">{{ $t('compare.selectFirst') }}</p>
        <p v-else-if="!selectedRight">{{ $t('compare.selectSecond') }}</p>
        <p class="text-xs mt-2 text-text-muted/60">{{ $t('compare.noSelection') }}</p>
      </div>
    </div>

    <!-- 对比视图 -->
    <div v-else class="flex-1 flex overflow-hidden" @wheel="handleWheel">
      <div class="flex-1 relative border-r border-white/5 overflow-hidden flex items-center justify-center bg-bg-deep">
        <img v-if="leftThumbUrl" :src="leftThumbUrl"
             class="max-w-full max-h-full object-contain transition-transform"
             :style="{ transform: `scale(${zoom})` }"
             :alt="leftPhoto!.file_name" />
        <div class="absolute bottom-2 left-2 text-[10px] text-text-muted bg-bg-primary/80 px-2 py-1 rounded">
          {{ leftPhoto!.file_name }}
        </div>
      </div>
      <div class="flex-1 relative overflow-hidden flex items-center justify-center bg-bg-deep">
        <img v-if="rightThumbUrl" :src="rightThumbUrl"
             class="max-w-full max-h-full object-contain transition-transform"
             :style="{ transform: `scale(${zoom})` }"
             :alt="rightPhoto!.file_name" />
        <div class="absolute bottom-2 left-2 text-[10px] text-text-muted bg-bg-primary/80 px-2 py-1 rounded">
          {{ rightPhoto!.file_name }}
        </div>
      </div>
    </div>

    <!-- 底部照片选择器 -->
    <div class="h-16 bg-bg-secondary border-t border-white/5 flex items-center px-4 gap-2 overflow-x-auto">
      <div v-for="photo in photosStore.photos" :key="photo.id"
           @click="selectPhoto(photo.id)"
           class="h-10 px-2 rounded-lg cursor-pointer shrink-0 border-2 transition-all flex items-center text-[10px] max-w-[120px]"
           :class="[
             photo.id === selectedLeft || photo.id === selectedRight
               ? 'border-accent bg-accent/10 text-accent'
               : 'border-transparent bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
           ]">
        <span class="truncate">{{ photo.file_name }}</span>
      </div>
    </div>
  </div>
</template>
