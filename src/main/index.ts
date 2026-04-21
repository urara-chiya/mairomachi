import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIPCHandlers } from './ipc-handlers'
import { logger } from './service/logger'
import { setMainWindow } from './utils/window-state'
import { isAllowedExternalUrl } from '../shared/security'

function createWindow(): void {
  logger.info('Main', 'Creating main window')
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    title: '迷路町',
    show: false,
    autoHideMenuBar: true,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    maximizable: true,
    minimizable: true
  })

  registerIPCHandlers(mainWindow)

  mainWindow.on('ready-to-show', () => {
    logger.info('Main', 'Main window ready to show')
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isAllowedExternalUrl(details.url)) {
      logger.debug('Main', `Opening external link: ${details.url}`)
      shell.openExternal(details.url).then()
    } else {
      logger.warn('Main', `Blocked external link: ${details.url}`)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault()
      if (isAllowedExternalUrl(url)) {
        logger.debug('Main', `Preventing in-app navigation to: ${url}`)
        shell.openExternal(url).then()
      } else {
        logger.warn('Main', `Blocked in-app navigation to: ${url}`)
      }
    }
  })

  mainWindow.on('closed', () => {
    setMainWindow(null)
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local HTML file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).then()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).then()
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  logger.initLogsDir()
  logger.info('Main', 'App ready')
  // Set app user model id for windows

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    logger.debug('Main', 'Browser window created')
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    logger.info('Main', 'App activated')
    // On macOS, it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  logger.info('Main', 'All windows closed')
  if (process.platform !== 'darwin') {
    logger.info('Main', 'Non-macOS platform, quitting app')
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
