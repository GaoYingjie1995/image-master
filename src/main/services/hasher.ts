import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'

export async function hashFileQuick(filePath: string): Promise<string> {
  const fileStat = await stat(filePath)
  const sizePrefix = fileStat.size.toString()

  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath, { start: 0, end: 65535 })
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(sizePrefix + ':' + hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function hashFileFull(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}
