import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveConflictPath } from '../../../src/main/ipc/albums'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('ENOENT'))
}))

describe('resolveConflictPath', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('文件不存在时返回原文件名', async () => {
    const result = await resolveConflictPath('/albums/test', 'photo.jpg')
    expect(result).toEqual({
      path: '/albums/test/photo.jpg',
      name: 'photo.jpg'
    })
  })

  it('文件存在时返回 _1 后缀', async () => {
    const { access } = await import('fs/promises')
    // 第一次调用返回成功（文件存在），第二次抛出 ENOENT（文件不存在）
    vi.mocked(access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('ENOENT'))

    const result = await resolveConflictPath('/albums/test', 'photo.jpg')
    expect(result).toEqual({
      path: '/albums/test/photo_1.jpg',
      name: 'photo_1.jpg'
    })
  })

  it('数据库中路径已占用时也应返回后缀路径', async () => {
    const result = await resolveConflictPath('/albums/test', 'photo.jpg', {
      isReserved: (targetPath) => targetPath.endsWith('/photo.jpg')
    })

    expect(result).toEqual({
      path: '/albums/test/photo_1.jpg',
      name: 'photo_1.jpg'
    })
  })

  it('文件名冲突时逐步递增后缀', async () => {
    const { access } = await import('fs/promises')
    // photo.jpg 存在, photo_1.jpg 存在, photo_2.jpg 不存在
    vi.mocked(access)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('ENOENT'))

    const result = await resolveConflictPath('/albums/test', 'photo.jpg')
    expect(result).toEqual({
      path: '/albums/test/photo_2.jpg',
      name: 'photo_2.jpg'
    })
  })

  it('无扩展名的文件也能正确处理', async () => {
    const result = await resolveConflictPath('/albums/test', 'README')
    expect(result).toEqual({
      path: '/albums/test/README',
      name: 'README'
    })
  })
})
