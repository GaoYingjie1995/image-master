<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeyboard } from '../../composables/useKeyboard'
import RatingStars from '../common/RatingStars.vue'
import ExifPanel from './ExifPanel.vue'
import PolaroidCard from './PolaroidCard.vue'
import { createLocalFileUrl } from '@shared/local-protocol'

const { t } = useI18n()
import type { Photo } from '../../stores/photos'

const props = defineProps<{
  photo: Photo | null
  visible: boolean
  photos: Photo[]
  hasMore?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'rate', rating: number): void
  (e: 'colorLabel', label: string | null): void
  (e: 'reject'): void
  (e: 'loadMore'): void
}>()

const imageUrl = ref('')
const imageLoading = ref(false)
const showExif = ref(false)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const keepZoom = ref(false)
let previewRequestToken = 0
let isPanning = false
let panStartX = 0
let panStartY = 0

const COLOR_LABELS = [
  { key: 'red', label: '红', color: '#ef4444' },
  { key: 'yellow', label: '黄', color: '#eab308' },
  { key: 'green', label: '绿', color: '#22c55e' },
  { key: 'blue', label: '蓝', color: '#3b82f6' },
  { key: 'purple', label: '紫', color: '#a855f7' }
]

// 格式化日期用于拍立得标注
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

// 格式化 EXIF 参数
const exifParams = computed(() => {
  if (!props.photo) return ''
  const parts: string[] = []
  if (props.photo.camera_model) parts.push(props.photo.camera_model)
  if (props.photo.aperture) parts.push(`f/${props.photo.aperture}`)
  if (props.photo.shutter_speed) parts.push(props.photo.shutter_speed)
  if (props.photo.iso) parts.push(`ISO ${props.photo.iso}`)
  return parts.join(' · ')
})

// 预加载缓存
const preloadCache = new Map<number, string>()

async function preloadImage(photo: Photo) {
  if (preloadCache.has(photo.id)) return
  try {
    if (photo.format !== 'raw') {
      preloadCache.set(photo.id, createLocalFileUrl('local-photo', photo.file_path))
    } else if (window.electronAPI) {
      const preview = await window.electronAPI.photos.getPreview(photo.id)
      if (preview) {
        preloadCache.set(photo.id, createLocalFileUrl(preview.scheme, preview.path))
      }
    }
  } catch { /* ignore preload errors */ }
}

function preloadAdjacentPhotos() {
  if (!props.photo || props.photos.length === 0) return
  const currentIndex = props.photos.findIndex(p => p.id === props.photo!.id)
  if (currentIndex === -1) return

  for (let i = -2; i <= 2; i++) {
    const targetIndex = currentIndex + i
    if (targetIndex >= 0 && targetIndex < props.photos.length) {
      preloadImage(props.photos[targetIndex])
    }
  }
}

watch(() => props.photo, async (photo) => {
  const requestToken = ++previewRequestToken
  imageUrl.value = ''
  imageLoading.value = true
  if (!photo) {
    imageLoading.value = false
    return
  }

  if (!keepZoom.value) {
    resetZoom()
  }

  const cachedUrl = preloadCache.get(photo.id)
  if (cachedUrl) {
    imageUrl.value = cachedUrl
    imageLoading.value = false
    preloadAdjacentPhotos()
    return
  }

  if (photo.format !== 'raw') {
    imageUrl.value = createLocalFileUrl('local-photo', photo.file_path)
    imageLoading.value = false
    preloadCache.set(photo.id, imageUrl.value)
    preloadAdjacentPhotos()
    return
  }

  try {
    const preview = await window.electronAPI?.photos.getPreview(photo.id)
    if (requestToken !== previewRequestToken || !preview) return
    imageUrl.value = createLocalFileUrl(preview.scheme, preview.path)
    preloadCache.set(photo.id, imageUrl.value)
  } catch {
    if (requestToken !== previewRequestToken) return
    imageUrl.value = createLocalFileUrl('local-photo', photo.file_path)
  } finally {
    imageLoading.value = false
    preloadAdjacentPhotos()
  }
}, { immediate: true })

watch(() => props.visible, (v) => {
  if (v && !keepZoom.value) resetZoom()
})

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function handleWheel(e: WheelEvent) {
  if (!props.visible) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.15 : 0.15
  zoom.value = Math.max(0.1, Math.min(10, zoom.value + delta * zoom.value))
  if (zoom.value <= 1) {
    panX.value = 0
    panY.value = 0
  }
}

function handlePanStart(e: MouseEvent) {
  if (zoom.value <= 1) return
  isPanning = true
  panStartX = e.clientX - panX.value
  panStartY = e.clientY - panY.value
}

function handlePanMove(e: MouseEvent) {
  if (!isPanning) return
  const newPanX = e.clientX - panStartX
  const newPanY = e.clientY - panStartY

  const maxPan = (zoom.value - 1) * 400
  panX.value = Math.max(-maxPan, Math.min(maxPan, newPanX))
  panY.value = Math.max(-maxPan, Math.min(maxPan, newPanY))
}

function handlePanEnd() {
  isPanning = false
}

const { getBindings } = useKeyboard({
  close: () => props.visible && emit('close'),
  prev: () => props.visible && handlePrev(),
  next: () => props.visible && handleNext(),
  rate1: () => props.visible && emit('rate', 1),
  rate2: () => props.visible && emit('rate', 2),
  rate3: () => props.visible && emit('rate', 3),
  rate4: () => props.visible && emit('rate', 4),
  rate5: () => props.visible && emit('rate', 5),
  rate0: () => props.visible && emit('rate', 0),
  reject: () => props.visible && emit('reject'),
  colorRed: () => props.visible && emit('colorLabel', 'red'),
  colorYellow: () => props.visible && emit('colorLabel', 'yellow'),
  colorGreen: () => props.visible && emit('colorLabel', 'green'),
  colorBlue: () => props.visible && emit('colorLabel', 'blue'),
  colorPurple: () => props.visible && emit('colorLabel', 'purple'),
  zoomIn: () => props.visible && (zoom.value = Math.min(10, zoom.value * 1.25)),
  zoomOut: () => props.visible && (zoom.value = Math.max(0.1, zoom.value / 1.25)),
  zoomToggle: () => props.visible && (zoom.value !== 1 ? resetZoom() : zoom.value = 2),
  exifToggle: () => props.visible && (showExif.value = !showExif.value),
  keepZoom: () => props.visible && (keepZoom.value = !keepZoom.value)
})

function handlePrev() {
  emit('prev')
  if (props.photo && props.photos.length > 0) {
    const currentIndex = props.photos.findIndex(p => p.id === props.photo!.id)
    if (currentIndex === 0 && props.hasMore && !props.loadingMore) {
      emit('loadMore')
    }
  }
}

function handleNext() {
  emit('next')
  if (props.photo && props.photos.length > 0) {
    const currentIndex = props.photos.findIndex(p => p.id === props.photo!.id)
    if (currentIndex === props.photos.length - 1 && props.hasMore && !props.loadingMore) {
      emit('loadMore')
    }
  }
}

onMounted(() => {
  window.addEventListener('mouseup', handlePanEnd)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', handlePanEnd)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible && photo" class="fixed inset-0 z-50 bg-bg-deep/95 backdrop-blur-sm flex items-center justify-center overflow-hidden"
           @click.self="emit('close')"
           @wheel.prevent="handleWheel"
           @mousedown="handlePanStart"
           @mousemove="handlePanMove">
        <button class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors text-xl"
                @click="handlePrev"
                :aria-label="$t('preview.prev')">&#8249;</button>

        <!-- 加载状态 -->
        <div v-if="imageLoading" class="flex flex-col items-center gap-3">
          <div class="w-8 h-8 border-2 border-fuji-warm/30 border-t-fuji-warm rounded-full animate-spin"></div>
          <span class="text-sm text-text-muted">正在加载预览...</span>
        </div>

        <!-- 拍立得预览卡片 -->
        <div v-else class="relative select-none animate-polaroid-eject"
             :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }">
          <PolaroidCard
            :photo-id="photo.id"
            variant="preview"
            :tilt="0"
            :caption="photo.file_name"
            :date-text="formatDate(photo.shot_at)"
            :show-badge="false"
            :interactive="false"
          >
            <img v-if="imageUrl" :src="imageUrl" class="max-w-full max-h-[70vh] object-contain pointer-events-none" :alt="photo?.file_name" draggable="false" />
          </PolaroidCard>

          <!-- EXIF 参数行（Space Mono 字体） -->
          <div v-if="exifParams" class="mt-3 text-center font-mono text-[11px] text-fuji-chrome tracking-wider">
            {{ exifParams }}
          </div>
        </div>

        <button class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors text-xl"
                @click="handleNext"
                :aria-label="$t('preview.next')">&#8250;</button>

        <!-- EXIF 信息面板 -->
        <ExifPanel :photo="photo" :visible="showExif" />

        <!-- 底部工具栏 -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-bg-primary/80 backdrop-blur-md rounded-xl px-6 py-3 border border-border-film">
          <RatingStars :rating="photo.rating" @rate="emit('rate', $event)" />
          <div class="flex items-center gap-1">
            <button v-for="cl in COLOR_LABELS" :key="cl.key"
                    @click="emit('colorLabel', photo.color_label === cl.key ? null : cl.key)"
                    class="w-3.5 h-3.5 rounded-full transition-transform hover:scale-125"
                    :class="photo.color_label === cl.key ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-bg-primary' : 'opacity-50 hover:opacity-100'"
                    :style="{ backgroundColor: cl.color }"
                    :title="cl.label + ' (' + (cl.key === 'red' ? '6' : cl.key === 'yellow' ? '7' : cl.key === 'green' ? '8' : '9') + ')'"></button>
          </div>
          <div class="text-[11px] text-text-muted font-mono">
            {{ photo.file_name }}
          </div>
          <button @click="showExif = !showExif"
                  class="text-xs text-text-muted hover:text-fuji-warm transition-colors"
                  :title="$t('exif.title') + ' (I)'">
            ℹ
          </button>
          <div class="flex items-center gap-1 ml-2">
            <button @click="zoom = Math.max(0.1, zoom / 1.25)"
                    class="text-xs text-text-muted hover:text-text-primary transition-colors px-1" :title="$t('preview.zoomOut') + ' (-)'">&#8722;</button>
            <span class="text-[10px] text-text-muted w-10 text-center cursor-pointer"
                  @click="resetZoom"
                  :title="zoom === 1 ? $t('preview.zoomIn') + ' 2x' : $t('preview.fitWindow')">
              {{ $t('preview.zoomLevel', { value: Math.round(zoom * 100) }) }}
            </span>
            <button @click="zoom = Math.min(10, zoom * 1.25)"
                    class="text-xs text-text-muted hover:text-text-primary transition-colors px-1" :title="$t('preview.zoomIn') + ' (+)'">+</button>
          </div>
          <button @click="keepZoom = !keepZoom"
                  class="text-xs px-2 py-0.5 rounded transition-colors"
                  :class="keepZoom ? 'bg-fuji-warm/20 text-fuji-warm' : 'text-text-muted hover:text-text-primary'"
                  title="保持缩放级别 (K)">
            {{ keepZoom ? '锁定' : '缩放' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
