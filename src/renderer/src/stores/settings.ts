import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Record<string, unknown>>({})
  const loaded = ref(false)

  async function fetchSettings() {
    if (window.electronAPI) {
      settings.value = await window.electronAPI.settings.getAll()
      loaded.value = true
    }
  }

  async function setSetting(key: string, value: unknown) {
    if (window.electronAPI) {
      await window.electronAPI.settings.set(key, value)
      settings.value[key] = value
    }
  }

  function getSetting<T>(key: string, defaultValue: T): T {
    return (settings.value[key] as T) ?? defaultValue
  }

  return { settings, loaded, fetchSettings, setSetting, getSetting }
})
