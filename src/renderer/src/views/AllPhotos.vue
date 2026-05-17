<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePhotosStore } from '../stores/photos'
import { useSelectionStore } from '../stores/selection'
import { ClipboardCopy, FolderOpen, Star, X, Ban, Trash2, Circle, Images } from 'lucide-vue-next'
import PhotoGrid from '../components/photo/PhotoGrid.vue'
import PhotoPreview from '../components/photo/PhotoPreview.vue'
import BatchActionBar from '../components/common/BatchActionBar.vue'
import ContextMenu from '../components/common/ContextMenu.vue'
import AlbumPickerDialog from '../components/album/AlbumPickerDialog.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useToastStore } from '../stores/toast'
import type { MenuItem } from '../components/common/ContextMenu.vue'
import type { Photo } from '../stores/photos'

const route = useRoute()
const router = useRouter()
const photosStore = usePhotosStore()
const selection = useSelectionStore()
const toast = useToastStore()
const { t } = useI18n()

const previewPhotoId = ref<number | null>(null)
const showPreview = ref(false)

const previewPhoto = computed(() => {
  if (previewPhotoId.value === null) return null
  return photosStore.photos.find(p => p.id === previewPhotoId.value) || null
})

const previewIndex = computed(() => {
  if (previewPhotoId.value === null) return -1
  return photosStore.photos.findIndex(p => p.id === previewPhotoId.value)
})

function loadPhotos() {
  const name = route.name as string
  if (name === 'today') {
    photosStore.fetchPhotos({ filter: 'today' })
  } else if (name === 'rated') {
    photosStore.fetchPhotos({ filter: 'rated' })
  } else if (name === 'rejected') {
    photosStore.fetchPhotos({ filter: 'rejected' })
  } else if (name === 'album' && route.params.id) {
    photosStore.fetchPhotos({ albumId: Number(route.params.id) })
  } else if (name === 'smart-album' && route.params.id) {
    photosStore.fetchSmartAlbumPhotos(Number(route.params.id))
  } else {
    photosStore.fetchPhotos()
  }
}

// 使用单个 watcher 监听路由和排序变化，避免重复加载
watch(
  [() => route.name, () => route.params.id, () => photosStore.sortBy],
  loadPhotos,
  { immediate: true }
)

function openPreview(id: number) {
  previewPhotoId.value = id
  showPreview.value = true
}

function closePreview() {
  showPreview.value = false
}

function prevPhoto() {
  if (previewIndex.value > 0) {
    previewPhotoId.value = photosStore.photos[previewIndex.value - 1].id
  }
}

function nextPhoto() {
  if (previewIndex.value < photosStore.photos.length - 1) {
    previewPhotoId.value = photosStore.photos[previewIndex.value + 1].id
  }
}

async function handleRate(id: number, rating: number) {
  await photosStore.updateRating(id, rating)
}

async function handleColorLabel(label: string | null) {
  if (previewPhoto.value) {
    await photosStore.updateColorLabel(previewPhoto.value.id, label)
  }
}

async function handleReject() {
  if (previewPhoto.value) {
    await window.electronAPI.photos.updateRejected(previewPhoto.value.id, !previewPhoto.value.is_rejected)
    previewPhoto.value.is_rejected = previewPhoto.value.is_rejected ? 0 : 1
  }
}

// 批量操作
async function handleBatchRate(rating: number) {
  const ids = Array.from(selection.selectedIds)
  if (ids.length === 0) return
  await window.electronAPI.photos.batchUpdateRating(ids, rating)
  // 更新本地状态
  for (const photo of photosStore.photos) {
    if (selection.selectedIds.has(photo.id)) {
      photo.rating = rating
    }
  }
}

async function handleBatchColorLabel(label: string | null) {
  const ids = Array.from(selection.selectedIds)
  for (const id of ids) {
    await window.electronAPI.photos.updateColorLabel(id, label)
  }
  for (const photo of photosStore.photos) {
    if (selection.selectedIds.has(photo.id)) {
      photo.color_label = label
    }
  }
}

async function handleBatchReject() {
  const ids = Array.from(selection.selectedIds)
  for (const id of ids) {
    await window.electronAPI.photos.updateRejected(id, true)
  }
  for (const photo of photosStore.photos) {
    if (selection.selectedIds.has(photo.id)) {
      photo.is_rejected = 1
    }
  }
}

async function handleBatchDelete() {
  const ids = Array.from(selection.selectedIds)
  if (ids.length === 0) return
  const result = await window.electronAPI.photos.batchDelete(ids)
  if (result.success > 0) {
    photosStore.photos = photosStore.photos.filter(p => !selection.selectedIds.has(p.id))
    selection.clear()
  }
}

function handleBatchExport() {
  router.push({ name: 'batch-export', query: { ids: Array.from(selection.selectedIds).join(',') } })
}

const showAlbumPicker = ref(false)

function handleBatchAddToAlbum() {
  showAlbumPicker.value = true
}

async function handleAlbumSelected(albumId: number) {
  const ids = Array.from(selection.selectedIds)
  if (ids.length === 0) return
  const result = await window.electronAPI.albums.addPhotos(albumId, ids)
  if (result.success > 0) {
    photosStore.photos = photosStore.photos.filter(p => !selection.selectedIds.has(p.id))
    selection.clear()
    toast.show(t('toast.addToAlbumSuccess', { count: result.success }), 'success')
  }
  if (result.failed > 0) {
    toast.show(t('toast.addToAlbumFailed', { count: result.failed }), 'error')
  }
}

// 右键菜单
const contextMenu = ref({ visible: false, x: 0, y: 0 })
const contextPhoto = ref<Photo | null>(null)

function handleContextMenu(event: MouseEvent, photo: Photo) {
  contextPhoto.value = photo
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY }
}

function closeContextMenu() {
  contextMenu.value.visible = false
  contextPhoto.value = null
}

async function copyPath(path: string) {
  await navigator.clipboard.writeText(path)
}

async function showInFinder(path: string) {
  if (window.electronAPI) {
    await window.electronAPI.photos.showInFolder(path)
  }
}

async function contextRate(rating: number) {
  if (!contextPhoto.value) return
  await photosStore.updateRating(contextPhoto.value.id, rating)
}

async function contextColorLabel(label: string | null) {
  if (!contextPhoto.value) return
  await photosStore.updateColorLabel(contextPhoto.value.id, label)
}

async function contextReject() {
  if (!contextPhoto.value) return
  await window.electronAPI.photos.updateRejected(contextPhoto.value.id, !contextPhoto.value.is_rejected)
  contextPhoto.value.is_rejected = contextPhoto.value.is_rejected ? 0 : 1
}

async function contextDelete() {
  if (!contextPhoto.value) return
  const result = await window.electronAPI.photos.batchDelete([contextPhoto.value.id])
  if (result.success > 0) {
    photosStore.photos = photosStore.photos.filter(p => p.id !== contextPhoto.value?.id)
  }
}

// 从相册移除
const showRemoveConfirm = ref(false)
const pendingRemovePhoto = ref<Photo | null>(null)

function contextRemoveFromAlbum() {
  if (!contextPhoto.value) return
  pendingRemovePhoto.value = contextPhoto.value
  showRemoveConfirm.value = true
}

async function confirmRemoveFromAlbum() {
  if (!pendingRemovePhoto.value || !window.electronAPI) return
  const albumId = Number(route.params.id)
  await window.electronAPI.albums.removePhoto(albumId, pendingRemovePhoto.value.id)
  photosStore.photos = photosStore.photos.filter(p => p.id !== pendingRemovePhoto.value?.id)
  showRemoveConfirm.value = false
  pendingRemovePhoto.value = null
  toast.show(t('toast.removeFromAlbumSuccess'), 'success')
}

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444', yellow: '#eab308', green: '#22c55e', blue: '#3b82f6', purple: '#a855f7'
}

const contextMenuItems = computed<MenuItem[]>(() => {
  if (!contextPhoto.value) return []
  const photo = contextPhoto.value
  return [
    { label: t('contextMenu.copyPath'), icon: ClipboardCopy, action: () => copyPath(photo.file_path) },
    { label: t('contextMenu.showInFinder'), icon: FolderOpen, action: () => showInFinder(photo.file_path) },
    { divider: true, label: '' },
    { label: t('contextMenu.rate'), icon: Star, children: [] },
    ...([1, 2, 3, 4, 5].map(star => ({
      label: '★'.repeat(star),
      icon: Star,
      action: () => contextRate(star)
    }))),
    { label: t('contextMenu.clearRating'), icon: X, action: () => contextRate(0) },
    { divider: true, label: '' },
    { label: t('contextMenu.colorLabel'), icon: Circle, children: [] },
    ...([
      { key: 'red', label: t('colorLabels.red'), action: () => contextColorLabel('red') },
      { key: 'yellow', label: t('colorLabels.yellow'), action: () => contextColorLabel('yellow') },
      { key: 'green', label: t('colorLabels.green'), action: () => contextColorLabel('green') },
      { key: 'blue', label: t('colorLabels.blue'), action: () => contextColorLabel('blue') },
      { key: 'purple', label: t('colorLabels.purple'), action: () => contextColorLabel('purple') }
    ].map(cl => ({
      label: cl.label,
      icon: Circle,
      iconColor: COLOR_MAP[cl.key],
      action: cl.action
    }))),
    { label: t('contextMenu.clearLabel'), icon: X, action: () => contextColorLabel(null) },
    { divider: true, label: '' },
    { label: photo.is_rejected ? t('contextMenu.unmarkReject') : t('contextMenu.markReject'), icon: Ban, action: contextReject },
    { divider: true, label: '' },
    { label: t('contextMenu.delete'), icon: Trash2, action: contextDelete },
    ...(route.name === 'album' ? [
      { divider: true as const, label: '' },
      { label: t('album.removeFromAlbum'), icon: Ban, action: contextRemoveFromAlbum }
    ] : [])
  ]
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 批量操作栏 -->
    <BatchActionBar v-if="selection.count > 0"
                    :count="selection.count"
                    @rate="handleBatchRate"
                    @color-label="handleBatchColorLabel"
                    @reject="handleBatchReject"
                    @delete="handleBatchDelete"
                    @export="handleBatchExport"
                    @add-to-album="handleBatchAddToAlbum"
                    @select-all="selection.selectAll(photosStore.photos.map(p => p.id))"
                    @deselect-all="selection.clear"
                    @clear="selection.clear" />

    <!-- Loading 状态 -->
    <div v-if="photosStore.loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
        <span class="text-sm text-text-muted">{{ $t('photos.loading') }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="photosStore.photos.length === 0" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4 text-center">
        <span class="text-4xl opacity-20">◈</span>
        <div>
          <p class="text-sm text-text-secondary mb-1">{{ $t('photos.empty') }}</p>
          <p class="text-xs text-text-muted">{{ $t('photos.emptyHint') }}</p>
        </div>
      </div>
    </div>

    <!-- 照片网格 -->
    <template v-else>
      <PhotoGrid :photos="photosStore.photos"
                 :has-more="photosStore.hasMore"
                 :loading-more="photosStore.loadingMore"
                 @preview="openPreview"
                 @rate="handleRate"
                 @load-more="photosStore.fetchNextPage"
                 @contextmenu="handleContextMenu" />
      <PhotoPreview :photo="previewPhoto"
                    :visible="showPreview"
                    @close="closePreview"
                    @prev="prevPhoto"
                    @next="nextPhoto"
                    @rate="(r) => previewPhoto && handleRate(previewPhoto.id, r)"
                    @color-label="handleColorLabel"
                    @reject="handleReject" />

      <ContextMenu :visible="contextMenu.visible"
                   :x="contextMenu.x"
                   :y="contextMenu.y"
                   :items="contextMenuItems"
                   @close="closeContextMenu" />

      <AlbumPickerDialog :visible="showAlbumPicker"
                         @close="showAlbumPicker = false"
                         @select="handleAlbumSelected" />

      <ConfirmDialog :visible="showRemoveConfirm"
                     :title="$t('album.removeFromAlbum')"
                     :message="$t('album.confirmRemove')"
                     :confirm-text="$t('album.removeFromAlbum')"
                     @confirm="confirmRemoveFromAlbum"
                     @cancel="showRemoveConfirm = false" />
    </template>
  </div>
</template>
