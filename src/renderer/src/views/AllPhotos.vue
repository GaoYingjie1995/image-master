<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePhotosStore } from '../stores/photos'
import { useSelectionStore } from '../stores/selection'
import PhotoGrid from '../components/photo/PhotoGrid.vue'
import PhotoPreview from '../components/photo/PhotoPreview.vue'

const route = useRoute()
const photosStore = usePhotosStore()
const selection = useSelectionStore()

const previewIndex = ref(-1)
const showPreview = ref(false)

onMounted(() => {
  photosStore.fetchPhotos()
})

function openPreview(index: number) {
  previewIndex.value = index
  showPreview.value = true
}

function closePreview() {
  showPreview.value = false
}

function prevPhoto() {
  if (previewIndex.value > 0) previewIndex.value--
}

function nextPhoto() {
  if (previewIndex.value < photosStore.photos.length - 1) previewIndex.value++
}

async function handleRate(id: number, rating: number) {
  await photosStore.updateRating(id, rating)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <PhotoGrid :photos="photosStore.photos"
               @preview="openPreview"
               @rate="handleRate" />
    <PhotoPreview :photo="photosStore.photos[previewIndex] || null"
                  :visible="showPreview"
                  @close="closePreview"
                  @prev="prevPhoto"
                  @next="nextPhoto"
                  @rate="(r) => photosStore.photos[previewIndex] && handleRate(photosStore.photos[previewIndex].id, r)" />
  </div>
</template>
