import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { createDatabase } from './db/database'
import { registerPhotoIpc } from './ipc/photos'
import { registerAlbumIpc } from './ipc/albums'
import { registerCleanupIpc } from './ipc/cleanup'
import { registerSettingsIpc } from './ipc/settings'
import { setThumbnailDir } from './services/thumbnail'

const db = createDatabase()
registerPhotoIpc(db)
registerAlbumIpc(db)
registerCleanupIpc(db)
registerSettingsIpc(db)

setThumbnailDir(join(app.getPath('userData'), 'thumbnails'))

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
