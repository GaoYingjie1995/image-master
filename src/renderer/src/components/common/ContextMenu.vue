<script setup lang="ts">
import { ref, onMounted, onUnmounted, type Component } from 'vue'

export interface MenuItem {
  label: string
  icon?: string | Component
  iconColor?: string
  action?: () => void
  divider?: boolean
  disabled?: boolean
  children?: MenuItem[]
}

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
           class="fixed z-[100] min-w-[160px] bg-bg-primary/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl shadow-black/50 py-1"
           :style="{ left: x + 'px', top: y + 'px' }">
        <template v-for="(item, i) in items" :key="i">
          <div v-if="item.divider" class="h-px bg-white/5 my-1"></div>
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
