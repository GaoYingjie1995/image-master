import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './styles/main.css'

// 初始化主题和语言
async function initSettings() {
  if (window.electronAPI) {
    const theme = await window.electronAPI.settings.get('theme')
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light')
    }

    const lang = await window.electronAPI.settings.get('language')
    if (lang) {
      i18n.global.locale.value = lang as 'zh-CN' | 'en'
    }
  }
}

initSettings().finally(() => {
  createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
})
