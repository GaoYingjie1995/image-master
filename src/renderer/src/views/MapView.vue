<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { createLocalFileUrl } from '@shared/local-protocol'

const { t } = useI18n()

interface GpsPhoto {
  id: number
  file_name: string
  file_path: string
  gps_lat: number
  gps_lng: number
  camera_model: string | null
  shot_at: string | null
}

const mapContainer = ref<HTMLElement | null>(null)
const loading = ref(true)
const photoCount = ref(0)
const dateFrom = ref('')
const dateTo = ref('')
let map: L.Map | null = null
let currentCluster: any = null

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

onMounted(async () => {
  await nextTick()
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView([35.8617, 104.1954], 4)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

  await loadPhotos()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

async function loadPhotos() {
  if (!window.electronAPI || !map) return
  loading.value = true

  // 清除旧的标记簇
  if (currentCluster) {
    map.removeLayer(currentCluster)
    currentCluster = null
  }

  try {
    const photos = (await window.electronAPI.photos.getWithGps({
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    })) as GpsPhoto[]
    photoCount.value = photos.length

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      chunkedLoading: true
    })

    for (const photo of photos) {
      const marker = L.marker([photo.gps_lat, photo.gps_lng])
      const dateStr = photo.shot_at ? new Date(photo.shot_at).toLocaleDateString('zh-CN') : ''
      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="width:100%;height:120px;background:#1a1a1a;border-radius:4px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img src="" data-photo-id="${photo.id}" style="max-width:100%;max-height:100%;object-fit:contain" alt="${escapeHtml(photo.file_name)}" />
          </div>
          <div style="font-weight:500;margin-bottom:4px;font-size:13px">${escapeHtml(photo.file_name)}</div>
          ${photo.camera_model ? `<div style="font-size:11px;color:#999">${escapeHtml(photo.camera_model)}</div>` : ''}
          ${dateStr ? `<div style="font-size:11px;color:#999">${escapeHtml(dateStr)}</div>` : ''}
          <div style="margin-top:8px;display:flex;gap:6px">
            <button onclick="window.__mapShowInFolder('${escapeHtml(photo.file_path)}')" style="padding:3px 8px;font-size:11px;background:#d4a574;color:#000;border:none;border-radius:4px;cursor:pointer">
              ${t('map.showInFolder')}
            </button>
          </div>
        </div>
      `)
      // popup 打开时加载缩略图
      marker.on('popupopen', async () => {
        const el = document.querySelector(`[data-photo-id="${photo.id}"]`) as HTMLImageElement
        if (el && window.electronAPI) {
          const path = await window.electronAPI.photos.getThumbnail(photo.id)
          if (path) el.src = createLocalFileUrl('local-thumbnail', path)
        }
      })
      cluster.addLayer(marker)
    }

    currentCluster = cluster
    map.addLayer(cluster)

    if (photos.length > 0) {
      const bounds = L.latLngBounds(photos.map(p => [p.gps_lat, p.gps_lng] as [number, number]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  } catch (err) {
    console.error('加载GPS数据失败:', err)
  } finally {
    loading.value = false
  }
}

// 全局函数供 popup 按钮调用
if (typeof window !== 'undefined') {
  (window as any).__mapShowInFolder = (filePath: string) => {
    window.electronAPI?.photos.showInFolder(filePath)
  }
}

function applyFilter() {
  loadPhotos()
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <div class="absolute top-4 left-4 z-[1000] bg-bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/5 flex items-center gap-3">
      <span class="text-xs text-text-muted">
        <span v-if="loading">{{ $t('map.loading') }}</span>
        <span v-else>{{ $t('map.photosWithGps', { count: photoCount }) }}</span>
      </span>
      <div class="w-px h-4 bg-white/10"></div>
      <input v-model="dateFrom" type="date" :placeholder="$t('map.dateFrom')"
             class="bg-bg-tertiary border border-white/5 rounded px-2 py-1 text-xs text-text-primary outline-none w-32" />
      <span class="text-xs text-text-muted">-</span>
      <input v-model="dateTo" type="date" :placeholder="$t('map.dateTo')"
             class="bg-bg-tertiary border border-white/5 rounded px-2 py-1 text-xs text-text-primary outline-none w-32" />
      <button @click="applyFilter"
              class="px-2.5 py-1 text-xs rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
        {{ $t('map.filter') }}
      </button>
    </div>
    <div ref="mapContainer" class="flex-1"></div>
  </div>
</template>

<style scoped>
:deep(.leaflet-container) {
  background: #08080a;
}
</style>
