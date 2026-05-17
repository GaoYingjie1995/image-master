<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../../stores/toast'
import { Image, Star, Clock, XCircle, Copy, Trash2, FileEdit, Download, Map as MapIcon, BarChart3, FolderOpen, Sparkles, Columns } from 'lucide-vue-next'
import AlbumDialog from '../album/AlbumDialog.vue'
import SmartAlbumDialog from '../album/SmartAlbumDialog.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import { createLocalFileUrl } from '@shared/local-protocol'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const toast = useToastStore()

interface Album { id: number; name: string; folder_path: string; cover_photo_id: number | null }
interface SmartAlbum { id: number; name: string; rules: string }

const albums = ref<Album[]>([])
const smartAlbums = ref<SmartAlbum[]>([])
const showAlbumDialog = ref(false)
const showSmartAlbumDialog = ref(false)
const albumCoverUrls = ref<Map<number, string>>(new Map())
const albumPhotoCounts = ref<Map<number, number>>(new Map())
const smartAlbumPhotoCounts = ref<Map<number, number>>(new Map())
const dragOverAlbumId = ref<number | null>(null)

// 智能相册编辑状态
const editingSmartAlbum = ref<{ id: number; name: string; rules: string } | null>(null)

// 相册右键菜单
const contextMenu = ref<{ visible: boolean; x: number; y: number; type: 'album' | 'smart'; item: Album | SmartAlbum | null }>({
  visible: false, x: 0, y: 0, type: 'album', item: null
})
const renamingId = ref<number | null>(null)
const renamingType = ref<'album' | 'smart'>('album')
const renameInput = ref('')

async function loadAlbums() {
  if (window.electronAPI) {
    albums.value = await window.electronAPI.albums.getAll()
    smartAlbums.value = (await window.electronAPI.albums.getAllSmart()) as SmartAlbum[]
    // 加载相册封面缩略图和照片计数
    const counts = await window.electronAPI.albums.getAllPhotoCounts()
    albumPhotoCounts.value = new Map(Object.entries(counts).map(([k, v]) => [Number(k), v]))
    // 加载智能相册照片计数
    for (const sa of smartAlbums.value) {
      try {
        const photos = await window.electronAPI.albums.getSmartPhotos(sa.id)
        smartAlbumPhotoCounts.value.set(sa.id, photos.length)
      } catch { /* ignore */ }
    }
    for (const album of albums.value) {
      if (album.cover_photo_id && !albumCoverUrls.value.has(album.id)) {
        const path = await window.electronAPI.photos.getThumbnail(album.cover_photo_id)
        if (path) albumCoverUrls.value.set(album.id, createLocalFileUrl('local-thumbnail', path))
      }
    }
  }
}

onMounted(loadAlbums)

// 拖拽照片到相册
function handleAlbumDragOver(e: DragEvent, albumId: number) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  dragOverAlbumId.value = albumId
}

function handleAlbumDragLeave() {
  dragOverAlbumId.value = null
}

async function handleAlbumDrop(e: DragEvent, albumId: number) {
  e.preventDefault()
  dragOverAlbumId.value = null
  const data = e.dataTransfer?.getData('application/photo-ids')
  if (!data || !window.electronAPI) return
  try {
    const photoIds = JSON.parse(data) as number[]
    if (photoIds.length > 0) {
      const result = await window.electronAPI.albums.addPhotos(albumId, photoIds)
      toast.show(t('toast.addToAlbumSuccess', { count: result.success }), 'success')
      await loadAlbums()
    }
  } catch {
    toast.show(t('toast.addToAlbumFailed'), 'error')
  }
}

const navItems = [
  { icon: Image, labelKey: 'nav.allPhotos', route: '/' },
  { icon: Star, labelKey: 'nav.rated', route: '/rated' },
  { icon: Clock, labelKey: 'nav.today', route: '/today' },
  { icon: XCircle, labelKey: 'nav.rejected', route: '/rejected' }
]

const toolItems = [
  { icon: Copy, labelKey: 'nav.duplicates', route: '/duplicates' },
  { icon: Trash2, labelKey: 'nav.rawCleanup', route: '/cleanup' },
  { icon: FileEdit, labelKey: 'nav.batchRename', route: '/batch-rename' },
  { icon: Download, labelKey: 'nav.batchExport', route: '/batch-export' }
]

const analysisItems = [
  { icon: MapIcon, labelKey: 'nav.map', route: '/map' },
  { icon: BarChart3, labelKey: 'nav.histogram', route: '/histogram' },
  { icon: Columns, labelKey: 'nav.compare', route: '/compare' }
]

function isActive(path: string) {
  return route.path === path
}

function navigate(path: string) {
  router.push(path)
}

function handleNavKeydown(e: KeyboardEvent, path: string) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    navigate(path)
  }
}

async function handleCreateAlbum(name: string) {
  if (window.electronAPI) {
    const parentPath = await window.electronAPI.cleanup.selectFolder()
    if (!parentPath) return
    await window.electronAPI.albums.create(name, parentPath)
    await loadAlbums()
  }
}

async function handleCreateSmartAlbum(name: string, rules: string) {
  if (window.electronAPI) {
    const result = await window.electronAPI.albums.createSmart(name, rules)
    if (result && result.error) {
      toast.show(t('toast.ruleValidationError', { error: result.error }), 'error')
      return
    }
    await loadAlbums()
  }
}

function startEditSmartAlbum() {
  if (!contextMenu.value.item || contextMenu.value.type !== 'smart') return
  const item = contextMenu.value.item as SmartAlbum
  editingSmartAlbum.value = { id: item.id, name: item.name, rules: item.rules }
  closeContextMenu()
  showSmartAlbumDialog.value = true
}

async function handleSaveSmartAlbum(id: number, name: string, rules: string) {
  if (window.electronAPI) {
    const result = await window.electronAPI.albums.updateSmart(id, name, rules)
    if (result && result.error) {
      toast.show(t('toast.ruleValidationError', { error: result.error }), 'error')
      return
    }
    editingSmartAlbum.value = null
    await loadAlbums()
  }
}

// 相册右键菜单
function showAlbumContext(e: MouseEvent, type: 'album' | 'smart', item: Album | SmartAlbum) {
  e.preventDefault()
  e.stopPropagation()
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, type, item }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function handleClickOutside() {
  closeContextMenu()
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

function startRename() {
  if (!contextMenu.value.item) return
  renamingId.value = contextMenu.value.item.id
  renamingType.value = contextMenu.value.type
  renameInput.value = contextMenu.value.item.name
  closeContextMenu()
}

async function confirmRename() {
  if (!renamingId.value || !renameInput.value.trim()) return
  if (window.electronAPI) {
    if (renamingType.value === 'album') {
      await window.electronAPI.albums.rename(renamingId.value, renameInput.value.trim())
    } else {
      await window.electronAPI.albums.renameSmart(renamingId.value, renameInput.value.trim())
    }
    renamingId.value = null
    await loadAlbums()
  }
}

function cancelRename() {
  renamingId.value = null
}

// 删除确认
const showDeleteConfirm = ref(false)
const pendingDelete = ref<{ type: 'album' | 'smart'; item: Album | SmartAlbum } | null>(null)

function deleteAlbum() {
  if (!contextMenu.value.item) return
  pendingDelete.value = { type: contextMenu.value.type, item: contextMenu.value.item }
  closeContextMenu()
  showDeleteConfirm.value = true
}

async function confirmDeleteAlbum() {
  if (!pendingDelete.value || !window.electronAPI) return
  const { type, item } = pendingDelete.value
  showDeleteConfirm.value = false
  pendingDelete.value = null

  if (type === 'album') {
    await window.electronAPI.albums.delete(item.id)
  } else {
    await window.electronAPI.albums.deleteSmart(item.id)
  }
  await loadAlbums()
  if (route.params.id && Number(route.params.id) === item.id) {
    router.push('/')
  }
}
</script>

<template>
  <aside class="w-[220px] bg-bg-primary border-r border-white/5 flex flex-col overflow-y-auto py-3" role="navigation" aria-label="主导航">
    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5" role="heading" aria-level="2">{{ $t('nav.browse') }}</div>
      <div v-for="item in navItems" :key="item.route"
           @click="navigate(item.route)"
           @keydown="handleNavKeydown($event, item.route)"
           tabindex="0"
           role="link"
           :aria-current="isActive(item.route) ? 'page' : undefined"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px] relative outline-none focus:ring-1 focus:ring-accent/50"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <component :is="item.icon" :size="16" class="shrink-0" aria-hidden="true" />
        <span>{{ $t(item.labelKey) }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2" role="separator"></div>

    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5" role="heading" aria-level="2">{{ $t('nav.tools') }}</div>
      <div v-for="item in toolItems" :key="item.route"
           @click="navigate(item.route)"
           @keydown="handleNavKeydown($event, item.route)"
           tabindex="0"
           role="link"
           :aria-current="isActive(item.route) ? 'page' : undefined"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px] outline-none focus:ring-1 focus:ring-accent/50"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <component :is="item.icon" :size="16" class="shrink-0" aria-hidden="true" />
        <span>{{ $t(item.labelKey) }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2" role="separator"></div>

    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5" role="heading" aria-level="2">{{ $t('nav.analysis') }}</div>
      <div v-for="item in analysisItems" :key="item.route"
           @click="navigate(item.route)"
           @keydown="handleNavKeydown($event, item.route)"
           tabindex="0"
           role="link"
           :aria-current="isActive(item.route) ? 'page' : undefined"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px] outline-none focus:ring-1 focus:ring-accent/50"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <component :is="item.icon" :size="16" class="shrink-0" aria-hidden="true" />
        <span>{{ $t(item.labelKey) }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2" role="separator"></div>

    <div class="px-3 flex-1">
      <!-- 智能相册 -->
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5" role="heading" aria-level="2">{{ $t('nav.smartAlbums') }}</div>
      <div v-for="album in smartAlbums" :key="'smart-' + album.id"
           @click="navigate(`/smart-album/${album.id}`)"
           @keydown="handleNavKeydown($event, `/smart-album/${album.id}`)"
           @contextmenu.prevent="showAlbumContext($event, 'smart', album)"
           tabindex="0"
           role="link"
           :aria-current="isActive(`/smart-album/${album.id}`) ? 'page' : undefined"
           class="flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer transition-colors text-xs outline-none focus:ring-1 focus:ring-accent/50"
           :class="isActive(`/smart-album/${album.id}`) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-2 h-2 rounded-full bg-accent/50 shrink-0" aria-hidden="true"></span>
        <span v-if="renamingId === album.id && renamingType === 'smart'" class="flex-1 min-w-0">
          <input v-model="renameInput" @keyup.enter="confirmRename" @keyup.escape="cancelRename" @blur="confirmRename"
                 class="w-full bg-bg-tertiary border border-accent/30 rounded px-1 py-0.5 text-xs text-text-primary outline-none" autofocus />
        </span>
        <span v-else class="truncate flex-1 min-w-0">{{ album.name }}</span>
        <span v-if="smartAlbumPhotoCounts.has(album.id)" class="text-[10px] text-text-muted shrink-0">{{ $t('album.photoCount', { count: smartAlbumPhotoCounts.get(album.id) }) }}</span>
      </div>
      <button @click="showSmartAlbumDialog = true"
              class="flex items-center gap-2 py-1.5 px-3 text-xs text-text-muted cursor-pointer hover:text-accent transition-colors w-full text-left">
        {{ $t('nav.newSmartAlbum') }}
      </button>

      <div class="h-px bg-white/5 mx-0 my-2" role="separator"></div>

      <!-- 手动相册 -->
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5" role="heading" aria-level="2">{{ $t('nav.albums') }}</div>
      <div v-for="album in albums" :key="album.id"
           @click="navigate(`/album/${album.id}`)"
           @keydown="handleNavKeydown($event, `/album/${album.id}`)"
           @contextmenu.prevent="showAlbumContext($event, 'album', album)"
           @dragover="handleAlbumDragOver($event, album.id)"
           @dragleave="handleAlbumDragLeave()"
           @drop="handleAlbumDrop($event, album.id)"
           tabindex="0"
           role="link"
           :aria-current="isActive(`/album/${album.id}`) ? 'page' : undefined"
           class="flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer transition-colors text-xs outline-none focus:ring-1 focus:ring-accent/50"
           :class="[
             isActive(`/album/${album.id}`) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
             dragOverAlbumId === album.id ? 'ring-1 ring-accent/50 bg-accent/5' : ''
           ]">
        <img v-if="albumCoverUrls.get(album.id)" :src="albumCoverUrls.get(album.id)"
             class="w-6 h-6 rounded object-cover shrink-0" :alt="album.name" />
        <span v-else class="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden="true"></span>
        <span v-if="renamingId === album.id && renamingType === 'album'" class="flex-1 min-w-0">
          <input v-model="renameInput" @keyup.enter="confirmRename" @keyup.escape="cancelRename" @blur="confirmRename"
                 class="w-full bg-bg-tertiary border border-accent/30 rounded px-1 py-0.5 text-xs text-text-primary outline-none" autofocus />
        </span>
        <span v-else class="truncate flex-1 min-w-0">{{ album.name }}</span>
        <span v-if="albumPhotoCounts.has(album.id)" class="text-[10px] text-text-muted shrink-0">{{ $t('album.photoCount', { count: albumPhotoCounts.get(album.id) }) }}</span>
      </div>
      <button @click="showAlbumDialog = true"
              class="flex items-center gap-2 py-1.5 px-3 text-xs text-text-muted cursor-pointer hover:text-accent transition-colors w-full text-left">
        {{ $t('nav.newAlbum') }}
      </button>
    </div>

    <AlbumDialog :visible="showAlbumDialog"
                 @close="showAlbumDialog = false"
                 @create="handleCreateAlbum" />
    <SmartAlbumDialog :visible="showSmartAlbumDialog"
                      :edit-id="editingSmartAlbum?.id"
                      :edit-name="editingSmartAlbum?.name"
                      :edit-rules="editingSmartAlbum?.rules"
                      @close="showSmartAlbumDialog = false; editingSmartAlbum = null"
                      @create="handleCreateSmartAlbum"
                      @save="handleSaveSmartAlbum" />

    <ConfirmDialog :visible="showDeleteConfirm"
                   :title="$t('album.delete')"
                   :message="pendingDelete?.type === 'album' ? $t('album.confirmDelete') : $t('album.confirmDeleteSmart')"
                   :confirm-text="$t('album.delete')"
                   :danger="true"
                   @confirm="confirmDeleteAlbum"
                   @cancel="showDeleteConfirm = false" />

    <!-- 相册右键菜单 -->
    <Teleport to="body">
      <div v-if="contextMenu.visible"
           class="fixed z-[100] min-w-[120px] bg-bg-primary/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl shadow-black/50 py-1"
           :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
        <button @click="startRename"
                class="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
          {{ $t('album.rename') }}
        </button>
        <button v-if="contextMenu.type === 'smart'" @click="startEditSmartAlbum"
                class="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
          {{ $t('smartAlbum.editRules') }}
        </button>
        <div class="h-px bg-white/5 my-1"></div>
        <button @click="deleteAlbum"
                class="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
          {{ $t('album.delete') }}
        </button>
      </div>
    </Teleport>
  </aside>
</template>
