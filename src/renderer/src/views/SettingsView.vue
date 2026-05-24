<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import { useKeyboard, type KeyBindings } from '../composables/useKeyboard'
import { useToastStore } from '../stores/toast'
import { formatFileSize as formatSize } from '@renderer/utils/format'

const { locale, t } = useI18n()

const settingsStore = useSettingsStore()
const toast = useToastStore()
const deleteLinkedRaw = ref(false)
const theme = ref<'dark' | 'light'>('dark')
const language = ref<'zh-CN' | 'en'>('zh-CN')
const { DEFAULT_BINDINGS } = useKeyboard({})
const keyBindings = ref<KeyBindings>({ ...DEFAULT_BINDINGS })

const cacheInfo = ref<{ fileCount: number; totalSize: number }>({ fileCount: 0, totalSize: 0 })
const clearingCache = ref(false)
const rescanning = ref(false)

onMounted(async () => {
  await settingsStore.fetchSettings()
  deleteLinkedRaw.value = settingsStore.getSetting('deleteLinkedRaw', false)
  theme.value = settingsStore.getSetting('theme', 'dark')
  language.value = settingsStore.getSetting('language', 'zh-CN')
  keyBindings.value = settingsStore.getSetting('keyBindings', { ...DEFAULT_BINDINGS })
  applyTheme()
  loadCacheInfo()
})

async function loadCacheInfo() {
  if (window.electronAPI) {
    cacheInfo.value = await window.electronAPI.photos.getCacheSize()
  }
}

async function handleClearCache() {
  clearingCache.value = true
  try {
    if (window.electronAPI) {
      await window.electronAPI.photos.clearCache()
      await loadCacheInfo()
    }
  } finally {
    clearingCache.value = false
  }
}

async function toggleDeleteLinkedRaw() {
  deleteLinkedRaw.value = !deleteLinkedRaw.value
  await settingsStore.setSetting('deleteLinkedRaw', deleteLinkedRaw.value)
}

async function handleRescan() {
  rescanning.value = true
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.photos.rescanMetadata()
      toast.show(t('cache.rescanSuccess') + `: ${result.updated}/${result.total}`, 'success')
    }
  } catch {
    toast.show(t('cache.rescanFailed'), 'error')
  } finally {
    rescanning.value = false
  }
}

async function setTheme(t: 'dark' | 'light') {
  theme.value = t
  await settingsStore.setSetting('theme', t)
  applyTheme()
}

function applyTheme() {
  document.documentElement.classList.toggle('theme-light', theme.value === 'light')
}

async function setLanguage(lang: 'zh-CN' | 'en') {
  language.value = lang
  locale.value = lang
  await settingsStore.setSetting('language', lang)
}

async function updateKeyBinding(action: keyof KeyBindings, key: string) {
  // 检测快捷键冲突
  const conflicting = Object.entries(keyBindings.value).find(
    ([k, v]) => k !== action && v === key && v !== ''
  )
  if (conflicting) {
    toast.show(t('settings.keyBindingConflict', { action: bindingLabels.value[conflicting[0] as keyof KeyBindings], key }), 'error')
    return
  }
  keyBindings.value[action] = key
  await settingsStore.setSetting('keyBindings', { ...keyBindings.value })
}

const bindingLabels = computed<Record<keyof KeyBindings, string>>(() => ({
  preview: t('settings.keyBindingsList.preview'),
  close: t('settings.keyBindingsList.close'),
  prev: t('settings.keyBindingsList.prev'),
  next: t('settings.keyBindingsList.next'),
  rate1: t('settings.keyBindingsList.rate1'),
  rate2: t('settings.keyBindingsList.rate2'),
  rate3: t('settings.keyBindingsList.rate3'),
  rate4: t('settings.keyBindingsList.rate4'),
  rate5: t('settings.keyBindingsList.rate5'),
  reject: t('settings.keyBindingsList.reject'),
  histogram: t('settings.keyBindingsList.histogram'),
  delete: t('settings.keyBindingsList.delete'),
  export: t('settings.keyBindingsList.export')
}))
</script>

<template>
  <div class="flex flex-col h-full p-6 overflow-y-auto">
    <h2 class="font-display text-xl text-accent mb-6">{{ $t('settings.title') }}</h2>

    <div class="space-y-6 max-w-lg">
      <!-- 外观 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('settings.appearance') }}</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-text-secondary block mb-1.5">{{ $t('settings.theme') }}</label>
            <div class="flex gap-2">
              <button @click="setTheme('dark')"
                      class="px-4 py-2 text-xs rounded-lg transition-colors flex items-center gap-2"
                      :class="theme === 'dark' ? 'bg-accent-dim text-accent border border-accent/30' : 'bg-bg-tertiary text-text-secondary border border-white/5 hover:bg-bg-hover'">
                <span class="w-3 h-3 rounded-full bg-[#08080a] border border-white/10"></span>
                {{ $t('settings.dark') }}
              </button>
              <button @click="setTheme('light')"
                      class="px-4 py-2 text-xs rounded-lg transition-colors flex items-center gap-2"
                      :class="theme === 'light' ? 'bg-accent-dim text-accent border border-accent/30' : 'bg-bg-tertiary text-text-secondary border border-white/5 hover:bg-bg-hover'">
                <span class="w-3 h-3 rounded-full bg-[#f5f5f7] border border-black/10"></span>
                {{ $t('settings.light') }}
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs text-text-secondary block mb-1.5">{{ $t('settings.language') }}</label>
            <div class="flex gap-2">
              <button @click="setLanguage('zh-CN')"
                      class="px-4 py-2 text-xs rounded-lg transition-colors"
                      :class="language === 'zh-CN' ? 'bg-accent-dim text-accent border border-accent/30' : 'bg-bg-tertiary text-text-secondary border border-white/5 hover:bg-bg-hover'">
                中文
              </button>
              <button @click="setLanguage('en')"
                      class="px-4 py-2 text-xs rounded-lg transition-colors"
                      :class="language === 'en' ? 'bg-accent-dim text-accent border border-accent/30' : 'bg-bg-tertiary text-text-secondary border border-white/5 hover:bg-bg-hover'">
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 文件管理 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('settings.fileManagement') }}</h3>
        <label class="flex items-center gap-3 cursor-pointer" @click="toggleDeleteLinkedRaw">
          <div class="relative">
            <div class="w-9 h-5 rounded-full transition-colors"
                 :class="deleteLinkedRaw ? 'bg-accent/30' : 'bg-bg-tertiary'">
              <div class="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                   :class="deleteLinkedRaw ? 'left-[18px] bg-accent' : 'left-0.5 bg-text-muted'"></div>
            </div>
          </div>
          <div>
            <div class="text-sm text-text-primary">{{ $t('settings.deleteLinkedRaw') }}</div>
            <div class="text-[11px] text-text-muted">{{ $t('settings.deleteLinkedRawDesc') }}</div>
          </div>
        </label>
      </div>

      <!-- 快捷键 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('settings.keyBindings') }}</h3>
        <div class="space-y-2">
          <div v-for="(label, action) in bindingLabels" :key="action"
               class="flex items-center justify-between py-1">
            <span class="text-xs text-text-secondary">{{ label }}</span>
            <input :value="keyBindings[action as keyof KeyBindings]"
                   @keydown.prevent="updateKeyBinding(action as keyof KeyBindings, $event.key)"
                   class="w-24 bg-bg-tertiary border border-white/5 rounded px-2 py-1 text-xs text-text-primary text-center outline-none focus:border-accent/30"
                   readonly />
          </div>
        </div>
      </div>

      <!-- 缓存管理 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('cache.title') }}</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-text-secondary">{{ $t('cache.thumbnailCache') }}</div>
              <div class="text-[11px] text-text-muted">{{ $t('cache.fileCount', { count: cacheInfo.fileCount, size: formatSize(cacheInfo.totalSize) }) }}</div>
            </div>
            <button @click="loadCacheInfo" class="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-bg-hover">
              {{ $t('cache.refresh') }}
            </button>
          </div>
          <button @click="handleClearCache" :disabled="clearingCache || cacheInfo.fileCount === 0"
                  class="px-4 py-2 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
            {{ clearingCache ? $t('cache.clearing') : $t('cache.clear') }}
          </button>
        </div>
      </div>

      <!-- 数据库管理 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('cache.database') }}</h3>
        <div class="space-y-3">
          <div>
            <div class="text-xs text-text-secondary mb-1">{{ $t('cache.rescanDesc') }}</div>
          </div>
          <button @click="handleRescan" :disabled="rescanning"
                  class="px-4 py-2 text-xs rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
            {{ rescanning ? $t('cache.clearing') : $t('cache.rescan') }}
          </button>
        </div>
      </div>

      <!-- RAW 格式 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('settings.supportedFormats') }}</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="fmt in ['CR2', 'CR3', 'NEF', 'ARW', 'ORF', 'RAF', 'DNG', 'PEF', 'SRW', 'RW2']" :key="fmt"
                class="px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary">
            {{ fmt }}
          </span>
        </div>
      </div>

      <!-- 关于 -->
      <div class="bg-bg-secondary rounded-xl border border-white/5 p-4">
        <h3 class="text-sm font-medium text-text-primary mb-3">{{ $t('settings.about') }}</h3>
        <div class="text-[11px] text-text-muted space-y-1">
          <div>{{ $t('app.name') }} {{ $t('app.version') }}</div>
          <div>{{ $t('settings.description') }}</div>
          <div>{{ $t('settings.techStack') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
