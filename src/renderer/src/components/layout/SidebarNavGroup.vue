<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import type { Component } from 'vue'

defineProps<{
  title: string
  items: Array<{ icon: Component; labelKey: string; route: string }>
}>()

const router = useRouter()
const route = useRoute()

function isActive(path: string) {
  return route.path === path
}

function navigate(path: string) {
  router.push(path)
}

function handleKeydown(e: KeyboardEvent, path: string) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    navigate(path)
  }
}
</script>

<template>
  <div class="px-3 mb-2">
    <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5" role="heading" aria-level="2">{{ title }}</div>
    <div v-for="item in items" :key="item.route"
         @click="navigate(item.route)"
         @keydown="handleKeydown($event, item.route)"
         tabindex="0"
         role="link"
         :aria-current="isActive(item.route) ? 'page' : undefined"
         class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px] relative outline-none focus:ring-1 focus:ring-fuji-warm/50"
         :class="isActive(item.route) ? 'bg-fuji-warm-dim text-fuji-warm' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
      <component :is="item.icon" :size="16" class="shrink-0" aria-hidden="true" />
      <span>{{ $t(item.labelKey) }}</span>
    </div>
  </div>
</template>
