const RAW_EXTENSIONS = new Set(['cr2', 'cr3', 'nef', 'arw', 'orf', 'raf', 'dng', 'pef', 'srw', 'rw2'])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp', 'gif', ...RAW_EXTENSIONS])

export function isRaw(ext: string): boolean {
  return RAW_EXTENSIONS.has(ext.toLowerCase())
}

export function isImage(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toLowerCase())
}

export function getFormat(ext: string): string {
  const e = ext.toLowerCase()
  if (RAW_EXTENSIONS.has(e)) return 'raw'
  return e
}

export function getRawExtensions(): string[] {
  return Array.from(RAW_EXTENSIONS)
}
