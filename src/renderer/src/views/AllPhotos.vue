<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePhotosStore } from '../stores/photos'
import { useSelectionStore } from '../stores/selection'
import { useAlbumsStore } from '../stores/albums'
import { createLocalFileUrl } from '@shared/local-protocol'
import PhotoGrid from '../components/photo/PhotoGrid.vue'
import PhotoPreview from '../components/photo/PhotoPreview.vue'
import BatchActionBar from '../components/common/BatchActionBar.vue'
import ContextMenu from '../components/common/ContextMenu.vue'
import { useToastStore } from '../stores/toast'
import { usePhotoContextMenu } from '../composables/usePhotoContextMenu'
import { useBatchOperations } from '../composables/useBatchOperations'
import type { Album } from '../stores/albums'

const route = useRoute()
const router = useRouter()
const photosStore = usePhotosStore()
const selection = useSelectionStore()
const albumsStore = useAlbumsStore()
const toast = useToastStore()
const { t } = useI18n()

const childAlbums = ref<Album[]>([])
const childCoverUrls = ref<Map<number, string>>(new Map())

// --- 预览状态 ---
const previewPhotoId = ref<number | null>(null)
const showPreview = ref(false)
const previewPhoto = computed(() =>
  previewPhotoId.value === null ? null : photosStore.photos.find(p => p.id === previewPhotoId.value) || null
)
const previewIndex = computed(() =>
  previewPhotoId.value === null ? -1 : photosStore.photos.findIndex(p => p.id === previewPhotoId.value)
)

// --- 批量操作 ---
const { batchRate, batchColorLabel, batchReject, batchDelete } = useBatchOperations()

// --- 右键菜单 ---
async function singleRate(id: number, rating: number) {
  await photosStore.updateRating(id, rating)
}
async function singleColorLabel(id: number, label: string | null) {
  await photosStore.updateColorLabel(id, label)
}
async function singleReject(id: number, rejected: boolean) {
  await window.electronAPI.photos.updateRejected(id, rejected)
  const photo = photosStore.photos.find(p => p.id === id)
  if (photo) photo.is_rejected = rejected ? 1 : 0
}
async function singleDelete(id: number) {
  const result = await window.electronAPI.photos.batchDelete([id])
  if (result.success > 0) {
    photosStore.photos = photosStore.photos.filter(p => p.id !== id)
  }
}
async function setAsCover(photoId: number) {
  await albumsStore.setCover(Number(route.params.id), photoId)
  toast.show(t('toast.coverUpdated'), 'success')
}

const { contextMenu, open: openContextMenu, close: closeContextMenu, menuItems: contextMenuItems } = usePhotoContextMenu({
  onRate: singleRate,
  onColorLabel: singleColorLabel,
  onReject: singleReject,
  onDelete: singleDelete,
  onSetCover: setAsCover,
  isAlbumRoute: () => route.name === 'album'
})

// --- 子相册 ---
function findAlbumInTree(tree: Album[], id: number): Album | undefined {
  for (const album of tree) {
    if (album.id === id) return album
    if (album.children?.length) {
      const found = findAlbumInTree(album.children, id)
      if (found) return found
    }
  }
  return undefined
}

async function loadChildrenAlbums() {
  if (route.name === 'album' && route.params.id) {
    await albumsStore.fetchTree()
    const album = findAlbumInTree(albumsStore.albums, Number(route.params.id))
    childAlbums.value = album?.children || []
    for (const child of childAlbums.value) {
      if (child.cover_photo_id && window.electronAPI) {
        try {
          const path = await window.electronAPI.photos.getThumbnail(child.cover_photo_id)
          if (path) childCoverUrls.value.set(child.id, createLocalFileUrl('local-thumbnail', path))
        } catch { /* 忽略 */ }
      }
    }
  } else {
    childAlbums.value = []
  }
}

// --- 照片加载 ---
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
    loadChildrenAlbums()
  } else if (name === 'smart-album' && route.params.id) {
    photosStore.fetchSmartAlbumPhotos(Number(route.params.id))
  } else {
    photosStore.fetchPhotos()
  }
}

watch(
  [() => route.name, () => route.params.id, () => photosStore.sortBy],
  loadPhotos,
  { immediate: true }
)

// --- 预览操作 ---
function openPreview(id: number) {
  previewPhotoId.value = id
  showPreview.value = true
}
function closePreview() {
  showPreview.value = false
}
function prevPhoto() {
  if (previewIndex.value > 0) previewPhotoId.value = photosStore.photos[previewIndex.value - 1].id
}
function nextPhoto() {
  if (previewIndex.value < photosStore.photos.length - 1) previewPhotoId.value = photosStore.photos[previewIndex.value + 1].id
}

// --- 预览中的快捷操作 ---
async function handleRate(id: number, rating: number) {
  await photosStore.updateRating(id, rating)
}
async function handleColorLabel(label: string | null) {
  if (previewPhoto.value) await photosStore.updateColorLabel(previewPhoto.value.id, label)
}
async function handleReject() {
  if (previewPhoto.value) {
    await window.electronAPI.photos.updateRejected(previewPhoto.value.id, !previewPhoto.value.is_rejected)
    previewPhoto.value.is_rejected = previewPhoto.value.is_rejected ? 0 : 1
  }
}
function handleBatchExport() {
  router.push({ name: 'batch-export', query: { ids: Array.from(selection.selectedIds).join(',') } })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <BatchActionBar v-if="selection.count > 0"
                    :count="selection.count"
                    @rate="batchRate"
                    @color-label="batchColorLabel"
                    @reject="batchReject"
                    @delete="batchDelete"
                    @export="handleBatchExport"
                    @select-all="selection.selectAll(photosStore.photos.map(p => p.id))"
                    @deselect-all="selection.clear"
                    @clear="selection.clear" />

    <div v-if="photosStore.loading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
        <span class="text-sm text-text-muted">{{ $t('photos.loading') }}</span>
      </div>
    </div>

    <div v-else-if="photosStore.photos.length === 0" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4 text-center">
        <span class="text-4xl opacity-20">◈</span>
        <div>
          <p class="text-sm text-text-secondary mb-1">{{ $t('photos.empty') }}</p>
          <p class="text-xs text-text-muted">{{ $t('photos.emptyHint') }}</p>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="childAlbums.length > 0" class="px-4 py-3">
        <div class="text-xs font-medium text-text-muted mb-2">{{ $t('album.childAlbums') }}</div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          <div v-for="child in childAlbums" :key="child.id" class="group cursor-pointer"
               @click="router.push(`/album/${child.id}`)">
            <div class="aspect-square rounded-lg overflow-hidden bg-bg-tertiary">
              <img v-if="childCoverUrls.get(child.id)" :src="childCoverUrls.get(child.id)"
                   class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div class="mt-1 text-sm text-text-primary truncate">{{ child.name }}</div>
            <div class="text-xs text-text-muted">{{ child.photoCount || 0 }} 张</div>
          </div>
        </div>
      </div>

      <PhotoGrid :photos="photosStore.photos"
                 :has-more="photosStore.hasMore"
                 :loading-more="photosStore.loadingMore"
                 @preview="openPreview"
                 @rate="handleRate"
                 @load-more="photosStore.fetchNextPage"
                 @contextmenu="(e, p) => openContextMenu(e, p)" />
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
    </template>
  </div>
</template>
