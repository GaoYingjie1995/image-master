<script setup lang="ts">
defineProps<{ selectedCount: number }>()
</script>

<template>
  <div class="h-7 bg-bg-primary border-t border-white/5 flex items-center px-4 gap-4">
    <div class="flex items-center gap-1.5 text-[11px] text-text-muted">
      <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
      就绪
    </div>
    <span class="text-[11px] text-text-muted">已选择 {{ selectedCount }} 张</span>
    <span class="ml-auto text-[11px] text-text-muted">v0.1.0</span>
  </div>
</template>
