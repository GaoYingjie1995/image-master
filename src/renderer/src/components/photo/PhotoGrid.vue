<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PhotoItem from './PhotoItem.vue'
import { useSelectionStore } from '../../stores/selection'
import type { Photo } from '../../stores/photos'

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

const ITEM_MIN_WIDTH = 160
const GRID_GAP = 6
const CONTAINER_PADDING_X = 32
const HEADER_HEIGHT = 24
const HEADER_MARGIN_BOTTOM = 10
const GROUP_MARGIN_BOTTOM = 16
const OVERSCAN_PX = 600

const contentWidth = computed(() => Math.max(0, containerWidth.value - CONTAINER_PADDING_X))
const columns = computed(() => {
  const w = contentWidth.value || 1200
  return Math.max(1, Math.floor((w + GRID_GAP) / (ITEM_MIN_WIDTH + GRID_GAP)))
})
const itemSize = computed(() => {
  const cols = columns.value
  const w = contentWidth.value || cols * ITEM_MIN_WIDTH + (cols - 1) * GRID_GAP
  return (w - GRID_GAP * (cols - 1)) / cols
})

// 滚动到底部时触发加载更多
function handleScroll() {
  const el = containerRef.value
  if (!el) return
  scrollTop.value = el.scrollTop

  if (!props.hasMore || props.loadingMore) return
  // 距离底部 300px 时触发预加载
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
    emit('loadMore')
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

interface DateGroup { label: string; photos: Photo[] }

const dateGroups = computed(() => {
  const groups: DateGroup[] = []
  const map = new Map<string, Photo[]>()

  for (const photo of props.photos) {
    const date = photo.shot_at?.split('T')[0] || photo.created_at?.split('T')[0] || '未知日期'
    if (!map.has(date)) {
      map.set(date, [])
    }
    map.get(date)!.push(photo)
  }

  for (const [date, photos] of map) {
    groups.push({ label: date, photos })
  }

  return groups
})

interface GroupLayout extends DateGroup {
  offsetTop: number
  totalHeight: number
}

const groupLayouts = computed<GroupLayout[]>(() => {
  const layouts: GroupLayout[] = []
  let offset = 0

  for (const group of dateGroups.value) {
    const photoRows = Math.ceil(group.photos.length / columns.value)
    const photosHeight = photoRows > 0
      ? photoRows * itemSize.value + (photoRows - 1) * GRID_GAP
      : 0
    const totalHeight = HEADER_HEIGHT + HEADER_MARGIN_BOTTOM + photosHeight + GROUP_MARGIN_BOTTOM

    layouts.push({
      ...group,
      offsetTop: offset,
      totalHeight
    })
    offset += totalHeight
  }

  return layouts
})

const totalContentHeight = computed(() => {
  const layouts = groupLayouts.value
  if (layouts.length === 0) return 0
  const last = layouts[layouts.length - 1]
  return last.offsetTop + last.totalHeight
})

function findFirstVisibleGroup(layouts: GroupLayout[], viewportTop: number): number {
  let left = 0
  let right = layouts.length - 1
  let ans = layouts.length

  while (left <= right) {
    const mid = (left + right) >> 1
    const groupBottom = layouts[mid].offsetTop + layouts[mid].totalHeight
    if (groupBottom >= viewportTop) {
      ans = mid
      right = mid - 1
    } else {
      left = mid + 1
    }
  }

  return ans
}

function findLastVisibleGroup(layouts: GroupLayout[], viewportBottom: number): number {
  let left = 0
  let right = layouts.length - 1
  let ans = -1

  while (left <= right) {
    const mid = (left + right) >> 1
    if (layouts[mid].offsetTop <= viewportBottom) {
      ans = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return ans
}

const visibleGroups = computed(() => {
  const layouts = groupLayouts.value
  if (layouts.length === 0) return layouts
  const viewportTop = Math.max(0, scrollTop.value - OVERSCAN_PX)
  const viewportBottom = scrollTop.value + containerHeight.value + OVERSCAN_PX
  const start = findFirstVisibleGroup(layouts, viewportTop)
  const end = findLastVisibleGroup(layouts, viewportBottom)

  if (start > end || start >= layouts.length || end < 0) return []
  return layouts.slice(start, end + 1)
})
</script>

<template>
  <div ref="containerRef" class="flex-1 overflow-y-auto p-4">
    <div :style="{ height: totalContentHeight + 'px', position: 'relative' }">
      <div v-for="group in visibleGroups" :key="group.label"
           :style="{ position: 'absolute', top: group.offsetTop + 'px', left: 0, right: 0, marginBottom: GROUP_MARGIN_BOTTOM + 'px' }">
        <div class="flex items-center gap-3"
             :style="{ height: HEADER_HEIGHT + 'px', marginBottom: HEADER_MARGIN_BOTTOM + 'px' }">
          <span class="text-[11px] font-medium text-text-muted uppercase tracking-[1.5px]">{{ group.label }}</span>
          <span class="text-[10px] text-text-muted">· {{ group.photos.length }} 张</span>
          <div class="flex-1 h-px bg-white/5"></div>
        </div>
        <div class="grid gap-1.5" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
          <PhotoItem v-for="photo in group.photos" :key="photo.id"
                     :photo="photo"
                     :selected="selection.selectedIds.has(photo.id)"
                     v-memo="[photo.id, selection.selectedIds.has(photo.id), photo.rating, photo.color_label, photo.is_rejected]"
                     @click="handleClick(photo, $event)"
                     @rate="emit('rate', photo.id, $event)"
                     @contextmenu="emit('contextmenu', $event, photo)" />
        </div>
      </div>
    </div>
    <!-- 加载更多提示 -->
    <div v-if="loadingMore" class="flex items-center justify-center py-4 gap-2">
      <div class="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      <span class="text-xs text-text-muted">加载更多...</span>
    </div>
    <div v-else-if="!hasMore && photos.length > 0" class="text-center py-4">
      <span class="text-xs text-text-muted">已加载全部 {{ photos.length }} 张照片</span>
    </div>
  </div>
</template>
