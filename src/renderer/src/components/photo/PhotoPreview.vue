<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKeyboard } from '../../composables/useKeyboard'
import RatingStars from '../common/RatingStars.vue'
import ExifPanel from './ExifPanel.vue'
import { createLocalFileUrl } from '@shared/local-protocol'

const { t } = useI18n()
import Histogram from './Histogram.vue'
import type { Photo } from '../../stores/photos'

const props = defineProps<{
  photo: Photo | null
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'rate', rating: number): void
  (e: 'colorLabel', label: string | null): void
  (e: 'reject'): void
}>()

const imageUrl = ref('')
const showHistogram = ref(false)
const showExif = ref(false)
const zoom = ref(1) // 1 = fit, >1 = zoomed
const panX = ref(0)
const panY = ref(0)
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

watch(() => props.photo, (photo) => {
  if (photo) {
    imageUrl.value = createLocalFileUrl('local-photo', photo.file_path)
    resetZoom()
  }
}, { immediate: true })

watch(() => props.visible, (v) => {
  if (v) resetZoom()
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
  panX.value = e.clientX - panStartX
  panY.value = e.clientY - panStartY
}

function handlePanEnd() {
  isPanning = false
}

// 使用 useKeyboard 接管可配置快捷键
const { getBindings } = useKeyboard({
  close: () => props.visible && emit('close'),
  prev: () => props.visible && emit('prev'),
  next: () => props.visible && emit('next'),
  rate1: () => props.visible && emit('rate', 1),
  rate2: () => props.visible && emit('rate', 2),
  rate3: () => props.visible && emit('rate', 3),
  rate4: () => props.visible && emit('rate', 4),
  rate5: () => props.visible && emit('rate', 5),
  reject: () => props.visible && emit('reject'),
  histogram: () => props.visible && (showHistogram.value = !showHistogram.value)
})

// 非配置快捷键：颜色标签、缩放、清除评分
function handleExtraKeys(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.key === '0') emit('rate', 0)
  if (e.key === '6') emit('colorLabel', 'red')
  if (e.key === '7') emit('colorLabel', 'yellow')
  if (e.key === '8') emit('colorLabel', 'green')
  if (e.key === '9') emit('colorLabel', 'blue')
  if (e.key === '+' || e.key === '=') zoom.value = Math.min(10, zoom.value * 1.25)
  if (e.key === '-') zoom.value = Math.max(0.1, zoom.value / 1.25)
  if (e.key === 'z' || e.key === 'Z') {
    if (zoom.value !== 1) {
      resetZoom()
    } else {
      zoom.value = 2
    }
  }
  if (e.key === 'i' || e.key === 'I') showExif.value = !showExif.value
}

onMounted(() => {
  window.addEventListener('keydown', handleExtraKeys)
  window.addEventListener('mouseup', handlePanEnd)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleExtraKeys)
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
                @click="emit('prev')"
                :aria-label="$t('preview.prev')">&#8249;</button>

        <div class="max-w-[80vw] max-h-[80vh] relative select-none"
             :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }">
          <img v-if="imageUrl" :src="imageUrl" class="max-w-full max-h-[80vh] object-contain rounded-lg pointer-events-none" :alt="photo?.file_name" draggable="false" />
        </div>

        <button class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors text-xl"
                @click="emit('next')"
                :aria-label="$t('preview.next')">&#8250;</button>

        <!-- 直方图面板 -->
        <Transition name="fade">
          <div v-if="showHistogram" class="absolute top-4 right-4 w-64 bg-bg-primary/90 backdrop-blur-sm rounded-lg p-3 border border-white/5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-text-muted">{{ $t('preview.histogram') }} (H)</span>
              <button @click="showHistogram = false" class="text-xs text-text-muted hover:text-text-primary" :aria-label="$t('preview.close')">&#10005;</button>
            </div>
            <Histogram :photo-id="photo.id" />
          </div>
        </Transition>

        <!-- EXIF 信息面板 -->
        <ExifPanel :photo="photo" :visible="showExif" />

        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-bg-primary/80 backdrop-blur-md rounded-xl px-6 py-3 border border-white/5">
          <RatingStars :rating="photo.rating" @rate="emit('rate', $event)" />
          <!-- 颜色标签选择 -->
          <div class="flex items-center gap-1">
            <button v-for="cl in COLOR_LABELS" :key="cl.key"
                    @click="emit('colorLabel', photo.color_label === cl.key ? null : cl.key)"
                    class="w-3.5 h-3.5 rounded-full transition-transform hover:scale-125"
                    :class="photo.color_label === cl.key ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-bg-primary' : 'opacity-50 hover:opacity-100'"
                    :style="{ backgroundColor: cl.color }"
                    :title="cl.label + ' (' + (cl.key === 'red' ? '6' : cl.key === 'yellow' ? '7' : cl.key === 'green' ? '8' : '9') + ')'"></button>
          </div>
          <div class="text-[11px] text-text-muted">
            {{ photo.file_name }}
            <template v-if="photo.camera_model"> · {{ photo.camera_model }}</template>
            <template v-if="photo.aperture"> · f/{{ photo.aperture }}</template>
            <template v-if="photo.shutter_speed"> · {{ photo.shutter_speed }}</template>
            <template v-if="photo.iso"> · ISO {{ photo.iso }}</template>
          </div>
          <button @click="showHistogram = !showHistogram"
                  class="text-xs text-text-muted hover:text-accent transition-colors"
                  :title="$t('preview.histogram') + ' (H)'">
            ◉
          </button>
          <button @click="showExif = !showExif"
                  class="text-xs text-text-muted hover:text-accent transition-colors"
                  :title="$t('exif.title') + ' (I)'">
            ℹ
          </button>
          <!-- 缩放控制 -->
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
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
