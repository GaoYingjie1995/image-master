<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import PhotoItem from './PhotoItem.vue'
import { useSelectionStore } from '../../stores/selection'
import { useVirtualGrid } from '../../composables/useVirtualGrid'
import type { Photo } from '../../stores/photos'

const props = defineProps<{
  photos: Photo[]
  hasMore?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  (e: 'preview', index: number): void
  (e: 'rate', id: number, rating: number): void
  (e: 'loadMore'): void
  (e: 'contextmenu', event: MouseEvent, photo: Photo): void
}>()

const selection = useSelectionStore()
const containerRef = ref<HTMLElement | null>(null)

const { columns, getVisibleRange, rowHeightWithGap } = useVirtualGrid({
  containerRef,
  itemMinWidth: 160,
  gap: 6,
  rowHeight: 176
})

// 滚动到底部时触发加载更多
function handleScroll() {
  const el = containerRef.value
  if (!el || !props.hasMore || props.loadingMore) return
  // 距离底部 300px 时触发预加载
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
    emit('loadMore')
  }
}

onMounted(() => {
  containerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
})
onUnmounted(() => {
  containerRef.value?.removeEventListener('scroll', handleScroll)
})

function handleClick(index: number, event: MouseEvent) {
  const photo = props.photos[index]
  if (event.ctrlKey || event.metaKey) {
    selection.toggle(photo.id)
  } else if (event.shiftKey && selection.lastSelectedId) {
    selection.selectRange(selection.lastSelectedId, photo.id, props.photos.map(p => p.id))
  } else {
    emit('preview', index)
  }
}

interface DateGroup { label: string; photos: Photo[]; startIndex: number }

const dateGroups = computed(() => {
  const groups: DateGroup[] = []
  const map = new Map<string, { photos: Photo[]; startIndex: number }>()

  for (let i = 0; i < props.photos.length; i++) {
    const photo = props.photos[i]
    const date = photo.shot_at?.split('T')[0] || photo.created_at?.split('T')[0] || '未知日期'
    if (!map.has(date)) {
      map.set(date, { photos: [], startIndex: i })
    }
    map.get(date)!.photos.push(photo)
  }

  for (const [date, data] of map) {
    groups.push({ label: date, photos: data.photos, startIndex: data.startIndex })
  }

  return groups
})

// 计算每个日期组在网格中的行数
const groupRowInfo = computed(() => {
  const cols = columns.value
  return dateGroups.value.map(group => {
    const photoRows = Math.ceil(group.photos.length / cols)
    // 标题行约 30px + 间距 10px = 40px，每行照片 rowHeight + gap
    const headerHeight = 40
    const totalHeight = headerHeight + photoRows * rowHeightWithGap.value
    return { ...group, photoRows, headerHeight, totalHeight }
  })
})

// 计算总高度用于滚动占位
const totalContentHeight = computed(() => {
  return groupRowInfo.value.reduce((sum, g) => sum + g.totalHeight, 0)
})

// 虚拟化：只渲染可见的日期组
const visibleGroups = computed(() => {
  const container = containerRef.value
  if (!container) return groupRowInfo.value

  const { startRow, endRow } = getVisibleRange(Math.ceil(totalContentHeight.value / rowHeightWithGap.value))
  const startPx = startRow * rowHeightWithGap.value
  const endPx = endRow * rowHeightWithGap.value

  const result: typeof groupRowInfo.value = []
  let offset = 0

  for (const group of groupRowInfo.value) {
    const groupEnd = offset + group.totalHeight
    // 组与可见区域有交集
    if (groupEnd > startPx && offset < endPx) {
      result.push(group)
    }
    offset = groupEnd
  }

  return result
})

// 计算可见组的偏移量
function getGroupOffset(groupLabel: string): number {
  let offset = 0
  for (const group of groupRowInfo.value) {
    if (group.label === groupLabel) return offset
    offset += group.totalHeight
  }
  return offset
}
</script>

<template>
  <div ref="containerRef" class="flex-1 overflow-y-auto p-4">
    <div :style="{ minHeight: totalContentHeight + 'px', position: 'relative' }">
      <div v-for="group in visibleGroups" :key="group.label"
           :style="{ position: 'absolute', top: getGroupOffset(group.label) + 'px', left: 0, right: 0 }">
        <div class="flex items-center gap-3 mb-2.5">
          <span class="text-[11px] font-medium text-text-muted uppercase tracking-[1.5px]">{{ group.label }}</span>
          <span class="text-[10px] text-text-muted">· {{ group.photos.length }} 张</span>
          <div class="flex-1 h-px bg-white/5"></div>
        </div>
        <div class="grid gap-1.5" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
          <PhotoItem v-for="(photo, idx) in group.photos" :key="photo.id"
                     :photo="photo"
                     :selected="selection.selectedIds.has(photo.id)"
                     @click="handleClick(group.startIndex + idx, $event)"
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
