<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { MenuItem } from '@renderer/types/menu'

export type { MenuItem }

const props = defineProps<{
  items: MenuItem[]
  x: number
  y: number
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(props.x)
const adjustedY = ref(props.y)

// 调整菜单位置防止溢出屏幕
function adjustPosition() {
  if (!menuRef.value) return

  const rect = menuRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const menuWidth = rect.width || 160
  const menuHeight = rect.height || 200

  let x = props.x
  let y = props.y

  if (x + menuWidth > viewportWidth) {
    x = viewportWidth - menuWidth - 8
  }

  if (y + menuHeight > viewportHeight) {
    y = viewportHeight - menuHeight - 8
  }

  if (x < 8) {
    x = 8
  }

  if (y < 8) {
    y = 8
  }

  adjustedX.value = x
  adjustedY.value = y
}

watch(() => props.visible, async (visible) => {
  if (visible) {
    adjustedX.value = props.x
    adjustedY.value = props.y
    await nextTick()
    adjustPosition()
  }
})

watch(() => [props.x, props.y], () => {
  adjustedX.value = props.x
  adjustedY.value = props.y
})

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

function handleAction(item: MenuItem) {
  if (item.disabled || item.children) return
  item.action?.()
  emit('close')
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('contextmenu', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('contextmenu', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div v-if="visible" ref="menuRef"
           class="fixed z-[100] min-w-[160px] bg-bg-primary/95 backdrop-blur-md border border-border-film rounded-lg shadow-2xl shadow-black/50 py-1"
           :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }">
        <template v-for="(item, i) in items" :key="i">
          <div v-if="item.divider" class="h-px bg-border-subtle my-1"></div>
          <div v-else
               @click="handleAction(item)"
               class="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors"
               :class="item.disabled ? 'text-text-muted/50 cursor-not-allowed' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
            <span v-if="item.icon && typeof item.icon === 'object'" class="w-4 h-4 flex items-center justify-center shrink-0">
              <component :is="item.icon" :size="14" :style="item.iconColor ? { color: item.iconColor } : {}" />
            </span>
            <span v-else-if="item.icon" class="w-4 text-center text-[11px] shrink-0" :style="item.iconColor ? { color: item.iconColor } : {}">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu-enter-active, .context-menu-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.context-menu-enter-from, .context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
