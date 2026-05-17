import { describe, expect, it } from 'vitest'
import { createLocalFileUrl, getPathFromLocalFileUrl } from '../../src/shared/local-protocol'

describe('local protocol URLs', () => {
  it('round-trips POSIX paths with spaces', () => {
    const filePath = '/Users/me/Pictures/Trip Day 1/photo 01.jpg'
    const url = createLocalFileUrl('local-photo', filePath)

    expect(getPathFromLocalFileUrl(url)).toBe(filePath)
  })

  it('round-trips Windows paths without losing drive letters', () => {
    const filePath = 'C:\\Users\\me\\Pictures\\photo 01.jpg'
    const url = createLocalFileUrl('local-thumbnail', filePath)

    expect(getPathFromLocalFileUrl(url)).toBe(filePath)
  })
})
