<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createLocalFileUrl } from '@shared/local-protocol'

const { t } = useI18n()

defineProps<{
  group: { hash: string; photos: { id: number; file_path: string; file_name: string; file_size: number }[] }
}>()

const emit = defineEmits<{
  (e: 'keep', photoId: number): void
  (e: 'delete', filePath: string): void
  (e: 'deleteOthers', filePaths: string[]): void
}>()

const keptId = ref<number | null>(null)
const thumbUrls = ref<Map<number, string>>(new Map())

function loadThumbnail(photoId: number) {
  if (window.electronAPI && !thumbUrls.value.has(photoId)) {
    window.electronAPI.photos.getThumbnail(photoId).then(path => {
      if (path) thumbUrls.value.set(photoId, createLocalFileUrl('local-thumbnail', path))
    })
  }
}

function handleKeep(photoId: number) {
  keptId.value = photoId
  emit('keep', photoId)
}

function handleDeleteOthers(group: { photos: { id: number; file_path: string }[] }) {
  const pathsToDelete = group.photos.filter(p => p.id !== keptId.value).map(p => p.file_path)
  emit('deleteOthers', pathsToDelete)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xs text-accent font-medium">{{ $t('duplicates.group') }}</span>
      <span class="text-[10px] text-text-muted">{{ $t('duplicates.files', { count: group.photos.length }) }}</span>
      <div class="flex-1"></div>
      <button v-if="keptId !== null"
              @click="handleDeleteOthers(group)"
              class="px-3 py-1 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
        {{ $t('duplicates.deleteOthers', { count: group.photos.length - 1 }) }}
      </button>
    </div>
    <div class="space-y-2">
      <div v-for="photo in group.photos" :key="photo.id"
           class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg"
           :class="keptId === photo.id ? 'ring-1 ring-green-500/30' : keptId !== null ? 'opacity-50' : ''"
           @vue:mounted="loadThumbnail(photo.id)">
        <img v-if="thumbUrls.get(photo.id)" :src="thumbUrls.get(photo.id)"
             class="w-12 h-12 rounded-md object-cover" :alt="photo.file_name" />
        <div v-else class="w-12 h-12 bg-bg-hover rounded-md flex items-center justify-center text-lg opacity-30">◈</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-text-primary truncate">{{ photo.file_name }}</div>
          <div class="text-[11px] text-text-muted truncate">{{ photo.file_path }}</div>
          <div class="text-[11px] text-text-muted">{{ formatSize(photo.file_size) }}</div>
        </div>
        <div class="flex gap-2 items-center">
          <span v-if="keptId === photo.id" class="text-xs text-green-400 font-medium">{{ $t('duplicates.kept') }}</span>
          <button v-else @click="handleKeep(photo.id)"
                  class="px-3 py-1 text-xs rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
            {{ $t('duplicates.keep') }}
          </button>
          <button @click="$emit('delete', photo.file_path)"
                  class="px-3 py-1 text-xs rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            {{ $t('duplicates.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
