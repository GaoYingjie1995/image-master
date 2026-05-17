import { describe, it, expect } from 'vitest'
import { getFileNameWithoutExt, getJpegPairForRaw, isPathInsideOrEqual } from '../../../src/main/utils/path-utils'

describe('getFileNameWithoutExt', () => {
  it('应去除扩展名', () => {
    expect(getFileNameWithoutExt('/path/to/photo.jpg')).toBe('photo')
  })

  it('应处理多个点的文件名', () => {
    expect(getFileNameWithoutExt('/path/to/my.photo.cr2')).toBe('my.photo')
  })

  it('应处理无扩展名的文件', () => {
    expect(getFileNameWithoutExt('/path/to/photo')).toBe('photo')
  })
})

describe('getJpegPairForRaw', () => {
  it('应返回 .jpg 和 .jpeg 两个候选路径', () => {
    const pairs = getJpegPairForRaw('/photos/IMG_001.CR2')
    expect(pairs).toHaveLength(2)
    expect(pairs[0]).toBe('/photos/IMG_001.jpg')
    expect(pairs[1]).toBe('/photos/IMG_001.jpeg')
  })

  it('应保留目录路径', () => {
    const pairs = getJpegPairForRaw('/Users/photos/2024/photo.nef')
    expect(pairs[0]).toBe('/Users/photos/2024/photo.jpg')
    expect(pairs[1]).toBe('/Users/photos/2024/photo.jpeg')
  })
})

describe('isPathInsideOrEqual', () => {
  it('matches the folder itself and direct descendants', () => {
    expect(isPathInsideOrEqual('/photos/a', '/photos/a')).toBe(true)
    expect(isPathInsideOrEqual('/photos/a', '/photos/a/img.jpg')).toBe(true)
  })

  it('does not match sibling folders that share the same prefix', () => {
    expect(isPathInsideOrEqual('/photos/a', '/photos/abc/img.jpg')).toBe(false)
  })
})
