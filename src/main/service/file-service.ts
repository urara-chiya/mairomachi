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
