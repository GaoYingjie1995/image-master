<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', name: string): void
}>()

const name = ref('')

watch(() => props.visible, (val) => {
  if (val) name.value = ''
})

function handleCreate() {
  if (name.value.trim()) {
    emit('create', name.value.trim())
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
           @click.self="emit('close')">
        <div class="bg-bg-secondary rounded-xl border border-white/5 p-6 w-80">
          <h3 class="font-display text-lg text-accent mb-4">新建相册</h3>
          <input v-model="name" placeholder="相册名称"
                 class="w-full bg-bg-tertiary border border-white/5 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/30 mb-4"
                 @keyup.enter="handleCreate" />
          <div class="flex gap-2 justify-end">
            <button @click="emit('close')"
                    class="px-4 py-1.5 text-sm rounded-lg text-text-secondary hover:bg-bg-hover transition-colors">
              取消
            </button>
            <button @click="handleCreate"
                    class="px-4 py-1.5 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              创建
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
