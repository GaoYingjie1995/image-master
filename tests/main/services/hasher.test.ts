import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hashFileQuick, hashFileFull } from '../../../src/main/services/hasher'
import { writeFile, unlink, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const testDir = join(tmpdir(), 'image-master-test-' + Date.now())
const testFile = join(testDir, 'test.bin')

beforeAll(async () => {
  await mkdir(testDir, { recursive: true })
  // 创建一个已知内容的测试文件
  const content = Buffer.alloc(128 * 1024, 0xAB) // 128KB
  await writeFile(testFile, content)
})

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true })
})

describe('hashFileQuick', () => {
  it('应返回包含文件大小和哈希的字符串', async () => {
    const hash = await hashFileQuick(testFile)
    expect(hash).toContain(':')
    const [size, hex] = hash.split(':')
    expect(Number(size)).toBe(128 * 1024)
    expect(hex).toHaveLength(64) // SHA-256 hex length
  })

  it('相同文件应返回相同哈希', async () => {
    const hash1 = await hashFileQuick(testFile)
    const hash2 = await hashFileQuick(testFile)
    expect(hash1).toBe(hash2)
  })
})

describe('hashFileFull', () => {
  it('应返回 64 字符的 SHA-256 哈希', async () => {
    const hash = await hashFileFull(testFile)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('相同文件应返回相同哈希', async () => {
    const hash1 = await hashFileFull(testFile)
    const hash2 = await hashFileFull(testFile)
    expect(hash1).toBe(hash2)
  })

  it('不同文件应返回不同哈希', async () => {
    const otherFile = join(testDir, 'other.bin')
    await writeFile(otherFile, Buffer.alloc(64 * 1024, 0xCD))
    const hash1 = await hashFileFull(testFile)
    const hash2 = await hashFileFull(otherFile)
    expect(hash1).not.toBe(hash2)
    await unlink(otherFile)
  })
})
