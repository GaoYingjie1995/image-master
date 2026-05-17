import { describe, it, expect } from 'vitest'
import { isImage, isRaw, getFormat } from '../../../src/main/utils/file-types'

describe('isImage', () => {
  it('应识别常见图片格式', () => {
    expect(isImage('jpg')).toBe(true)
    expect(isImage('jpeg')).toBe(true)
    expect(isImage('png')).toBe(true)
    expect(isImage('webp')).toBe(true)
    expect(isImage('tiff')).toBe(true)
    expect(isImage('gif')).toBe(true)
    expect(isImage('bmp')).toBe(true)
  })

  it('应识别 RAW 格式', () => {
    expect(isImage('cr2')).toBe(true)
    expect(isImage('cr3')).toBe(true)
    expect(isImage('nef')).toBe(true)
    expect(isImage('arw')).toBe(true)
    expect(isImage('dng')).toBe(true)
  })

  it('应不识别非图片格式', () => {
    expect(isImage('txt')).toBe(false)
    expect(isImage('pdf')).toBe(false)
    expect(isImage('mp4')).toBe(false)
  })

  it('应不区分大小写', () => {
    expect(isImage('JPG')).toBe(true)
    expect(isImage('CR2')).toBe(true)
    expect(isImage('Png')).toBe(true)
  })
})

describe('isRaw', () => {
  it('应识别 RAW 格式', () => {
    expect(isRaw('cr2')).toBe(true)
    expect(isRaw('nef')).toBe(true)
    expect(isRaw('arw')).toBe(true)
    expect(isRaw('dng')).toBe(true)
    expect(isRaw('orf')).toBe(true)
    expect(isRaw('raf')).toBe(true)
    expect(isRaw('pef')).toBe(true)
    expect(isRaw('srw')).toBe(true)
    expect(isRaw('rw2')).toBe(true)
  })

  it('应不识别非 RAW 格式', () => {
    expect(isRaw('jpg')).toBe(false)
    expect(isRaw('png')).toBe(false)
  })
})

describe('getFormat', () => {
  it('RAW 扩展名应返回 raw', () => {
    expect(getFormat('cr2')).toBe('raw')
    expect(getFormat('nef')).toBe('raw')
    expect(getFormat('arw')).toBe('raw')
  })

  it('非 RAW 扩展名应返回原始扩展名', () => {
    expect(getFormat('jpg')).toBe('jpg')
    expect(getFormat('png')).toBe('png')
    expect(getFormat('webp')).toBe('webp')
  })
})
