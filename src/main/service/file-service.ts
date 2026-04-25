import { dialog } from 'electron'
import { logger } from './logger'

export async function selectDirPath(): Promise<string> {
  logger.info('FileService', 'Opening directory dialog')
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择项目目录',
    defaultPath: './',
    buttonLabel: '选择此文件夹'
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0]
    logger.info('FileService', `User selected directory: ${selectedPath}`)
    return selectedPath
  }
  logger.debug('FileService', `Directory selection cancelled or failed, canceled: ${result.canceled}`)
  return ''
}

export async function selectReplayFile(): Promise<string> {
  logger.info('FileService', 'Opening replay file dialog')
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择 Replay 文件',
    defaultPath: './',
    buttonLabel: '选择',
    filters: [
      { name: 'Replay Files', extensions: ['wowsreplay'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0]
    logger.info('FileService', `User selected replay file: ${selectedPath}`)
    return selectedPath
  }
  logger.debug('FileService', `Replay file selection cancelled or failed, canceled: ${result.canceled}`)
  return ''
}
