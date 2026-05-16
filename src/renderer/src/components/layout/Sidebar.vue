<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

interface Album { id: number; name: string }
const albums = ref<Album[]>([])

onMounted(async () => {
  if (window.electronAPI) {
    albums.value = await window.electronAPI.albums.getAll()
  }
})

const navItems = [
  { icon: '◈', label: '所有照片', route: '/' },
  { icon: '☆', label: '已评分', route: '/rated' },
  { icon: '◉', label: '今日导入', route: '/today' },
  { icon: '✕', label: '已拒绝', route: '/rejected' }
]

const toolItems = [
  { icon: '⧉', label: '重复检测', route: '/duplicates' },
  { icon: '⊘', label: 'RAW 清理', route: '/cleanup' },
  { icon: '⇄', label: '批量重命名', route: '/batch-rename' },
  { icon: '↗', label: '批量导出', route: '/batch-export' }
]

const analysisItems = [
  { icon: '◉', label: '地图视图', route: '/map' }
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <aside class="w-[220px] bg-bg-primary border-r border-white/5 flex flex-col overflow-y-auto py-3">
    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">浏览</div>
      <div v-for="item in navItems" :key="item.route"
           @click="router.push(item.route)"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px] relative"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-[18px] text-center text-sm shrink-0">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2"></div>

    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">工具</div>
      <div v-for="item in toolItems" :key="item.route"
           @click="router.push(item.route)"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px]"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-[18px] text-center text-sm shrink-0">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2"></div>

    <div class="px-3 mb-2">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">分析</div>
      <div v-for="item in analysisItems" :key="item.route"
           @click="router.push(item.route)"
           class="flex items-center gap-2.5 py-[7px] px-3 rounded-md cursor-pointer transition-colors text-[13px]"
           :class="isActive(item.route) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-[18px] text-center text-sm shrink-0">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="h-px bg-white/5 mx-3 my-2"></div>

    <div class="px-3 flex-1">
      <div class="text-[10px] font-medium text-text-muted uppercase tracking-[1.5px] px-3 pb-1.5">相册</div>
      <div v-for="album in albums" :key="album.id"
           @click="router.push(`/album/${album.id}`)"
           class="flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer transition-colors text-xs"
           :class="isActive(`/album/${album.id}`) ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'">
        <span class="w-2 h-2 rounded-full bg-accent shrink-0"></span>
        <span>{{ album.name }}</span>
      </div>
      <div class="flex items-center gap-2 py-1.5 px-3 text-xs text-text-muted cursor-pointer hover:text-accent transition-colors">
        + 新建相册
      </div>
    </div>
  </aside>
</template>
