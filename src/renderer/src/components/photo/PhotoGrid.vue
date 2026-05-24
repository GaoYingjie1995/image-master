<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import PhotoItem from './PhotoItem.vue'
import { useSelectionStore } from '../../stores/selection'
import { createLocalFileUrl } from '@shared/local-protocol'
import type { Photo } from '../../stores/photos'
import {
  calculateColumns,
  calculateItemSize,
  calculateItemHeight,
  calculateGroupLayouts,
  calculateTotalContentHeight,
  findVisibleItems,
  POLAROID_LAYOUT_CONFIG,
  type PhotoData,
  type DateGroup,
  type PhotoLayout,
  type GroupLayout
} from '../../utils/grid-layout'

// 为 PhotoData 扩展 Photo 类型
interface PhotoWithId extends PhotoData {
  [key: string]: unknown
}

const props = defineProps<{
  photos: Photo[]
  hasMore?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  (e: 'preview', id: number): void
  (e: 'rate', id: number, rating: number): void
  (e: 'loadMore'): void
  (e: 'contextmenu', event: MouseEvent, photo: Photo): void
}>()

const selection = useSelectionStore()
const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)
const containerWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

// LRU 缩略图缓存
const THUMB_CACHE_MAX_SIZE = 5000
const thumbUrlCache = ref<Map<number, string>>(new Map())

function setThumbCache(id: number, url: string) {
  const cache = thumbUrlCache.value
  if (cache.has(id)) {
    cache.delete(id)
  }
  cache.set(id, url)
  if (cache.size > THUMB_CACHE_MAX_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) {
      cache.delete(firstKey)
    }
  }
}

// 拍立得布局配置
const config = POLAROID_LAYOUT_CONFIG
const CONTAINER_PADDING_X = config.containerPaddingX
const OVERSCAN_PX = config.overscanPx

const contentWidth = computed(() => Math.max(0, containerWidth.value - CONTAINER_PADDING_X))
const columns = computed(() => {
  const w = contentWidth.value || 1200
  return calculateColumns(w, config.itemMinWidth, config.gridGap)
})
const itemSize = computed(() => {
  const cols = columns.value
  const w = contentWidth.value || cols * config.itemMinWidth + (cols - 1) * config.gridGap
  return calculateItemSize(w, cols, config.gridGap)
})

// 拍立得卡片高度 = 宽度 + 底栏高度
const itemHeight = computed(() => calculateItemHeight(itemSize.value, config.captionHeight))

// 批量加载缩略图
let loadingThumbIds = new Set<number>()
async function loadThumbnailsForVisible(photos: Photo[]) {
  const idsToLoad = photos
    .filter(p => !thumbUrlCache.value.has(p.id) && !loadingThumbIds.has(p.id))
    .map(p => p.id)

  if (idsToLoad.length === 0) return

  idsToLoad.forEach(id => loadingThumbIds.add(id))

  try {
    if (window.electronAPI) {
      const results = await window.electronAPI.photos.getThumbnails(idsToLoad)
      for (const [idStr, path] of Object.entries(results)) {
        const id = Number(idStr)
        if (path) {
          setThumbCache(id, createLocalFileUrl('local-thumbnail', path as string))
        }
        loadingThumbIds.delete(id)
      }
    }
  } catch {
    idsToLoad.forEach(id => loadingThumbIds.delete(id))
  }
}

watch(() => props.photos, (newPhotos) => {
  if (newPhotos.length > 0) {
    loadThumbnailsForVisible(newPhotos)
  }
}, { immediate: true })

// 滚动到底部时触发加载更多
let loadMoreThrottleTimer: ReturnType<typeof setTimeout> | null = null
function handleScroll() {
  const el = containerRef.value
  if (!el) return
  scrollTop.value = el.scrollTop

  if (!props.hasMore || props.loadingMore) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
    if (loadMoreThrottleTimer) return
    loadMoreThrottleTimer = setTimeout(() => {
      loadMoreThrottleTimer = null
      emit('loadMore')
    }, 200)
  }
}

function syncViewportMetrics() {
  const el = containerRef.value
  if (!el) return
  scrollTop.value = el.scrollTop
  containerHeight.value = el.clientHeight
  containerWidth.value = el.clientWidth
}

onMounted(() => {
  syncViewportMetrics()
  containerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncViewportMetrics()
    })
    resizeObserver.observe(containerRef.value)
  }
})
onUnmounted(() => {
  containerRef.value?.removeEventListener('scroll', handleScroll)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (loadMoreThrottleTimer) {
    clearTimeout(loadMoreThrottleTimer)
  }
})

function handleClick(photo: Photo, event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    selection.toggle(photo.id)
  } else if (event.shiftKey && selection.lastSelectedId) {
    selection.selectRange(selection.lastSelectedId, photo.id, props.photos.map(p => p.id))
  } else {
    emit('preview', photo.id)
  }
}

// 日期分组
const dateGroups = computed(() => {
  const groups: DateGroup<PhotoWithId>[] = []
  const map = new Map<string, PhotoWithId[]>()

  for (const photo of props.photos) {
    const date = photo.shot_at?.split('T')[0] || photo.created_at?.split('T')[0] || '未知日期'
    if (!map.has(date)) {
      map.set(date, [])
    }
    map.get(date)!.push(photo as PhotoWithId)
  }

  let startIndex = 0
  for (const [date, photos] of map) {
    groups.push({ label: date, photos, startIndex })
    startIndex += photos.length
  }

  return groups
})

// 使用 grid-layout 工具函数计算布局
const groupLayouts = computed(() => {
  return calculateGroupLayouts(
    dateGroups.value,
    columns.value,
    itemSize.value,
    itemHeight.value,
    config
  )
})

const totalContentHeight = computed(() => {
  return calculateTotalContentHeight(groupLayouts.value, config.groupGap)
})

// 获取可见的照片
const visibleItems = computed(() => {
  return findVisibleItems(
    groupLayouts.value,
    scrollTop.value,
    containerHeight.value,
    OVERSCAN_PX
  )
})
</script>

<template>
  <div ref="containerRef" class="flex-1 overflow-y-auto p-4">
    <div :style="{ height: totalContentHeight + 'px', position: 'relative' }">
      <!-- 渲染可见的组标题 -->
      <div v-for="group in visibleItems.groups" :key="group.label"
           class="flex items-center gap-3 absolute left-0 right-0"
           :style="{ top: group.headerTop + 'px', height: config.headerHeight + 'px' }">
        <span class="text-[11px] font-medium text-text-muted uppercase tracking-[1.5px] font-hand">{{ group.label }}</span>
        <span class="text-[10px] text-text-muted">· {{ group.photos.length }} 张</span>
        <div class="flex-1 h-px bg-white/5"></div>
      </div>

      <!-- 渲染可见的照片 -->
      <div v-for="photoLayout in visibleItems.photos" :key="photoLayout.photo.id"
           class="absolute"
           :style="{ left: photoLayout.x + 'px', top: photoLayout.y + 'px', width: photoLayout.width + 'px', height: photoLayout.height + 'px' }">
        <PhotoItem
          :photo="photoLayout.photo"
          :selected="selection.selectedIds.has(photoLayout.photo.id)"
          :thumb-url="thumbUrlCache.get(photoLayout.photo.id)"
          v-memo="[photoLayout.photo.id, selection.selectedIds.has(photoLayout.photo.id), photoLayout.photo.rating, photoLayout.photo.color_label, photoLayout.photo.is_rejected, thumbUrlCache.get(photoLayout.photo.id)]"
          @click="handleClick(photoLayout.photo, $event)"
          @rate="emit('rate', photoLayout.photo.id, $event)"
          @contextmenu="emit('contextmenu', $event, photoLayout.photo)" />
      </div>
    </div>

    <!-- 加载更多提示 -->
    <div v-if="loadingMore" class="flex items-center justify-center py-4 gap-2">
      <div class="w-4 h-4 border-2 border-fuji-warm/30 border-t-fuji-warm rounded-full animate-spin"></div>
      <span class="text-xs text-text-muted">加载更多...</span>
    </div>
    <div v-else-if="!hasMore && photos.length > 0" class="text-center py-4">
      <span class="text-xs text-text-muted">已加载全部 {{ photos.length }} 张照片</span>
    </div>
  </div>
</template>
