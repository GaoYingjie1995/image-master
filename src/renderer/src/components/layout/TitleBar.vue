<script setup lang="ts">
const isMac = window.electronAPI?.platform === 'darwin'
</script>

<template>
  <div class="h-10 bg-bg-primary border-b border-white/5 flex items-center px-4 select-none app-drag"
       :class="isMac ? 'pl-20' : ''">
    <span class="font-display text-sm font-semibold text-accent tracking-wide">Image Master</span>
    <span class="ml-2 text-[10px] text-text-muted tracking-widest uppercase font-sans font-light">PRO</span>
    <div class="ml-auto flex gap-1 app-no-drag">
      <button class="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              @click="$emit('import')">
        ↓
      </button>
      <button class="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              @click="$router.push('/settings')">
        ⚙
      </button>
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
