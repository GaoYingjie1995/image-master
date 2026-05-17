<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ photoId: number | null }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(false)

interface HistogramData {
  r: number[]
  g: number[]
  b: number[]
  luminance: number[]
  shadowClip: number
  highlightClip: number
}

const histogramData = ref<HistogramData | null>(null)

watch(() => props.photoId, async (id) => {
  if (id && window.electronAPI) {
    loading.value = true
    try {
      histogramData.value = (await window.electronAPI.photos.getHistogram(id)) as HistogramData | null
      await nextTick()
      drawHistogram()
    } catch {
      histogramData.value = null
    } finally {
      loading.value = false
    }
  }
}, { immediate: true })

function drawHistogram() {
  const canvas = canvasRef.value
  const data = histogramData.value
  if (!canvas || !data) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  const maxVal = Math.max(
    ...data.r.slice(1, 255),
    ...data.g.slice(1, 255),
    ...data.b.slice(1, 255)
  )

  if (maxVal === 0) return

  function drawChannel(values: number[], color: string) {
    ctx!.beginPath()
    ctx!.moveTo(0, h)
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * w
      const y = h - (values[i] / maxVal) * h * 0.9
      ctx!.lineTo(x, y)
    }
    ctx!.lineTo(w, h)
    ctx!.closePath()
    ctx!.fillStyle = color
    ctx!.fill()
  }

  drawChannel(data.r, 'rgba(255, 60, 60, 0.4)')
  drawChannel(data.g, 'rgba(60, 255, 60, 0.4)')
  drawChannel(data.b, 'rgba(60, 60, 255, 0.4)')

  // 亮度通道
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * w
    const y = h - (data.luminance[i] / maxVal) * h * 0.9
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.fill()
}
</script>

<template>
  <div class="relative">
    <div v-if="loading" class="flex items-center justify-center h-24 text-xs text-text-muted">
      {{ $t('photos.loading') }}
    </div>
    <template v-else>
      <canvas ref="canvasRef" :width="256" :height="96" class="w-full h-24 rounded bg-bg-deep/50"></canvas>
      <!-- 曝光裁切提示 -->
      <div v-if="histogramData" class="flex items-center justify-between mt-1.5">
        <span v-if="histogramData.shadowClip > 0.01"
              class="text-[10px] text-blue-400 flex items-center gap-0.5">
          ◀ {{ $t('histogram.shadowClip', { value: (histogramData.shadowClip * 100).toFixed(1) }) }}
        </span>
        <span v-else class="text-[10px] text-text-muted">{{ $t('histogram.shadowNormal') }}</span>
        <span v-if="histogramData.highlightClip > 0.01"
              class="text-[10px] text-red-400 flex items-center gap-0.5">
          {{ $t('histogram.highlightClip', { value: (histogramData.highlightClip * 100).toFixed(1) }) }} ▶
        </span>
        <span v-else class="text-[10px] text-text-muted">{{ $t('histogram.highlightNormal') }}</span>
      </div>
    </template>
  </div>
</template>
