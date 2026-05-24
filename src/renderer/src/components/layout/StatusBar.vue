<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ selectedCount: number }>()

const { t } = useI18n()
</script>

<template>
  <div class="h-7 bg-bg-primary border-t border-border-subtle flex items-center px-4 gap-4">
    <div class="flex items-center gap-1.5 text-[11px] text-text-muted">
      <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
      {{ t('status.ready') }}
    </div>
    <span class="text-[11px] text-text-muted">{{ t('status.selected', { count: selectedCount }) }}</span>
    <span class="ml-auto text-[11px] text-text-muted font-mono">v0.1.0</span>
  </div>
</template>
