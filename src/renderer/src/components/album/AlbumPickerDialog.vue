<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Album { id: number; name: string }

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', albumId: number): void
}>()

const albums = ref<Album[]>([])

watch(() => props.visible, async (val) => {
  if (val && window.electronAPI) {
    albums.value = await window.electronAPI.albums.getAll()
  }
})

function handleSelect(album: Album) {
  emit('select', album.id)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
           @click.self="emit('close')">
        <div class="bg-bg-secondary rounded-xl border border-white/5 p-5 w-72 max-h-[60vh] flex flex-col">
          <h3 class="font-display text-base text-accent mb-3">{{ $t('album.selectAlbum') }}</h3>
          <div class="flex-1 overflow-y-auto space-y-1 mb-4">
            <div v-if="albums.length === 0" class="text-xs text-text-muted text-center py-4">
              {{ $t('album.noAlbums') }}
            </div>
            <button v-for="album in albums" :key="album.id"
                    @click="handleSelect(album)"
                    class="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
              <span class="w-2 h-2 rounded-full bg-accent shrink-0"></span>
              <span class="truncate">{{ album.name }}</span>
            </button>
          </div>
          <div class="flex justify-end">
            <button @click="emit('close')"
                    class="px-4 py-1.5 text-xs rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover border border-white/5 transition-colors">
              {{ $t('album.cancel') }}
            </button>
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
