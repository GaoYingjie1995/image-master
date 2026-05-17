<script setup lang="ts">
import { Download, Settings } from 'lucide-vue-next'

const isMac = window.electronAPI?.platform === 'darwin'
const isWindows = window.electronAPI?.platform === 'win32'

const emit = defineEmits<{
  import: []
}>()

function handleImport() {
  emit('import')
}

function minimize() {
  window.electronAPI?.window.minimize()
}

function maximize() {
  window.electronAPI?.window.maximize()
}

function close() {
  window.electronAPI?.window.close()
}
</script>

<template>
  <div class="h-10 bg-bg-primary border-b border-white/5 flex items-center px-4 select-none app-drag"
       :class="isMac ? 'pl-20' : ''">
    <span class="font-display text-sm font-semibold text-accent tracking-wide">Image Master</span>
    <span class="ml-2 text-[10px] text-text-muted tracking-widest uppercase font-sans font-light">PRO</span>
    <div class="ml-auto flex gap-1 app-no-drag">
      <button class="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              @click="handleImport"
              title="导入照片"
              aria-label="导入照片">
        <Download :size="15" />
      </button>
      <button class="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              @click="$router.push('/settings')"
              title="设置"
              aria-label="设置">
        <Settings :size="15" />
      </button>

      <!-- Windows/Linux 窗口控制按钮 -->
      <template v-if="!isMac">
        <div class="w-px h-5 bg-white/10 mx-1"></div>
        <button class="w-8 h-7 flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                @click="minimize"
                title="最小化"
                aria-label="最小化">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button class="w-8 h-7 flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                @click="maximize"
                title="最大化"
                aria-label="最大化">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
        </button>
        <button class="w-8 h-7 flex items-center justify-center text-text-secondary hover:bg-red-500/80 hover:text-white transition-colors"
                @click="close"
                title="关闭"
                aria-label="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/></svg>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.app-drag {
  -webkit-app-region: drag;
}
.app-no-drag {
  -webkit-app-region: no-drag;
}
</style>
