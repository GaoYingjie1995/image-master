import { describe, it, expect } from 'vitest'
import {
  calculateColumns,
  calculateItemSize,
  calculateItemHeight,
  calculateGroupLayouts,
  calculateTotalContentHeight,
  findFirstVisibleGroup,
  findLastVisibleGroup,
  findVisibleItems,
  DEFAULT_LAYOUT_CONFIG,
  POLAROID_LAYOUT_CONFIG,
  type PhotoData,
  type DateGroup
} from '../../../src/renderer/src/utils/grid-layout'

// 测试用照片数据
function makePhoto(id: number): PhotoData {
  return { id }
}

function makeGroups(counts: number[]): DateGroup[] {
  let startIndex = 0
  return counts.map((count, i) => {
    const photos = Array.from({ length: count }, (_, j) => makePhoto(startIndex + j))
    const group = {
      label: `2024-01-${String(i + 1).padStart(2, '0')}`,
      photos,
      startIndex
    }
    startIndex += count
    return group
  })
}

const config = {
  ...DEFAULT_LAYOUT_CONFIG,
  captionHeight: 0
}

describe('calculateColumns', () => {
  it('1200px 容器、160px 最小宽度、6px 间距应返回 7 列', () => {
    const cols = calculateColumns(1200, 160, 6)
    expect(cols).toBe(7)
  })

  it('800px 容器应返回 4 列', () => {
    const cols = calculateColumns(800, 160, 6)
    expect(cols).toBe(4)
  })

  it('199px 容器应返回 1 列（边界）', () => {
    const cols = calculateColumns(199, 160, 6)
    expect(cols).toBe(1)
  })

  it('160px 容器应返回 1 列', () => {
    const cols = calculateColumns(160, 160, 6)
    expect(cols).toBe(1)
  })

  it('极小容器应至少返回 1 列', () => {
    const cols = calculateColumns(10, 160, 6)
    expect(cols).toBe(1)
  })

  it('拍立得模式：1200px 容器、200px 最小宽度、20px 间距应返回 5 列', () => {
    const cols = calculateColumns(1200, 200, 20)
    expect(cols).toBe(5)
  })

  it('拍立得模式：800px 容器应返回 3 列', () => {
    const cols = calculateColumns(800, 200, 20)
    expect(cols).toBe(3)
  })
})

describe('calculateItemSize', () => {
  it('1200px 容器、7 列、6px 间距应正确填满', () => {
    const size = calculateItemSize(1200, 7, 6)
    // (1200 - 6 * 6) / 7 = 1164 / 7 ≈ 166.28
    expect(size).toBeCloseTo(166.28, 0)
  })

  it('宽度应为正数', () => {
    const size = calculateItemSize(1200, 5, 20)
    expect(size).toBeGreaterThan(0)
  })
})

describe('calculateItemHeight', () => {
  it('无底栏时高度等于宽度', () => {
    expect(calculateItemHeight(166, 0)).toBe(166)
  })

  it('有底栏时高度 = 宽度 + 底栏', () => {
    expect(calculateItemHeight(166, 40)).toBe(206)
  })
})

describe('calculateGroupLayouts', () => {
  it('空分组应返回空数组', () => {
    const layouts = calculateGroupLayouts([], 5, 160, 160, config)
    expect(layouts).toEqual([])
  })

  it('单个分组应正确计算位置', () => {
    const groups = makeGroups([3])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)

    expect(layouts).toHaveLength(1)
    expect(layouts[0].label).toBe('2024-01-01')
    expect(layouts[0].photos).toHaveLength(3)

    // 第一张照片应在 header 之后
    const firstPhoto = layouts[0].photos[0]
    expect(firstPhoto.y).toBe(config.headerHeight + config.headerGap)
    expect(firstPhoto.x).toBe(0)

    // 第二张照片应在第一张右边
    const secondPhoto = layouts[0].photos[1]
    expect(secondPhoto.x).toBe(160 + config.gridGap)
    expect(secondPhoto.y).toBe(firstPhoto.y)
  })

  it('多行照片应正确换行', () => {
    const groups = makeGroups([5]) // 5 张照片，3 列 → 2 行
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)

    const photos = layouts[0].photos
    // 第 4 张照片（index 3）应在第二行
    expect(photos[3].y).toBeGreaterThan(photos[0].y)
    expect(photos[3].x).toBe(0) // 第二行第一列
  })

  it('多个分组应正确累加 Y 坐标', () => {
    const groups = makeGroups([3, 2])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)

    expect(layouts).toHaveLength(2)

    // 第二个分组的 header 应在第一个分组之后
    expect(layouts[1].headerTop).toBeGreaterThan(layouts[0].photosEndY)
  })

  it('拍立得模式下非正方形高度应正确', () => {
    const groups = makeGroups([2])
    const polaroidConfig = {
      ...POLAROID_LAYOUT_CONFIG,
      captionHeight: 40
    }
    const layouts = calculateGroupLayouts(groups, 2, 200, 240, polaroidConfig)

    expect(layouts[0].photos[0].height).toBe(240)
    expect(layouts[0].photos[0].width).toBe(200)
  })
})

describe('calculateTotalContentHeight', () => {
  it('空布局应返回 0', () => {
    expect(calculateTotalContentHeight([], 16)).toBe(0)
  })

  it('应返回最后一个组的结束位置 + groupGap', () => {
    const groups = makeGroups([3])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)
    const height = calculateTotalContentHeight(layouts, 16)
    expect(height).toBe(layouts[0].photosEndY + 16)
  })
})

describe('findFirstVisibleGroup', () => {
  it('scrollTop=0 应返回第一个组', () => {
    const groups = makeGroups([3, 3, 3])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)
    const idx = findFirstVisibleGroup(layouts, 0)
    expect(idx).toBe(0)
  })

  it('滚动到中间应返回中间的组', () => {
    const groups = makeGroups([10, 10, 10])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)

    // 滚动到第二个组的区域
    const secondGroupY = layouts[1].photosStartY
    const idx = findFirstVisibleGroup(layouts, secondGroupY)
    expect(idx).toBeLessThanOrEqual(1)
  })
})

describe('findLastVisibleGroup', () => {
  it('viewport 底部在第一个组内应返回 0', () => {
    const groups = makeGroups([3, 3])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)
    const idx = findLastVisibleGroup(layouts, 100)
    expect(idx).toBeGreaterThanOrEqual(0)
  })

  it('viewport 底部超过所有组应返回最后一个', () => {
    const groups = makeGroups([3, 3])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)
    const idx = findLastVisibleGroup(layouts, 99999)
    expect(idx).toBe(layouts.length - 1)
  })
})

describe('findVisibleItems', () => {
  it('空布局应返回空结果', () => {
    const result = findVisibleItems([], 0, 800, 600)
    expect(result.groups).toEqual([])
    expect(result.photos).toEqual([])
  })

  it('scrollTop=0 应返回第一屏的照片', () => {
    const groups = makeGroups([9]) // 9 张照片，3 列 → 3 行
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)
    const result = findVisibleItems(layouts, 0, 800, 600)

    expect(result.photos.length).toBeGreaterThan(0)
    expect(result.photos.length).toBeLessThanOrEqual(9)
  })

  it('overscan 应扩展可见区域', () => {
    const groups = makeGroups([20])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)

    const withOverscan = findVisibleItems(layouts, 0, 400, 600)
    const withoutOverscan = findVisibleItems(layouts, 0, 400, 0)

    expect(withOverscan.photos.length).toBeGreaterThanOrEqual(withoutOverscan.photos.length)
  })

  it('所有可见照片应在 viewport + overscan 范围内', () => {
    const groups = makeGroups([30])
    const layouts = calculateGroupLayouts(groups, 3, 160, 160, config)
    const scrollTop = 500
    const containerHeight = 600
    const overscan = 600

    const result = findVisibleItems(layouts, scrollTop, containerHeight, overscan)
    const viewportTop = Math.max(0, scrollTop - overscan)
    const viewportBottom = scrollTop + containerHeight + overscan

    for (const photo of result.photos) {
      expect(photo.y + photo.height).toBeGreaterThanOrEqual(viewportTop)
      expect(photo.y).toBeLessThanOrEqual(viewportBottom)
    }
  })
})

describe('拍立得布局配置', () => {
  it('POLAROID_LAYOUT_CONFIG 的间距应大于默认配置', () => {
    expect(POLAROID_LAYOUT_CONFIG.gridGap).toBeGreaterThan(DEFAULT_LAYOUT_CONFIG.gridGap)
    expect(POLAROID_LAYOUT_CONFIG.itemMinWidth).toBeGreaterThan(DEFAULT_LAYOUT_CONFIG.itemMinWidth)
  })

  it('拍立得模式下 1200px 容器应有合理的列数', () => {
    const cols = calculateColumns(1200, POLAROID_LAYOUT_CONFIG.itemMinWidth, POLAROID_LAYOUT_CONFIG.gridGap)
    expect(cols).toBeGreaterThanOrEqual(3)
    expect(cols).toBeLessThanOrEqual(6)
  })
})
