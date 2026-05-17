<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DuplicateGroup from '../components/cleanup/DuplicateGroup.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
const { t } = useI18n()

const folderPath = ref('')
const groups = ref<{ hash: string; photos: { id: number; file_path: string; file_name: string; file_size: number }[] }[]>([])
const scanning = ref(false)
const progress = ref({ phase: '', current: 0, total: 0 })

const confirmVisible = ref(false)
const pendingDeletePath = ref('')
const confirmDeleteOthersVisible = ref(false)
const pendingDeleteOthersPaths = ref<string[]>([])

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
    const result = await window.electronAPI.cleanup.deleteFiles([filePath])
    if (result.success > 0) {
      toast.success(t('duplicates.recycleSuccess'))
      // 从列表中移除已删除的照片
      groups.value = groups.value.map(g => ({
        ...g,
        photos: g.photos.filter(p => p.file_path !== filePath)
      })).filter(g => g.photos.length > 1)
    } else {
      toast.error(t('duplicates.deleteFailed'))
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
  const result = await window.electronAPI.cleanup.deleteFiles(filePaths)
  if (result.success > 0) {
    toast.success(t('duplicates.deleted', { count: result.success }))
    // 移除已删除的照片，清空只剩一个的组
    const deletedSet = new Set(filePaths)
    groups.value = groups.value.map(g => ({
      ...g,
      photos: g.photos.filter(p => !deletedSet.has(p.file_path))
    })).filter(g => g.photos.length > 1)
  }
  if (result.failed > 0) {
    toast.error(t('duplicates.deleteFailCount', { count: result.failed }))
  }
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">{{ $t('duplicates.title') }}</h2>

    <div class="flex gap-3 mb-6">
      <button @click="selectFolder"
              class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary border border-white/5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
        {{ folderPath || $t('duplicates.selectFolder') }}
      </button>
      <button @click="startScan" :disabled="!folderPath || scanning"
              class="px-4 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
        {{ scanning ? $t('duplicates.scanning') : $t('duplicates.startScan') }}
      </button>
    </div>

    <div v-if="scanning" class="mb-4">
      <div class="text-xs text-text-muted">{{ progress.phase }}: {{ progress.current }}/{{ progress.total }}</div>
      <div class="mt-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
        <div class="h-full bg-accent rounded-full transition-all" :style="{ width: (progress.total > 0 ? progress.current / progress.total * 100 : 0) + '%' }"></div>
      </div>
    </div>

    <div class="space-y-4">
      <DuplicateGroup v-for="group in groups" :key="group.hash"
                      :group="group"
                      @delete="requestDelete"
                      @delete-others="handleDeleteOthers" />
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
  </div>
</template>
