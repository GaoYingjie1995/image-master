/**
 * PhotoGrid 虚拟滚动布局计算纯函数
 * 从 PhotoGrid.vue 中抽取，便于独立测试
 */

// 默认布局参数
export const DEFAULT_LAYOUT_CONFIG = {
  itemMinWidth: 160,
  gridGap: 6,
  containerPaddingX: 32,
  headerHeight: 24,
  headerGap: 10,
  groupGap: 16,
  overscanPx: 600
} as const

// 拍立得模式布局参数（Phase 2b 启用）
export const POLAROID_LAYOUT_CONFIG = {
  itemMinWidth: 200,
  gridGap: 20,
  containerPaddingX: 32,
  headerHeight: 24,
  headerGap: 10,
  groupGap: 20,
  overscanPx: 600,
  captionHeight: 0 // Phase 2b 设为底栏高度
} as const

export interface LayoutConfig {
  itemMinWidth: number
  gridGap: number
  containerPaddingX: number
  headerHeight: number
  headerGap: number
  groupGap: number
  overscanPx: number
  captionHeight: number
}

export interface PhotoData {
  id: number
  [key: string]: unknown
}

export interface DateGroup<T extends PhotoData = PhotoData> {
  label: string
  photos: T[]
  startIndex: number
}

export interface PhotoLayout<T extends PhotoData = PhotoData> {
  photo: T
  groupLabel: string
  x: number
  y: number
  width: number
  height: number
}

export interface GroupLayout<T extends PhotoData = PhotoData> {
  label: string
  headerTop: number
  photosStartY: number
  photosEndY: number
  photos: PhotoLayout<T>[]
}

/**
 * 计算列数
 */
export function calculateColumns(contentWidth: number, itemMinWidth: number, gap: number): number {
  return Math.max(1, Math.floor((contentWidth + gap) / (itemMinWidth + gap)))
}

/**
 * 计算每个 item 的宽度
 */
export function calculateItemSize(contentWidth: number, cols: number, gap: number): number {
  return (contentWidth - gap * (cols - 1)) / cols
}

/**
 * 计算每个 item 的高度（宽度 + 底栏高度）
 */
export function calculateItemHeight(itemSize: number, captionHeight: number): number {
  return itemSize + captionHeight
}

/**
 * 计算所有日期分组的布局
 */
export function calculateGroupLayouts<T extends PhotoData>(
  dateGroups: DateGroup<T>[],
  cols: number,
  itemSize: number,
  itemHeight: number,
  config: Pick<LayoutConfig, 'headerHeight' | 'headerGap' | 'groupGap' | 'gridGap'>
): GroupLayout<T>[] {
  const layouts: GroupLayout<T>[] = []
  let currentY = 0

  for (const group of dateGroups) {
    const headerTop = currentY
    currentY += config.headerHeight + config.headerGap

    const photosStartY = currentY
    const photoLayouts: PhotoLayout<T>[] = []

    for (let i = 0; i < group.photos.length; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const x = col * (itemSize + config.gridGap)
      const y = currentY + row * (itemHeight + config.gridGap)

      photoLayouts.push({
        photo: group.photos[i],
        groupLabel: group.label,
        x,
        y,
        width: itemSize,
        height: itemHeight
      })
    }

    const rows = Math.ceil(group.photos.length / cols)
    const photosHeight = rows > 0 ? rows * itemHeight + (rows - 1) * config.gridGap : 0
    currentY += photosHeight + config.groupGap

    layouts.push({
      label: group.label,
      headerTop,
      photosStartY,
      photosEndY: photosStartY + photosHeight,
      photos: photoLayouts
    })
  }

  return layouts
}

/**
 * 计算总内容高度
 */
export function calculateTotalContentHeight<T extends PhotoData>(
  layouts: GroupLayout<T>[],
  groupGap: number
): number {
  if (layouts.length === 0) return 0
  const last = layouts[layouts.length - 1]
  return last.photosEndY + groupGap
}

/**
 * 二分查找第一个可见组
 */
export function findFirstVisibleGroup<T extends PhotoData>(
  layouts: GroupLayout<T>[],
  viewportTop: number
): number {
  let left = 0
  let right = layouts.length - 1
  let ans = layouts.length

  while (left <= right) {
    const mid = (left + right) >> 1
    if (layouts[mid].photosEndY >= viewportTop) {
      ans = mid
      right = mid - 1
    } else {
      left = mid + 1
    }
  }

  return ans
}

/**
 * 二分查找最后一个可见组
 */
export function findLastVisibleGroup<T extends PhotoData>(
  layouts: GroupLayout<T>[],
  viewportBottom: number
): number {
  let left = 0
  let right = layouts.length - 1
  let ans = -1

  while (left <= right) {
    const mid = (left + right) >> 1
    if (layouts[mid].headerTop <= viewportBottom) {
      ans = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return ans
}

/**
 * 获取可见的照片和组
 */
export function findVisibleItems<T extends PhotoData>(
  layouts: GroupLayout<T>[],
  scrollTop: number,
  containerHeight: number,
  overscanPx: number
): { groups: GroupLayout<T>[]; photos: PhotoLayout<T>[] } {
  if (layouts.length === 0) return { groups: [], photos: [] }

  const viewportTop = Math.max(0, scrollTop - overscanPx)
  const viewportBottom = scrollTop + containerHeight + overscanPx

  const startGroup = findFirstVisibleGroup(layouts, viewportTop)
  const endGroup = findLastVisibleGroup(layouts, viewportBottom)

  if (startGroup > endGroup || startGroup >= layouts.length || endGroup < 0) {
    return { groups: [], photos: [] }
  }

  const visibleGroups: GroupLayout<T>[] = []
  const visiblePhotos: PhotoLayout<T>[] = []

  for (let i = startGroup; i <= endGroup; i++) {
    const group = layouts[i]
    visibleGroups.push(group)

    for (const photo of group.photos) {
      if (photo.y + photo.height >= viewportTop && photo.y <= viewportBottom) {
        visiblePhotos.push(photo)
      }
    }
  }

  return { groups: visibleGroups, photos: visiblePhotos }
}
