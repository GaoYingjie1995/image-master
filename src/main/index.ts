import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import { join, resolve, relative, isAbsolute } from 'path'
import { realpathSync } from 'fs'
import { createDatabase } from './db/database'
import { registerPhotoIpc } from './ipc/photos'
import { registerAlbumIpc } from './ipc/albums'
import { registerCleanupIpc } from './ipc/cleanup'
import { registerSettingsIpc } from './ipc/settings'
import { registerImportSourceIpc } from './ipc/import-sources'
import { setThumbnailDir } from './services/thumbnail'
import { getPathFromLocalFileUrl } from '../shared/local-protocol'

const db = createDatabase()
registerPhotoIpc(db)
registerAlbumIpc(db)
registerCleanupIpc(db)
registerSettingsIpc(db)
registerImportSourceIpc(db)

const thumbnailDir = join(app.getPath('userData'), 'thumbnails')
setThumbnailDir(thumbnailDir)

// 窗口控制 IPC
ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})

ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.isMaximized() ? win.unmaximize() : win.maximize()
  }
})

ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

// 注册自定义协议，允许渲染进程加载本地图片文件
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-photo', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } },
  { scheme: 'local-thumbnail', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // 处理 local-photo:// 协议 —— 仅提供数据库中已记录的照片文件
  protocol.handle('local-photo', (request) => {
    const rawPath = getPathFromLocalFileUrl(request.url)
    if (rawPath.includes('\0')) return new Response('Bad Request', { status: 400 })
    const filePath = resolve(rawPath)
    // 解析符号链接后验证路径在数据库中存在
    let realPath: string
    try { realPath = realpathSync(filePath) } catch { return new Response('Not Found', { status: 404 }) }
    const photo = db.prepare('SELECT 1 FROM photos WHERE file_path = ?').get(realPath) || db.prepare('SELECT 1 FROM photos WHERE file_path = ?').get(filePath)
    if (!photo) return new Response('Not Found', { status: 404 })
    return net.fetch(`file://${realPath}`)
  })

  // 处理 local-thumbnail:// 协议 —— 仅提供缩略图目录内的文件
  protocol.handle('local-thumbnail', (request) => {
    const rawPath = getPathFromLocalFileUrl(request.url)
    if (rawPath.includes('\0')) return new Response('Bad Request', { status: 400 })
    const filePath = resolve(rawPath)
    // 解析符号链接后验证路径在缩略图目录内
    let realPath: string
    try { realPath = realpathSync(filePath) } catch { return new Response('Not Found', { status: 404 }) }
    const rel = relative(resolve(thumbnailDir), realPath)
    if (rel.startsWith('..') || isAbsolute(rel)) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(`file://${realPath}`)
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)')
    db.close()
  } catch { /* 忽略关闭错误 */ }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
