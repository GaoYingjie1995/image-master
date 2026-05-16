<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RatingStars from '../common/RatingStars.vue'

const props = defineProps<{
  photo: {
    id: number
    file_name: string
    file_size: number
    format: string
    rating: number
    camera_model?: string | null
    lens_model?: string | null
    is_rejected: number
  }
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
  (e: 'rate', rating: number): void
}>()

const thumbUrl = ref<string>('')

onMounted(async () => {
  if (window.electronAPI) {
    const path = await window.electronAPI.photos.getThumbnail(props.photo.id)
    if (path) thumbUrl.value = `file://${path}`
  }
})

const isRaw = props.photo.format === 'raw'
</script>

<template>
  <div class="aspect-square bg-bg-tertiary rounded-lg overflow-hidden cursor-pointer relative group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
       @click="emit('click', $event)">
    <div class="w-full h-full flex items-center justify-center relative overflow-hidden">
      <img v-if="thumbUrl" :src="thumbUrl" class="w-full h-full object-cover" loading="lazy" />
      <div v-else class="flex flex-col items-center justify-center gap-1.5">
        <span class="text-2xl opacity-20">◈</span>
        <span class="text-[10px] text-text-muted tracking-wider">{{ photo.file_name.split('.')[0] }}</span>
      </div>

      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
        <span class="text-[11px] font-medium text-white truncate">{{ photo.file_name }}</span>
        <span class="text-[10px] text-white/60 mt-0.5">{{ photo.camera_model }} {{ photo.lens_model ? '· ' + photo.lens_model : '' }}</span>
      </div>

      <div class="absolute top-2 left-2" v-if="photo.rating > 0">
        <RatingStars :rating="photo.rating" size="sm" @rate="emit('rate', $event)" />
      </div>

      <span v-if="isRaw" class="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent">RAW</span>
      <span v-if="photo.is_rejected" class="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">拒绝</span>

      <div class="absolute top-2 left-2 w-5 h-5 border-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm"
           :class="selected ? 'bg-accent border-accent opacity-100' : 'border-white/30 bg-black/30'"
           @click.stop="emit('click', $event)">
        <span v-if="selected" class="text-[11px] text-bg-deep font-semibold">✓</span>
      </div>
    </div>
  </div>
</template>
