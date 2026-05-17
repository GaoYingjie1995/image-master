<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RawPairList from '../components/cleanup/RawPairList.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
const { t } = useI18n()

const folderPath = ref('')
const orphanedRaws = ref<{ id: number; file_path: string; file_name: string }[]>([])
const scanning = ref(false)

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const pendingPaths = ref<string[]>([])
const isDeleteAll = ref(false)

async function selectFolder() {
  if (window.electronAPI) {
    folderPath.value = await window.electronAPI.cleanup.selectFolder() || ''
  }
}

async function startScan() {
  if (!folderPath.value || !window.electronAPI) return
  scanning.value = true
  try {
    orphanedRaws.value = await window.electronAPI.cleanup.findOrphanedRaws(folderPath.value)
  } finally {
    scanning.value = false
  }
}

function requestDelete(filePath: string) {
  const file = orphanedRaws.value.find(r => r.file_path === filePath)
  confirmTitle.value = t('cleanup.confirmTitle')
  confirmMessage.value = t('cleanup.confirmDelete', { name: file?.file_name || '' })
  pendingPaths.value = [filePath]
  isDeleteAll.value = false
  confirmVisible.value = true
}

function requestDeleteAll() {
  confirmTitle.value = t('cleanup.confirmTitleAll')
  confirmMessage.value = t('cleanup.confirmDeleteAll', { count: orphanedRaws.value.length })
  pendingPaths.value = orphanedRaws.value.map(r => r.file_path)
  isDeleteAll.value = true
  confirmVisible.value = true
}

async function handleConfirm() {
  confirmVisible.value = false
  if (!window.electronAPI || pendingPaths.value.length === 0) return
  const paths = [...pendingPaths.value]
  pendingPaths.value = []
  const result = await window.electronAPI.cleanup.deleteFiles(paths)
  if (result.success > 0) {
    toast.success(isDeleteAll.value ? t('cleanup.deleteSuccess', { count: result.success }) : t('cleanup.recycleSuccess'))
  }
  if (result.failed > 0) {
    toast.error(t('cleanup.deleteFailed', { count: result.failed }))
  }
  orphanedRaws.value = orphanedRaws.value.filter(r => !paths.includes(r.file_path))
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">{{ $t('cleanup.title') }}</h2>

    <div class="flex gap-3 mb-6">
      <button @click="selectFolder"
              class="px-4 py-2 text-sm rounded-lg bg-bg-tertiary border border-white/5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
        {{ folderPath || $t('cleanup.selectFolder') }}
      </button>
      <button @click="startScan" :disabled="!folderPath || scanning"
              class="px-4 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
        {{ scanning ? $t('cleanup.scanning') : $t('cleanup.scanOrphaned') }}
      </button>
    </div>

    <RawPairList :pairs="orphanedRaws"
                 @delete="requestDelete"
                 @deleteAll="requestDeleteAll" />

    <div v-if="!scanning && orphanedRaws.length === 0 && folderPath" class="text-center text-text-muted text-sm mt-8">
      {{ $t('cleanup.notFound') }}
    </div>

    <ConfirmDialog :visible="confirmVisible"
                   :title="confirmTitle"
                   :message="confirmMessage"
                   :confirm-text="$t('cleanup.confirmBtn')"
                   @confirm="handleConfirm"
                   @cancel="confirmVisible = false" />
  </div>
</template>
