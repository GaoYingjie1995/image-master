<script setup lang="ts">
import { Download, Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
              :title="t('common.importPhotos')"
              :aria-label="t('common.importPhotos')">
        <Download :size="15" />
      </button>
      <button class="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              @click="$router.push('/settings')"
              :title="t('common.settings')"
              :aria-label="t('common.settings')">
        <Settings :size="15" />
      </button>

      <!-- Windows/Linux 窗口控制按钮 -->
      <template v-if="!isMac">
        <div class="w-px h-5 bg-white/10 mx-1"></div>
        <button class="w-8 h-7 flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                @click="minimize"
                :title="t('common.minimize')"
                :aria-label="t('common.minimize')">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button class="w-8 h-7 flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                @click="maximize"
                :title="t('common.maximize')"
                :aria-label="t('common.maximize')">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
        </button>
        <button class="w-8 h-7 flex items-center justify-center text-text-secondary hover:bg-red-500/80 hover:text-white transition-colors"
                @click="close"
                :title="t('common.close')"
                :aria-label="t('common.close')">
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
