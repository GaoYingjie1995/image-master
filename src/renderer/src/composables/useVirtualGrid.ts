import { ref, computed, onMounted, onUnmounted, type Ref, watch } from 'vue'

interface VirtualGridOptions {
  containerRef: Ref<HTMLElement | null>
  itemMinWidth?: number
  gap?: number
  rowHeight?: number
  overscan?: number
}

export function useVirtualGrid(options: VirtualGridOptions) {
  const { containerRef, itemMinWidth = 160, gap = 6, rowHeight = 176, overscan = 3 } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const containerWidth = ref(0)

  let resizeObserver: ResizeObserver | null = null
  let scrollEl: HTMLElement | null = null

  function updateScroll() {
    if (scrollEl) {
      scrollTop.value = scrollEl.scrollTop
    }
  }

  function setup() {
    scrollEl = containerRef.value
    if (!scrollEl) return

    containerHeight.value = scrollEl.clientHeight
    containerWidth.value = scrollEl.clientWidth

    scrollEl.addEventListener('scroll', updateScroll, { passive: true })

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
        containerWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(scrollEl)
  }

  function cleanup() {
    if (scrollEl) {
      scrollEl.removeEventListener('scroll', updateScroll)
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  onMounted(setup)
  onUnmounted(cleanup)

  // 重新监听 containerRef 变化
  watch(containerRef, () => {
    cleanup()
    setup()
  })

  const columns = computed(() => {
    const w = containerWidth.value || 1200
    return Math.max(1, Math.floor((w + gap) / (itemMinWidth + gap)))
  })

  const rowHeightWithGap = computed(() => rowHeight + gap)

  function getVisibleRange(totalRows: number) {
    const rh = rowHeightWithGap.value
    const startRow = Math.max(0, Math.floor(scrollTop.value / rh) - overscan)
    const visibleRows = Math.ceil(containerHeight.value / rh) + 2 * overscan
    const endRow = Math.min(totalRows, startRow + visibleRows)
    return { startRow, endRow }
  }

  return { columns, scrollTop, containerHeight, containerWidth, getVisibleRange, rowHeightWithGap }
}
