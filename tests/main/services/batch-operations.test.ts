import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyRenameTemplate, batchRename } from '../../../src/main/services/batch-operations'

describe('applyRenameTemplate', () => {
  it('应替换 {date} 占位符', () => {
    const result = applyRenameTemplate('{date}_photo', { date: '20240115', seq: 1 })
    expect(result).toBe('20240115_photo')
  })

  it('应替换 {time} 占位符', () => {
    const result = applyRenameTemplate('{time}_photo', { time: '143022', seq: 1 })
    expect(result).toBe('143022_photo')
  })

  it('应替换 {camera} 占位符', () => {
    const result = applyRenameTemplate('{camera}_{seq}', { camera: 'A7M4', seq: 5 })
    expect(result).toBe('A7M4_5')
  })

  it('应替换 {lens} 占位符，并清洗路径分隔符', () => {
    const result = applyRenameTemplate('{lens}', { lens: '85mm f/1.4', seq: 1 })
    expect(result).toBe('85mm f_1.4')
  })

  it('应替换 {iso} 占位符', () => {
    const result = applyRenameTemplate('ISO{iso}', { iso: 400, seq: 1 })
    expect(result).toBe('ISO400')
  })

  it('应替换 {seq} 占位符', () => {
    const result = applyRenameTemplate('IMG_{seq}', { seq: 42 })
    expect(result).toBe('IMG_42')
  })

  it('应替换 {seq:N} 占位符并补零', () => {
    const result = applyRenameTemplate('IMG_{seq:3}', { seq: 7 })
    expect(result).toBe('IMG_007')
  })

  it('应替换 {seq:N} 占位符，大数字不补零', () => {
    const result = applyRenameTemplate('IMG_{seq:3}', { seq: 1234 })
    expect(result).toBe('IMG_1234')
  })

  it('应处理多个占位符', () => {
    const result = applyRenameTemplate('{date}_{camera}_{seq:3}', {
      date: '20240115',
      camera: 'A7M4',
      seq: 1
    })
    expect(result).toBe('20240115_A7M4_001')
  })

  it('未定义的占位符应替换为空字符串', () => {
    const result = applyRenameTemplate('{date}_{camera}', { seq: 1 })
    expect(result).toBe('_')
  })
})

// Mock fs/promises for batchRename tests
vi.mock('fs/promises', () => ({
  rename: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')), // 默认文件不存在
  copyFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined)
}))

describe('batchRename', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应检测批次内重复目标路径', async () => {
    const photos = [
      { id: 1, file_path: '/photos/IMG_001.jpg', shot_at: '2024-01-15T10:00:00Z' },
      { id: 2, file_path: '/photos/IMG_002.jpg', shot_at: '2024-01-15T10:00:00Z' }
    ]
    // 相同模板 + 相同日期 = 相同目标名
    await expect(batchRename(photos, '{date}', 1)).rejects.toThrow('Duplicate target path in batch')
  })

  it('应检测目标文件已存在', async () => {
    const { access } = await import('fs/promises')
    // 模拟目标文件已存在
    vi.mocked(access).mockResolvedValueOnce(undefined)

    const photos = [
      { id: 1, file_path: '/photos/IMG_001.jpg' }
    ]
    await expect(batchRename(photos, '{seq}', 1)).rejects.toThrow('Target file already exists')
  })

  it('应检测数据库中已占用的目标路径，即使文件当前不存在', async () => {
    const photos = [
      { id: 1, file_path: '/photos/IMG_001.jpg' }
    ]

    await expect(batchRename(photos, '{seq}', 1, {
      isTargetReserved: (targetPath) => targetPath.endsWith('/1.jpg')
    })).rejects.toThrow('Target path is already reserved')
  })

  it('应检测空文件名', async () => {
    const photos = [
      { id: 1, file_path: '/photos/IMG_001.jpg' }
    ]
    // 空模板 + 无 EXIF 数据 = 空文件名（只剩扩展名）
    await expect(batchRename(photos, '', 1)).rejects.toThrow('Empty filename generated')
  })

  it('成功重命名应返回正确结果', async () => {
    const photos = [
      { id: 1, file_path: '/photos/IMG_001.jpg' },
      { id: 2, file_path: '/photos/IMG_002.jpg' }
    ]
    const results = await batchRename(photos, 'photo_{seq}', 1)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ id: 1, oldPath: '/photos/IMG_001.jpg', newPath: expect.stringContaining('photo_1') })
    expect(results[1]).toEqual({ id: 2, oldPath: '/photos/IMG_002.jpg', newPath: expect.stringContaining('photo_2') })
  })
})
