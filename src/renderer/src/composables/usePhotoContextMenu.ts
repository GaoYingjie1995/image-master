import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCopy, FolderOpen, Star, X, Ban, Trash2, Circle, Images } from 'lucide-vue-next'
import { COLOR_MAP } from '@renderer/utils/format'
import type { MenuItem } from '../components/common/ContextMenu.vue'
import type { Photo } from '../stores/photos'

export function usePhotoContextMenu(options: {
  onRate: (id: number, rating: number) => Promise<void>
  onColorLabel: (id: number, label: string | null) => Promise<void>
  onReject: (id: number, rejected: boolean) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onSetCover?: (photoId: number) => Promise<void>
  isAlbumRoute?: () => boolean
}) {
  const { t } = useI18n()

  const contextMenu = ref({ visible: false, x: 0, y: 0 })
  const contextPhoto = ref<Photo | null>(null)

  function open(event: MouseEvent, photo: Photo) {
    contextPhoto.value = photo
    contextMenu.value = { visible: true, x: event.clientX, y: event.clientY }
  }

  function close() {
    contextMenu.value.visible = false
    contextPhoto.value = null
  }

  async function copyPath() {
    if (contextPhoto.value) {
      await navigator.clipboard.writeText(contextPhoto.value.file_path)
    }
  }

  async function showInFinder() {
    if (contextPhoto.value?.file_path) {
      await window.electronAPI?.photos.showInFolder(contextPhoto.value.file_path)
    }
  }

  const menuItems = computed<MenuItem[]>(() => {
    if (!contextPhoto.value) return []
    const photo = contextPhoto.value
    return [
      { label: t('contextMenu.copyPath'), icon: ClipboardCopy, action: () => copyPath() },
      { label: t('contextMenu.showInFinder'), icon: FolderOpen, action: () => showInFinder() },
      { divider: true, label: '' },
      { label: t('contextMenu.rate'), icon: Star, children: [] },
      ...([1, 2, 3, 4, 5].map(star => ({
        label: '★'.repeat(star),
        icon: Star,
        action: () => options.onRate(photo.id, star)
      }))),
      { label: t('contextMenu.clearRating'), icon: X, action: () => options.onRate(photo.id, 0) },
      { divider: true, label: '' },
      { label: t('contextMenu.colorLabel'), icon: Circle, children: [] },
      ...([
        { key: 'red', label: t('colorLabels.red'), action: () => options.onColorLabel(photo.id, 'red') },
        { key: 'yellow', label: t('colorLabels.yellow'), action: () => options.onColorLabel(photo.id, 'yellow') },
        { key: 'green', label: t('colorLabels.green'), action: () => options.onColorLabel(photo.id, 'green') },
        { key: 'blue', label: t('colorLabels.blue'), action: () => options.onColorLabel(photo.id, 'blue') },
        { key: 'purple', label: t('colorLabels.purple'), action: () => options.onColorLabel(photo.id, 'purple') }
      ].map(cl => ({
        label: cl.label,
        icon: Circle,
        iconColor: COLOR_MAP[cl.key],
        action: cl.action
      }))),
      { label: t('contextMenu.clearLabel'), icon: X, action: () => options.onColorLabel(photo.id, null) },
      { divider: true, label: '' },
      { label: photo.is_rejected ? t('contextMenu.unmarkReject') : t('contextMenu.markReject'), icon: Ban, action: () => options.onReject(photo.id, !photo.is_rejected) },
      { divider: true, label: '' },
      { label: t('contextMenu.delete'), icon: Trash2, action: () => options.onDelete(photo.id) },
      ...(options.isAlbumRoute?.() ? [
        { divider: true as const, label: '' },
        { label: t('album.setAsCover'), icon: Images, action: () => options.onSetCover?.(photo.id) }
      ] : [])
    ]
  })

  return { contextMenu, contextPhoto, open, close, menuItems }
}
