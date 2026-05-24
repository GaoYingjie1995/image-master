import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

export interface KeyBindings {
  preview: string
  close: string
  prev: string
  next: string
  rate1: string
  rate2: string
  rate3: string
  rate4: string
  rate5: string
  reject: string
  delete: string
  export: string
}

const DEFAULT_BINDINGS: KeyBindings = {
  preview: ' ',
  close: 'Escape',
  prev: 'ArrowLeft',
  next: 'ArrowRight',
  rate1: '1',
  rate2: '2',
  rate3: '3',
  rate4: '4',
  rate5: '5',
  reject: 'x',
  delete: 'Delete',
  export: 'e'
}

export function useKeyboard(handlers: Partial<Record<keyof KeyBindings, (e: KeyboardEvent) => void>>) {
  const settings = useSettingsStore()

  function getBindings(): KeyBindings {
    return settings.getSetting<KeyBindings>('keyBindings', DEFAULT_BINDINGS)
  }

  function handleKeydown(e: KeyboardEvent) {
    // 忽略输入框中的快捷键
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    const bindings = getBindings()

    for (const [action, handler] of Object.entries(handlers)) {
      if (handler && e.key === bindings[action as keyof KeyBindings]) {
        e.preventDefault()
        handler(e)
        return
      }
    }
  }

  const hasHandlers = Object.keys(handlers).length > 0
  if (hasHandlers) {
    onMounted(() => window.addEventListener('keydown', handleKeydown))
    onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
  }

  return { getBindings, DEFAULT_BINDINGS }
}
