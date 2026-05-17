<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Photo } from '../../stores/photos'

const { t } = useI18n()

const props = defineProps<{
  photo: Photo | null
  visible: boolean
}>()

const exifData = ref<Record<string, unknown> | null>(null)

// Photo object already contains all EXIF fields from the database
// No separate EXIF fetch needed

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}
</script>

<template>
  <Transition name="slide-right">
    <div v-if="visible && photo" class="w-64 bg-bg-primary/90 backdrop-blur-sm border-l border-white/5 p-4 overflow-y-auto">
      <h3 class="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">{{ $t('exif.title') }}</h3>

      <div class="space-y-3 text-xs">
        <div>
          <div class="text-text-muted mb-0.5">{{ $t('exif.fileName') }}</div>
          <div class="text-text-primary break-all">{{ photo.file_name }}</div>
        </div>

        <div>
          <div class="text-text-muted mb-0.5">{{ $t('exif.filePath') }}</div>
          <div class="text-text-secondary break-all text-[11px]">{{ photo.file_path }}</div>
        </div>

        <div v-if="photo.file_size">
          <div class="text-text-muted mb-0.5">{{ $t('exif.fileSize') }}</div>
          <div class="text-text-primary">{{ formatFileSize(photo.file_size) }}</div>
        </div>

        <div v-if="photo.width && photo.height">
          <div class="text-text-muted mb-0.5">{{ $t('exif.dimensions') }}</div>
          <div class="text-text-primary">{{ photo.width }} × {{ photo.height }}</div>
        </div>

        <div v-if="photo.camera_model">
          <div class="text-text-muted mb-0.5">{{ $t('exif.camera') }}</div>
          <div class="text-text-primary">{{ photo.camera_model }}</div>
        </div>

        <div v-if="photo.lens_model">
          <div class="text-text-muted mb-0.5">{{ $t('exif.lens') }}</div>
          <div class="text-text-primary">{{ photo.lens_model }}</div>
        </div>

        <div v-if="photo.focal_length">
          <div class="text-text-muted mb-0.5">{{ $t('exif.focalLength') }}</div>
          <div class="text-text-primary">{{ photo.focal_length }}mm</div>
        </div>

        <div v-if="photo.aperture">
          <div class="text-text-muted mb-0.5">{{ $t('exif.aperture') }}</div>
          <div class="text-text-primary">f/{{ photo.aperture }}</div>
        </div>

        <div v-if="photo.shutter_speed">
          <div class="text-text-muted mb-0.5">{{ $t('exif.shutterSpeed') }}</div>
          <div class="text-text-primary">{{ photo.shutter_speed }}</div>
        </div>

        <div v-if="photo.iso">
          <div class="text-text-muted mb-0.5">{{ $t('exif.iso') }}</div>
          <div class="text-text-primary">ISO {{ photo.iso }}</div>
        </div>

        <div v-if="photo.shot_at">
          <div class="text-text-muted mb-0.5">{{ $t('exif.dateTaken') }}</div>
          <div class="text-text-primary">{{ formatDate(photo.shot_at) }}</div>
        </div>

        <div v-if="photo.format">
          <div class="text-text-muted mb-0.5">Format</div>
          <div class="text-text-primary uppercase">{{ photo.format }}</div>
        </div>

        <div v-if="photo.rating">
          <div class="text-text-muted mb-0.5">{{ $t('settings.keyBindingsList.preview') }}</div>
          <div class="text-text-primary">{{ '★'.repeat(photo.rating) }}</div>
        </div>

        <div v-if="photo.color_label">
          <div class="text-text-muted mb-0.5">{{ $t('batchAction.colorLabel') }}</div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full" :class="{
              'bg-red-500': photo.color_label === 'red',
              'bg-yellow-500': photo.color_label === 'yellow',
              'bg-green-500': photo.color_label === 'green',
              'bg-blue-500': photo.color_label === 'blue',
              'bg-purple-500': photo.color_label === 'purple'
            }"></span>
            <span class="text-text-primary capitalize">{{ photo.color_label }}</span>
          </div>
        </div>
      </div>

      <div v-if="!photo.camera_model && !photo.lens_model && !photo.shot_at" class="text-center text-text-muted text-xs mt-8">
        {{ $t('exif.noExif') }}
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-right-enter-active, .slide-right-leave-active { transition: all 0.2s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); opacity: 0; }
</style>
