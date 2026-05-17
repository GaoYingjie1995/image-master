<script setup lang="ts">
import { useToastStore } from '../../stores/toast'

const toast = useToastStore()

const typeStyles: Record<string, string> = {
  success: 'bg-green-500/15 border-green-500/30 text-green-400',
  error: 'bg-red-500/15 border-red-500/30 text-red-400',
  info: 'bg-blue-500/15 border-blue-500/30 text-blue-400'
}
</script>

<template>
  <div class="fixed top-12 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div v-for="t in toast.toasts" :key="t.id"
           class="pointer-events-auto px-4 py-2.5 rounded-lg border backdrop-blur-sm text-sm max-w-xs shadow-lg"
           :class="typeStyles[t.type]"
           @click="toast.remove(t.id)">
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
