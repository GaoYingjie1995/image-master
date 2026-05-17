const LOCAL_FILE_HOST = 'file'

export function createLocalFileUrl(scheme: 'local-photo' | 'local-thumbnail', filePath: string): string {
  return `${scheme}://${LOCAL_FILE_HOST}?path=${encodeURIComponent(filePath)}`
}

export function getPathFromLocalFileUrl(url: string): string {
  const parsed = new URL(url)
  const path = parsed.searchParams.get('path')
  if (path !== null) return path

  // Legacy support for older local-photo:///absolute/path URLs.
  return decodeURIComponent(parsed.pathname)
}
