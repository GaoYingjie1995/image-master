<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../stores/toast'
import { usePhotosStore } from '../stores/photos'
import { useAlbumsStore } from '../stores/albums'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { FolderInput, Trash2, FolderPlus, ChevronRight, Folder, RefreshCw, RotateCcw } from 'lucide-vue-next'

const { t } = useI18n()
const toast = useToastStore()
const photosStore = usePhotosStore()
const albumsStore = useAlbumsStore()

async function refreshGlobalData() {
  await Promise.all([albumsStore.fetchTree(), photosStore.refresh()])
}

interface ImportSource {
  id: number
  folder_path: string
  imported_at: string
  albumCount: number
  photoCount: number
}

interface AlbumTreeNode {
  id: number
  name: string
  folder_path: string
  parent_id: number | null
  photoCount: number
  children: AlbumTreeNode[]
}

interface RefreshResult {
  imported: { id: number; name: string; folder_path: string }[]
  removed: { path: string; removed_at: string }[]
  new: { path: string; name: string }[]
}

const sources = ref<ImportSource[]>([])
const loading = ref(false)
const scanning = ref(false)
const scanProgress = ref({ current: 0, total: 0 })

const expandedSources = ref<Set<number>>(new Set())
const sourceChildren = ref<Map<number, AlbumTreeNode[]>>(new Map())

const refreshResult = ref<Map<number, RefreshResult>>(new Map())
const refreshing = ref<Set<number>>(new Set())

const showDeleteConfirm = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref<() => Promise<void>>(() => Promise.resolve())

let unsubscribeProgress: (() => void) | null = null

onMounted(async () => {
  await loadSources()
  if (window.electronAPI) {
    unsubscribeProgress = window.electronAPI.importSources.onScanProgress((data) => {
      scanProgress.value = data
    })
  }
})

onUnmounted(() => {
  unsubscribeProgress?.()
})

async function loadSources() {
  if (!window.electronAPI) return
  loading.value = true
  try {
    sources.value = await window.electronAPI.importSources.getAll() as ImportSource[]
  } finally {
    loading.value = false
  }
}

async function toggleExpand(source: ImportSource) {
  const id = source.id
  if (expandedSources.value.has(id)) {
    expandedSources.value.delete(id)
    expandedSources.value = new Set(expandedSources.value)
    return
  }

  if (!sourceChildren.value.has(id) && window.electronAPI) {
    const tree = await window.electronAPI.importSources.getAlbumTree(id) as AlbumTreeNode[]
    sourceChildren.value.set(id, tree)
  }

  expandedSources.value.add(id)
  expandedSources.value = new Set(expandedSources.value)
}

async function handleAdd() {
  if (!window.electronAPI) return
  scanning.value = true
  scanProgress.value = { current: 0, total: 0 }
  try {
    const result = await window.electronAPI.importSources.add()
    if (result) {
      if (result.alreadyImported) {
        toast.info(t('imports.alreadyImported'))
      } else if (result.count > 0) {
        toast.success(t('imports.addSuccess', { count: result.count }))
      }
      await loadSources()
      await refreshGlobalData()
    }
  } catch {
    toast.error(t('toast.importFailed'))
  } finally {
    scanning.value = false
  }
}

function confirmRemoveSource(source: ImportSource) {
  confirmTitle.value = t('imports.confirmTitle')
  confirmMessage.value = t('imports.confirmRemove', {
    photoCount: source.photoCount,
    albumCount: source.albumCount
  })
  confirmAction.value = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.importSources.remove(source.id)
    if (result.success) {
      toast.success(t('imports.removeSuccess'))
      expandedSources.value.delete(source.id)
      sourceChildren.value.delete(source.id)
      refreshResult.value.delete(source.id)
      await loadSources()
      await refreshGlobalData()
    }
  }
  showDeleteConfirm.value = true
}

function confirmRemoveChild(sourceId: number, node: AlbumTreeNode) {
  confirmTitle.value = t('imports.confirmRemoveChild')
  confirmMessage.value = t('imports.confirmRemoveChildMsg', {
    name: node.name,
    photoCount: node.photoCount
  })
  confirmAction.value = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.importSources.removeSubfolder(sourceId, node.folder_path)
    if (result.success) {
      toast.success(t('imports.removeChildSuccess'))
      const tree = await window.electronAPI.importSources.getAlbumTree(sourceId) as AlbumTreeNode[]
      sourceChildren.value.set(sourceId, tree)
      refreshResult.value.delete(sourceId)
      await loadSources()
      await refreshGlobalData()
    }
  }
  showDeleteConfirm.value = true
}

async function handleRefresh(sourceId: number) {
  if (!window.electronAPI) return
  refreshing.value.add(sourceId)
  refreshing.value = new Set(refreshing.value)
  try {
    const result = await window.electronAPI.importSources.refresh(sourceId) as RefreshResult
    refreshResult.value.set(sourceId, result)
    refreshResult.value = new Map(refreshResult.value)
  } finally {
    refreshing.value.delete(sourceId)
    refreshing.value = new Set(refreshing.value)
  }
}

async function handleReimport(sourceId: number, folderPath: string) {
  if (!window.electronAPI) return
  scanning.value = true
  try {
    const result = await window.electronAPI.importSources.reimportSubfolder(sourceId, folderPath)
    if (result && result.count > 0) {
      toast.success(t('imports.addSuccess', { count: result.count }))
    }
    refreshResult.value.delete(sourceId)
    const tree = await window.electronAPI.importSources.getAlbumTree(sourceId) as AlbumTreeNode[]
    sourceChildren.value.set(sourceId, tree)
    await loadSources()
    await refreshGlobalData()
  } catch {
    toast.error(t('toast.importFailed'))
  } finally {
    scanning.value = false
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return dateStr
  }
}

function truncatePath(path: string, maxLen: number = 50): string {
  if (path.length <= maxLen) return path
  const parts = path.split('/')
  if (parts.length <= 3) return '...' + path.slice(-maxLen)
  return parts[0] + '/.../' + parts.slice(-2).join('/')
}
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-hand text-xl text-fuji-warm">{{ $t('imports.title') }}</h2>
      <button @click="handleAdd" :disabled="scanning"
              class="flex items-center gap-2 px-4 py-2 text-xs rounded-lg bg-fuji-warm/10 text-fuji-warm hover:bg-fuji-warm/20 transition-colors disabled:opacity-50">
        <FolderPlus :size="14" />
        {{ scanning ? $t('imports.scanProgress', scanProgress) : $t('imports.add') }}
      </button>
    </div>

    <div class="space-y-3 max-w-2xl">
      <!-- 空状态 -->
      <div v-if="!loading && sources.length === 0"
           class="bg-bg-secondary rounded-xl border border-border-subtle p-8 text-center">
        <FolderInput :size="48" class="mx-auto mb-4 text-text-muted opacity-50" />
        <div class="text-sm text-text-secondary mb-1">{{ $t('imports.empty') }}</div>
        <div class="text-xs text-text-muted">{{ $t('imports.emptyHint') }}</div>
      </div>

      <!-- 顶层文件夹列表 -->
      <div v-for="source in sources" :key="source.id"
           class="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <div class="p-4 flex items-center gap-3">
          <button @click="toggleExpand(source)"
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-bg-hover transition-colors">
            <ChevronRight :size="16"
                          class="text-text-secondary transition-transform"
                          :class="expandedSources.has(source.id) ? 'rotate-90' : ''" />
          </button>
          <div class="w-8 h-8 rounded-lg bg-fuji-warm/10 flex items-center justify-center shrink-0">
            <FolderInput :size="16" class="text-fuji-warm" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-text-primary font-medium truncate font-mono" :title="source.folder_path">
              {{ truncatePath(source.folder_path) }}
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
              <span>{{ $t('imports.albumCount', { count: source.albumCount }) }}</span>
              <span>·</span>
              <span>{{ $t('imports.photoCount', { count: source.photoCount }) }}</span>
              <span>·</span>
              <span>{{ $t('imports.importedAt', { date: formatDate(source.imported_at) }) }}</span>
            </div>
          </div>
          <button @click="handleRefresh(source.id)" :disabled="refreshing.has(source.id)"
                  class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
                  :title="$t('imports.refresh')">
            <RefreshCw :size="14" :class="refreshing.has(source.id) ? 'animate-spin' : ''" />
          </button>
          <button @click="confirmRemoveSource(source)"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-fuji-red/10 text-fuji-red hover:bg-fuji-red/20 transition-colors">
            <Trash2 :size="12" />
            {{ $t('imports.remove') }}
          </button>
        </div>

        <!-- 子目录 -->
        <div v-if="expandedSources.has(source.id)" class="border-t border-border-subtle">
          <div v-for="child in (sourceChildren.get(source.id)?.[0]?.children || [])" :key="child.id"
               class="flex items-center gap-3 px-4 py-2 hover:bg-bg-hover/50 transition-colors"
               :style="{ paddingLeft: '48px' }">
            <div class="w-5 h-5 flex items-center justify-center shrink-0">
              <Folder :size="14" class="text-fuji-warm/60" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-text-secondary truncate">{{ child.name }}</div>
            </div>
            <span class="text-[10px] text-text-muted mr-2">
              {{ $t('imports.photoCount', { count: child.photoCount }) }}
            </span>
            <button @click="confirmRemoveChild(source.id, child)"
                    class="p-1 rounded text-text-muted hover:text-fuji-red hover:bg-fuji-red/10 transition-colors"
                    :title="$t('imports.removeChild')">
              <Trash2 :size="12" />
            </button>
          </div>

          <!-- 被移除的子目录 -->
          <div v-for="removed in (refreshResult.get(source.id)?.removed || [])" :key="removed.path"
               class="flex items-center gap-3 px-4 py-2 bg-fuji-red/5"
               :style="{ paddingLeft: '48px' }">
            <div class="w-5 h-5 flex items-center justify-center shrink-0">
              <Folder :size="14" class="text-fuji-red/40" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-text-muted truncate line-through">{{ removed.path.split('/').pop() }}</div>
            </div>
            <button @click="handleReimport(source.id, removed.path)"
                    class="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-fuji-warm/10 text-fuji-warm hover:bg-fuji-warm/20 transition-colors">
              <RotateCcw :size="10" />
              {{ $t('imports.reimport') }}
            </button>
          </div>

          <!-- 新发现的子目录 -->
          <div v-for="nf in (refreshResult.get(source.id)?.new || [])" :key="nf.path"
               class="flex items-center gap-3 px-4 py-2 bg-fuji-warm/5"
               :style="{ paddingLeft: '48px' }">
            <div class="w-5 h-5 flex items-center justify-center shrink-0">
              <Folder :size="14" class="text-fuji-warm/40" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-fuji-warm/80 truncate">{{ nf.name }}</div>
            </div>
            <button @click="handleReimport(source.id, nf.path)"
                    class="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-fuji-warm/10 text-fuji-warm hover:bg-fuji-warm/20 transition-colors">
              <FolderPlus :size="10" />
              {{ $t('imports.importNew') }}
            </button>
          </div>

          <!-- 空状态 -->
          <div v-if="(sourceChildren.get(source.id)?.[0]?.children || []).length === 0 && !(refreshResult.get(source.id))"
               class="px-4 py-3 text-xs text-text-muted text-center"
               :style="{ paddingLeft: '48px' }">
            {{ $t('imports.noChildren') }}
          </div>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      :visible="showDeleteConfirm"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="$t('imports.remove')"
      :danger="true"
      @confirm="async () => { await confirmAction(); showDeleteConfirm = false }"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
