import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  const selectedIds = ref<Set<number>>(new Set())
  const lastSelectedId = ref<number | null>(null)

  const count = computed(() => selectedIds.value.size)

  function toggle(id: number) {
    const newSet = new Set(selectedIds.value)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    selectedIds.value = newSet
    lastSelectedId.value = id
  }

  function selectRange(fromId: number, toId: number, allIds: number[]) {
    const fromIdx = allIds.indexOf(fromId)
    const toIdx = allIds.indexOf(toId)
    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
    const newSet = new Set(selectedIds.value)
    for (let i = start; i <= end; i++) {
      newSet.add(allIds[i])
    }
    selectedIds.value = newSet
  }

  function clear() {
    selectedIds.value = new Set()
    lastSelectedId.value = null
  }

  function selectAll(ids: number[]) {
    selectedIds.value = new Set(ids)
  }

  return { selectedIds, count, lastSelectedId, toggle, selectRange, clear, selectAll }
})
