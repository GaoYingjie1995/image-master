const RAW_EXTENSIONS = new Set(['cr2', 'cr3', 'nef', 'arw', 'orf', 'raf', 'dng', 'pef', 'srw', 'rw2'])
const RAW_FORMATS = new Set(['raw', ...RAW_EXTENSIONS])
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

export function getRawFormats(): string[] {
  return Array.from(RAW_FORMATS)
}

export function isRawFormat(format: string): boolean {
  return RAW_FORMATS.has(format.toLowerCase())
}
