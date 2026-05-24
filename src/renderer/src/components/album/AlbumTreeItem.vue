<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAlbumsStore, type Album } from '../../stores/albums'
import { ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  album: Album
  depth: number
  coverUrl?: string
  coverUrls?: Map<number, string>
  isRenaming: boolean
}>()

const emit = defineEmits<{
  contextmenu: [event: MouseEvent, album: Album]
  'update:rename': [value: string]
  'confirm-rename': []
  'cancel-rename': []
}>()

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const store = useAlbumsStore()

const isActive = computed(() => route.path === `/album/${props.album.id}`)
const hasChildren = computed(() => !!(props.album.children && props.album.children.length > 0))
const isCollapsed = computed(() => props.album.is_collapsed === 1)

function navigate() {
  router.push(`/album/${props.album.id}`)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    navigate()
  }
}

function toggleCollapse(e: Event) {
  e.stopPropagation()
  store.setCollapsed(props.album.id, props.album.is_collapsed === 0)
}

function showContext(e: MouseEvent) {
  emit('contextmenu', e, props.album)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer transition-colors text-xs outline-none focus:ring-1 focus:ring-fuji-warm/50"
      :class="isActive ? 'bg-fuji-warm-dim text-fuji-warm' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'"
      :style="{ paddingLeft: `${12 + depth * 16}px` }"
      tabindex="0"
      role="link"
      :aria-current="isActive ? 'page' : undefined"
      @click="navigate"
      @keydown="handleKeydown"
      @contextmenu.prevent="showContext"
    >
      <ChevronRight
        v-if="hasChildren"
        :size="14"
        class="shrink-0 transition-transform"
        :class="isCollapsed ? '' : 'rotate-90'"
        aria-hidden="true"
        @click.stop="toggleCollapse"
      />
      <span v-else class="w-3.5 shrink-0"></span>

      <img v-if="coverUrl || (coverUrls && coverUrls.get(album.id))" :src="coverUrl || coverUrls?.get(album.id)" class="w-5 h-5 rounded object-cover shrink-0 film-classic-chrome" :alt="album.name" />
      <span v-else class="w-2 h-2 rounded-full bg-fuji-warm shrink-0" aria-hidden="true"></span>

      <span v-if="isRenaming" class="flex-1 min-w-0">
        <input
          :value="album.name"
          @input="emit('update:rename', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('confirm-rename')"
          @keyup.escape="emit('cancel-rename')"
          @blur="emit('confirm-rename')"
          class="w-full bg-bg-tertiary border border-fuji-warm/30 rounded px-1 py-0.5 text-xs text-text-primary outline-none"
          autofocus
        />
      </span>
      <span v-else class="truncate flex-1 min-w-0">{{ album.name }}</span>

      <span v-if="album.photoCount != null && album.photoCount > 0" class="text-[10px] text-text-muted shrink-0">
        {{ t('album.photoCount', { count: album.photoCount }) }}
      </span>
    </div>

    <template v-if="hasChildren && !isCollapsed">
      <AlbumTreeItem
        v-for="child in album.children"
        :key="child.id"
        :album="child"
        :depth="depth + 1"
        :cover-urls="coverUrls"
        :is-renaming="false"
        @contextmenu="(e, a) => emit('contextmenu', e, a)"
        @update:rename="emit('update:rename', $event)"
        @confirm-rename="emit('confirm-rename')"
        @cancel-rename="emit('cancel-rename')"
      />
    </template>
  </div>
</template>
