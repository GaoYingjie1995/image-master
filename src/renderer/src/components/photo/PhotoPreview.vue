<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import RatingStars from '../common/RatingStars.vue'
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
}>()

const imageUrl = ref('')

watch(() => props.photo, (photo) => {
  if (photo) {
    imageUrl.value = `file://${photo.file_path}`
  }
}, { immediate: true })

function handleKeydown(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
  if (e.key >= '1' && e.key <= '5') emit('rate', parseInt(e.key))
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible && photo" class="fixed inset-0 z-50 bg-bg-deep/95 backdrop-blur-sm flex items-center justify-center"
           @click.self="emit('close')">
        <button class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors text-xl"
                @click="emit('prev')">‹</button>

        <div class="max-w-[80vw] max-h-[80vh] relative">
          <img v-if="imageUrl" :src="imageUrl" class="max-w-full max-h-[80vh] object-contain rounded-lg" />
        </div>

        <button class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors text-xl"
                @click="emit('next')">›</button>

        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-bg-primary/80 backdrop-blur-md rounded-xl px-6 py-3 border border-white/5">
          <RatingStars :rating="photo.rating" @rate="emit('rate', $event)" />
          <div class="text-[11px] text-text-muted">
            {{ photo.file_name }}
            <template v-if="photo.camera_model"> · {{ photo.camera_model }}</template>
            <template v-if="photo.aperture"> · f/{{ photo.aperture }}</template>
            <template v-if="photo.shutter_speed"> · {{ photo.shutter_speed }}</template>
            <template v-if="photo.iso"> · ISO {{ photo.iso }}</template>
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
