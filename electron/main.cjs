/**
 * Electron shell: в dev грузим Vite, в prod — собранный dist (base относительный).
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const isDev = !app.isPackaged

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 560,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    void win.loadFile(indexHtml)
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
