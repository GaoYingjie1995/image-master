<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlbumsStore, type Album } from '../../stores/albums'
import { ChevronRight } from 'lucide-vue-next'

const { t } = useI18n()
const albumsStore = useAlbumsStore()

const props = defineProps<{
  visible: boolean
  currentAlbumId?: number | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', name: string, parentId: number | null, parentPath: string): void
}>()

const name = ref('')
const selectedParentId = ref<number | null>(null)
const showParentSelect = ref(false)

const albumTree = computed(() => albumsStore.albums)

const selectedParentPath = computed(() => {
  if (selectedParentId.value === null) return null
  const album = findAlbumById(albumTree.value, selectedParentId.value)
  return album?.folder_path || null
})

const selectedParentName = computed(() => {
  if (selectedParentId.value === null) return t('album.noParent')
  const album = findAlbumById(albumTree.value, selectedParentId.value)
  return album?.name || ''
})

function findAlbumById(tree: Album[], id: number): Album | undefined {
  for (const album of tree) {
    if (album.id === id) return album
    if (album.children?.length) {
      const found = findAlbumById(album.children, id)
      if (found) return found
    }
  }
  return undefined
}

watch(() => props.visible, (val) => {
  if (val) {
    name.value = ''
    selectedParentId.value = props.currentAlbumId || null
    showParentSelect.value = false
  }
})

function selectParent(id: number | null) {
  selectedParentId.value = id
  showParentSelect.value = false
}

function handleCreate() {
  if (name.value.trim()) {
    const parentPath = selectedParentPath.value || ''
    emit('create', name.value.trim(), selectedParentId.value, parentPath)
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
           @click.self="emit('close')">
        <div class="bg-bg-secondary rounded-xl border border-border-film p-6 w-80">
          <h3 class="font-hand text-lg text-fuji-warm mb-4">{{ t('album.createTitle') }}</h3>

          <input v-model="name" :placeholder="t('album.namePlaceholder')"
                 class="w-full bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-fuji-warm/30 mb-3"
                 @keyup.enter="handleCreate" />

          <div class="mb-4">
            <label class="text-xs text-text-secondary mb-1.5 block">{{ t('album.parentAlbum') }}</label>
            <div class="relative">
              <button @click="showParentSelect = !showParentSelect"
                      class="w-full bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary text-left flex items-center justify-between hover:border-fuji-warm/30 transition-colors">
                <span>{{ selectedParentName }}</span>
                <ChevronRight :size="14" class="text-text-muted transition-transform" :class="showParentSelect ? 'rotate-90' : ''" />
              </button>

              <div v-if="showParentSelect"
                   class="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border-film rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                <div @click="selectParent(null)"
                     class="px-3 py-2 text-xs cursor-pointer hover:bg-bg-hover transition-colors"
                     :class="selectedParentId === null ? 'text-fuji-warm bg-fuji-warm-dim' : 'text-text-secondary'">
                  {{ t('album.noParent') }}
                </div>

                <template v-for="album in albumTree" :key="album.id">
                  <div @click="selectParent(album.id)"
                       class="px-3 py-2 text-xs cursor-pointer hover:bg-bg-hover transition-colors flex items-center"
                       :class="selectedParentId === album.id ? 'text-fuji-warm bg-fuji-warm-dim' : 'text-text-secondary'">
                    <span class="truncate">{{ album.name }}</span>
                  </div>
                  <template v-if="album.children?.length">
                    <div v-for="child in album.children" :key="child.id"
                         @click="selectParent(child.id)"
                         class="px-3 py-2 text-xs cursor-pointer hover:bg-bg-hover transition-colors flex items-center"
                         :class="selectedParentId === child.id ? 'text-fuji-warm bg-fuji-warm-dim' : 'text-text-secondary'"
                         :style="{ paddingLeft: '24px' }">
                      <span class="truncate">{{ child.name }}</span>
                    </div>
                  </template>
                </template>
              </div>
            </div>
          </div>

          <div class="flex gap-2 justify-end">
            <button @click="emit('close')"
                    class="px-4 py-1.5 text-sm rounded-lg text-text-secondary hover:bg-bg-hover transition-colors">
              {{ t('common.cancel') }}
            </button>
            <button @click="handleCreate"
                    class="px-4 py-1.5 text-sm rounded-lg bg-fuji-warm/10 text-fuji-warm hover:bg-fuji-warm/20 transition-colors"
                    :disabled="!name.trim()">
              {{ t('album.create') }}
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
