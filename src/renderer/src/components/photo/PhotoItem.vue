<script setup lang="ts">
import PolaroidCard from './PolaroidCard.vue'
import RatingStars from '../common/RatingStars.vue'
import { COLOR_MAP } from '@renderer/utils/format'

const props = defineProps<{
  photo: {
    id: number
    file_path: string
    file_name: string
    file_size: number
    format: string
    rating: number
    color_label: string | null
    camera_model?: string | null
    lens_model?: string | null
    is_rejected: number
    shot_at?: string | null
  }
  selected: boolean
  selectedIds?: Set<number>
  thumbUrl?: string
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
  (e: 'rate', rating: number): void
  (e: 'contextmenu', event: MouseEvent): void
}>()

function handleDragStart(e: DragEvent) {
  const ids = (props.selectedIds && props.selectedIds.size > 0 && props.selectedIds.has(props.photo.id))
    ? Array.from(props.selectedIds)
    : [props.photo.id]
  e.dataTransfer?.setData('application/photo-ids', JSON.stringify(ids))
  e.dataTransfer!.effectAllowed = 'copy'
}

const isRaw = props.photo.format === 'raw'

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
</script>

<template>
  <div
    draggable="true"
    @dragstart="handleDragStart"
    @click="emit('click', $event)"
    @contextmenu.prevent="emit('contextmenu', $event)"
  >
    <PolaroidCard
      :photo-id="photo.id"
      variant="grid"
      :selected="selected"
      :film-sim="photo.camera_model?.includes('Fujifilm') || photo.camera_model?.includes('FUJI') ? 'Classic Chrome' : undefined"
      :show-badge="!!(photo.camera_model?.includes('Fujifilm') || photo.camera_model?.includes('FUJI'))"
      interactive
    >
      <!-- 图片内容 -->
      <template #default>
        <div class="w-full h-full relative">
          <img
            v-if="thumbUrl"
            :src="thumbUrl"
            class="w-full h-full object-cover transition-opacity duration-300"
            loading="lazy"
            :alt="photo.file_name"
          />
          <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 bg-bg-tertiary animate-pulse">
            <span class="text-2xl opacity-20">◈</span>
            <span class="text-[10px] text-text-muted tracking-wider truncate max-w-[90%] px-1">{{ photo.file_name.split('.')[0] }}</span>
          </div>

          <!-- Hover 信息覆层 -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
            <span class="text-[11px] font-medium text-white truncate">{{ photo.file_name }}</span>
            <span class="text-[10px] text-white/60 mt-0.5">{{ photo.camera_model }} {{ photo.lens_model ? '· ' + photo.lens_model : '' }}</span>
          </div>

          <!-- 评分星星 -->
          <div class="absolute top-1 left-1" v-if="photo.rating > 0">
            <RatingStars :rating="photo.rating" size="sm" @rate="emit('rate', $event)" />
          </div>

          <!-- RAW / 拒绝 badge -->
          <span v-if="isRaw" class="absolute bottom-1 right-1 text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-black/50 text-fuji-warm tracking-wider">RAW</span>
          <span v-if="photo.is_rejected" class="absolute bottom-1 right-1 text-[9px] font-medium px-1 py-0.5 rounded bg-red-500/30 text-red-300">拒绝</span>

          <!-- 颜色标签边框 -->
          <div v-if="photo.color_label && COLOR_MAP[photo.color_label]"
               class="absolute inset-0 rounded-sm pointer-events-none"
               :style="{ boxShadow: `inset 0 0 0 2px ${COLOR_MAP[photo.color_label]}` }" />
        </div>
      </template>
    </PolaroidCard>
  </div>
</template>
