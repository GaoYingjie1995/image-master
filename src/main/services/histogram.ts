import sharp from 'sharp'

export interface HistogramData {
  r: number[]
  g: number[]
  b: number[]
  luminance: number[]
  shadowClip: number  // 0-1，阴影裁切比例（像素值 < 5 的占比）
  highlightClip: number // 0-1，高光裁切比例（像素值 > 250 的占比）
}

export async function computeHistogram(filePath: string): Promise<HistogramData> {
  const { data, info } = await sharp(filePath)
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .toColorspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bins = 256
  const r = new Array(bins).fill(0)
  const g = new Array(bins).fill(0)
  const b = new Array(bins).fill(0)
  const luminance = new Array(bins).fill(0)

  const channels = info.channels
  const totalPixels = data.length / channels
  let shadowPixels = 0
  let highlightPixels = 0

  for (let i = 0; i < data.length; i += channels) {
    const rv = data[i]
    const gv = data[i + 1]
    const bv = data[i + 2]
    r[rv]++
    g[gv]++
    b[bv]++
    const lum = Math.round(0.299 * rv + 0.587 * gv + 0.114 * bv)
    luminance[Math.min(255, lum)]++

    // 统计裁切：当所有通道都极暗或极亮时计入
    if (rv < 5 && gv < 5 && bv < 5) shadowPixels++
    if (rv > 250 && gv > 250 && bv > 250) highlightPixels++
  }

  return {
    r, g, b, luminance,
    shadowClip: totalPixels > 0 ? shadowPixels / totalPixels : 0,
    highlightClip: totalPixels > 0 ? highlightPixels / totalPixels : 0
  }
}
