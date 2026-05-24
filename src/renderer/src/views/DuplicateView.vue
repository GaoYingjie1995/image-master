<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DuplicateGroup from '../components/cleanup/DuplicateGroup.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useToastStore } from '../stores/toast'
import { usePhotosStore } from '../stores/photos'
import { useAlbumsStore } from '../stores/albums'

const toast = useToastStore()
const photosStore = usePhotosStore()
const albumsStore = useAlbumsStore()
const { t } = useI18n()

const folderPath = ref('')
const groups = ref<{ hash: string; photos: { id: number; file_path: string; file_name: string; file_size: number }[] }[]>([])
const scanning = ref(false)
const progress = ref({ phase: '', current: 0, total: 0 })

const confirmVisible = ref(false)
const pendingDeletePath = ref('')
const confirmDeleteOthersVisible = ref(false)
const pendingDeleteOthersPaths = ref<string[]>([])
const deleting = ref(false)

// 批量删除
const keepFolder = ref('')
const batchSelections = ref<Record<string, number>>({})
const confirmBatchVisible = ref(false)
const pendingBatchPaths = ref<string[]>([])
const batchSkippedCount = ref(0)

const folders = computed(() => {
  const set = new Set<string>()
  for (const g of groups.value) {
    for (const p of g.photos) {
      const sep = p.file_path.lastIndexOf('/') !== -1 ? '/' : '\\'
      set.add(p.file_path.substring(0, p.file_path.lastIndexOf(sep)))
    }
  }
  return Array.from(set).sort()
})

const showBatchBar = computed(() => groups.value.length > 0 && folders.value.length > 1)

const batchDeleteCount = computed(() => {
  let count = 0
  for (const g of groups.value) {
    const keepId = batchSelections.value[g.hash]
    if (keepId !== undefined) {
      count += g.photos.filter(p => p.id !== keepId).length
    }
  }
  return count
})

let progressCleanup: (() => void) | null = null

function registerProgressListener() {
  if (progressCleanup) {
    progressCleanup()
    progressCleanup = null
  }
  if (window.electronAPI) {
    progressCleanup = window.electronAPI.cleanup.onProgress((data) => {
      progress.value = data
    })
  }
}

onUnmounted(() => {
  if (progressCleanup) {
    progressCleanup()
    progressCleanup = null
  }
})

async function selectFolder() {
  if (window.electronAPI) {
    folderPath.value = await window.electronAPI.cleanup.selectFolder() || ''
  }
}

async function startScan() {
  if (!folderPath.value) return
  scanning.value = true
  registerProgressListener()
  try {
    if (window.electronAPI) {
      groups.value = await window.electronAPI.cleanup.detectDuplicates(folderPath.value)
    }
  } catch (e) {
    toast.error(t('duplicates.scanFailed'))
  } finally {
    scanning.value = false
  }
}

function requestDelete(filePath: string) {
  pendingDeletePath.value = filePath
  confirmVisible.value = true
}

async function confirmDelete() {
  const filePath = pendingDeletePath.value
  confirmVisible.value = false
  pendingDeletePath.value = ''
  if (window.electronAPI && filePath) {
    deleting.value = true
    try {
      const result = await window.electronAPI.cleanup.deleteFiles([filePath])
      if (result.success > 0) {
        toast.success(t('duplicates.recycleSuccess'))
        groups.value = groups.value.map(g => ({
          ...g,
          photos: g.photos.filter(p => p.file_path !== filePath)
        })).filter(g => g.photos.length > 1)
        photosStore.refresh()
        albumsStore.fetchTree()
      } else {
        toast.error(t('duplicates.deleteFailed'))
      }
    } catch {
      toast.error(t('duplicates.deleteFailed'))
    } finally {
      deleting.value = false
    }
  }
}

function handleDeleteOthers(filePaths: string[]) {
  if (filePaths.length === 0) return
  pendingDeleteOthersPaths.value = filePaths
  confirmDeleteOthersVisible.value = true
}

async function confirmDeleteOthers() {
  const filePaths = pendingDeleteOthersPaths.value
  confirmDeleteOthersVisible.value = false
  pendingDeleteOthersPaths.value = []
  if (!window.electronAPI || filePaths.length === 0) return
  deleting.value = true
  try {
    const result = await window.electronAPI.cleanup.deleteFiles(filePaths)
    if (result.success > 0) {
      toast.success(t('duplicates.deleted', { count: result.success }))
      const deletedSet = new Set(result.deletedPaths)
      groups.value = groups.value.map(g => ({
        ...g,
        photos: g.photos.filter(p => !deletedSet.has(p.file_path))
      })).filter(g => g.photos.length > 1)
      photosStore.refresh()
      albumsStore.fetchTree()
    }
    if (result.failed > 0) {
      toast.error(t('duplicates.deleteFailCount', { count: result.failed }))
    }
    if (result.success === 0 && result.failed === 0) {
      toast.error(t('duplicates.deleteFailed'))
    }
  } catch {
    toast.error(t('duplicates.deleteFailed'))
  } finally {
    deleting.value = false
  }
}

function applyBatchSelection() {
  if (!keepFolder.value) return
  const selections: Record<string, number> = {}
  let skipped = 0
  for (const g of groups.value) {
    const inFolder = g.photos.filter(p => {
      const sep = p.file_path.lastIndexOf('/') !== -1 ? '/' : '\\'
      const dir = p.file_path.substring(0, p.file_path.lastIndexOf(sep))
      return dir === keepFolder.value
    })
    if (inFolder.length > 0) {
      selections[g.hash] = inFolder[0].id
    } else {
      skipped++
    }
  }
  batchSelections.value = selections
  batchSkippedCount.value = skipped
  if (skipped > 0) {
    toast.info(t('duplicates.batchSkipped', { count: skipped }))
  }
}

function requestBatchDelete() {
  const paths: string[] = []
  for (const g of groups.value) {
    const keepId = batchSelections.value[g.hash]
    if (keepId !== undefined) {
      for (const p of g.photos) {
        if (p.id !== keepId) paths.push(p.file_path)
      }
    }
  }
  if (paths.length === 0) return
  pendingBatchPaths.value = paths
  confirmBatchVisible.value = true
}

async function confirmBatchDelete() {
  const paths = [...pendingBatchPaths.value]
  confirmBatchVisible.value = false
  pendingBatchPaths.value = []
  if (!window.electronAPI || paths.length === 0) return
  deleting.value = true
  try {
    const result = await window.electronAPI.cleanup.deleteFiles(paths)
    if (result.success > 0) {
      const deletedSet = new Set(result.deletedPaths)
      groups.value = groups.value.map(g => ({
        ...g,
        photos: g.photos.filter(p => !deletedSet.has(p.file_path))
      })).filter(g => g.photos.length > 1)
      batchSelections.value = {}
      photosStore.refresh()
      albumsStore.fetchTree()
      toast.success(t('duplicates.batchResult', { success: result.success, failed: result.failed }))
    } else if (result.failed > 0) {
      toast.error(t('duplicates.deleteFailCount', { count: result.failed }))
    } else {
      toast.error(t('duplicates.deleteFailed'))
    }
  } catch {
    toast.error(t('duplicates.deleteFailed'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-hand text-xl text-fuji-warm mb-6">{{ $t('duplicates.title') }}</h2>

    <div class="flex gap-3 mb-6">
      <button @click="selectFolder"
              class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-subtle text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
        {{ folderPath || $t('duplicates.selectFolder') }}
      </button>
      <button @click="startScan" :disabled="!folderPath || scanning"
              class="px-4 py-2 text-sm rounded-lg bg-fuji-warm/10 text-fuji-warm hover:bg-fuji-warm/20 transition-colors disabled:opacity-50">
        {{ scanning ? $t('duplicates.scanning') : $t('duplicates.startScan') }}
      </button>
    </div>

    <div v-if="scanning" class="mb-4">
      <div class="text-xs text-text-muted">{{ progress.phase }}: {{ progress.current }}/{{ progress.total }}</div>
      <div class="mt-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
        <div class="h-full bg-fuji-warm rounded-full transition-all" :style="{ width: (progress.total > 0 ? progress.current / progress.total * 100 : 0) + '%' }"></div>
      </div>
    </div>

    <div v-if="showBatchBar" class="mb-4 p-4 bg-bg-secondary rounded-xl border border-border-subtle">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-xs text-text-secondary">{{ $t('duplicates.keepFolder') }}:</span>
        <select v-model="keepFolder"
                class="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary min-w-0 flex-1 max-w-md">
          <option value="">{{ $t('duplicates.selectKeepFolder') }}</option>
          <option v-for="f in folders" :key="f" :value="f">{{ f }}</option>
        </select>
        <button @click="applyBatchSelection" :disabled="!keepFolder"
                class="px-3 py-1.5 text-sm rounded-lg bg-fuji-warm/10 text-fuji-warm hover:bg-fuji-warm/20 transition-colors disabled:opacity-50">
          {{ $t('duplicates.batchSelect') }}
        </button>
        <button v-if="batchDeleteCount > 0" @click="requestBatchDelete" :disabled="deleting"
                class="px-3 py-1.5 text-sm rounded-lg bg-fuji-red/10 text-fuji-red hover:bg-fuji-red/20 transition-colors disabled:opacity-50">
          {{ $t('duplicates.batchDelete', { count: batchDeleteCount }) }}
        </button>
      </div>
    </div>

    <div class="relative">
      <div class="space-y-4" :class="deleting ? 'pointer-events-none opacity-50' : ''">
        <DuplicateGroup v-for="group in groups" :key="group.hash"
                        :group="group"
                        :preselected-keep-id="batchSelections[group.hash] ?? null"
                        :disabled="deleting"
                        @delete="requestDelete"
                        @delete-others="handleDeleteOthers" />
      </div>
      <Transition name="fade">
        <div v-if="deleting" class="absolute inset-0 flex items-center justify-center z-10">
          <div class="flex items-center gap-3 px-5 py-3 bg-bg-secondary/90 rounded-xl border border-border-film shadow-lg backdrop-blur-sm">
            <svg class="animate-spin h-5 w-5 text-fuji-warm" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm text-text-primary">{{ $t('duplicates.deleting') }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="!scanning && groups.length === 0 && folderPath" class="text-center text-text-muted text-sm mt-8">
      {{ $t('duplicates.notFound') }}
    </div>

    <ConfirmDialog :visible="confirmVisible"
                   :title="$t('duplicates.confirmTitle')"
                   :message="$t('duplicates.confirmMessage')"
                   :confirm-text="$t('duplicates.delete')"
                   @confirm="confirmDelete"
                   @cancel="confirmVisible = false" />

    <ConfirmDialog :visible="confirmDeleteOthersVisible"
                   :title="$t('duplicates.confirmDeleteOthersTitle')"
                   :message="$t('duplicates.confirmDeleteOthersMessage', { count: pendingDeleteOthersPaths.length })"
                   :confirm-text="$t('duplicates.delete')"
                   @confirm="confirmDeleteOthers"
                   @cancel="confirmDeleteOthersVisible = false" />

    <ConfirmDialog :visible="confirmBatchVisible"
                   :title="$t('duplicates.batchConfirmTitle')"
                   :message="$t('duplicates.batchConfirmMessage', { count: pendingBatchPaths.length })"
                   :confirm-text="$t('duplicates.delete')"
                   @confirm="confirmBatchDelete"
                   @cancel="confirmBatchVisible = false" />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
