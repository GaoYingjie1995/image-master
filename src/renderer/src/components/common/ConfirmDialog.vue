<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    emit('cancel')
  }
}

onMounted(() => { window.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { window.removeEventListener('keydown', handleKeydown) })
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
           @click.self="$emit('cancel')">
        <div class="bg-bg-secondary border border-border-film rounded-xl p-5 w-80 shadow-2xl">
          <h3 class="text-sm font-medium text-text-primary mb-2">{{ title }}</h3>
          <p class="text-xs text-text-secondary mb-5">{{ message }}</p>
          <div class="flex justify-end gap-2">
            <button @click="$emit('cancel')"
                    class="px-4 py-1.5 text-xs rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover border border-border-subtle transition-colors">
              {{ cancelText || t('common.cancel') }}
            </button>
            <button @click="$emit('confirm')"
                    class="px-4 py-1.5 text-xs rounded-lg transition-colors"
                    :class="danger ? 'bg-fuji-red/15 text-fuji-red hover:bg-fuji-red/25 border border-fuji-red/20' : 'bg-fuji-warm/15 text-fuji-warm hover:bg-fuji-warm/25 border border-fuji-warm/20'">
              {{ confirmText || t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
