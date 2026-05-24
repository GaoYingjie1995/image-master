<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhotosStore } from '../stores/photos'
import { useSelectionStore } from '../stores/selection'
import Histogram from '../components/photo/Histogram.vue'

const { t } = useI18n()

const photosStore = usePhotosStore()
const selection = useSelectionStore()
const selectedPhotoId = ref<number | null>(null)

onMounted(async () => {
  await photosStore.fetchPhotos()
  if (photosStore.photos.length > 0) {
    selectedPhotoId.value = photosStore.photos[0].id
  }
})

function selectPhoto(id: number) {
  selectedPhotoId.value = id
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">{{ t('histogram.title') }}</h2>

    <div v-if="photosStore.photos.length === 0" class="flex-1 flex items-center justify-center">
      <p class="text-sm text-text-muted">{{ t('histogram.noPhotos') }}</p>
    </div>

    <div v-else class="flex gap-6 flex-1">
      <!-- 照片列表 -->
      <div class="w-48 overflow-y-auto space-y-1">
        <div v-for="photo in photosStore.photos.slice(0, 100)" :key="photo.id"
             @click="selectPhoto(photo.id)"
             class="px-3 py-2 text-xs rounded-md cursor-pointer transition-colors truncate"
             :class="selectedPhotoId === photo.id ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover'">
          {{ photo.file_name }}
        </div>
      </div>

      <!-- 直方图 -->
      <div class="flex-1">
        <div v-if="selectedPhotoId" class="bg-bg-secondary rounded-xl border border-white/5 p-6">
          <h3 class="text-sm font-medium text-text-primary mb-4">{{ t('histogram.rgbTitle') }}</h3>
          <div class="bg-bg-deep rounded-lg p-4">
            <Histogram :photo-id="selectedPhotoId" />
          </div>
          <div class="flex gap-4 mt-4 text-xs text-text-muted">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500/40"></span>{{ t('histogram.red') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500/40"></span>{{ t('histogram.green') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-blue-500/40"></span>{{ t('histogram.blue') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-white/15"></span>{{ t('histogram.luminance') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
