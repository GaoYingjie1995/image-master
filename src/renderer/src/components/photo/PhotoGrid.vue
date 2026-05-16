<script setup lang="ts">
import { computed } from 'vue'
import PhotoItem from './PhotoItem.vue'
import { useSelectionStore } from '../../stores/selection'
import type { Photo } from '../../stores/photos'

const props = defineProps<{
  photos: Photo[]
}>()

const emit = defineEmits<{
  (e: 'preview', index: number): void
  (e: 'rate', id: number, rating: number): void
}>()

const selection = useSelectionStore()

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
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4">
    <div v-for="group in dateGroups" :key="group.label" class="mb-6">
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
                   @rate="emit('rate', photo.id, $event)" />
      </div>
    </div>
  </div>
</template>
