import { app } from 'electron'
import { spawn } from 'child_process'
import { join } from 'path'
import { createHash } from 'crypto'
import { readFileSync, unlinkSync } from 'fs'
import mairoClient from '../http/client'
import { logger } from './logger'
import type { CheckUpdateResult } from '../type'

let isDownloading = false
let latestInstallerHash: string | undefined

export function getIsDownloading(): boolean {
  return isDownloading
}

export async function checkUpdate(): Promise<CheckUpdateResult> {
  logger.info('UpdateService', 'Checking for updates')
  const currentVersion = app.getVersion()
  const result = await mairoClient.get<
    void,
    { code: number; message: string; data: { version: string; hash: string } }
  >(import.meta.env.VITE_API_ENDPOINT_VERSION_LATEST, undefined, undefined, 5000)
  const latestVersion = result.data.version
  const hash = result.data.hash
  const hasUpdate = latestVersion !== currentVersion
  logger.info('UpdateService', `Current: ${currentVersion}, Latest: ${latestVersion}, HasUpdate: ${hasUpdate}`)
  latestInstallerHash = hash
  return { hasUpdate, latestVersion, currentVersion, hash }
}

export async function downloadUpdate(onProgress?: (transferred: number, total: number) => void): Promise<string> {
  if (isDownloading) {
    throw new Error('正在下载更新中，请勿重复操作')
  }
  isDownloading = true

  try {
    logger.info('UpdateService', 'Starting update download')
    const tempDir = app.getPath('temp')
    const filePath = join(tempDir, 'Mairomachi-Latest-Setup.exe')

    await mairoClient.download(
      import.meta.env.VITE_API_ENDPOINT_DOWNLOAD_LATEST,
      filePath,
      undefined,
      300000,
      onProgress
    )
    logger.info('UpdateService', `Update downloaded to ${filePath}`)

    // 校验安装包 SHA-256 哈希
    const expectedHash = latestInstallerHash
    if (expectedHash) {
      const fileBuffer = readFileSync(filePath)
      const actualHash = createHash('sha256').update(fileBuffer).digest('hex')
      if (actualHash !== expectedHash) {
        logger.error('UpdateService', `Hash mismatch: expected=${expectedHash}, actual=${actualHash}`)
        try {
          unlinkSync(filePath)
        } catch {
          /* ignore */
        }
        throw new Error('更新文件校验失败，请稍后重试')
      }
      logger.info('UpdateService', 'Installer hash verification passed')
    } else {
      logger.warn('UpdateService', 'No hash provided by server, skipping verification')
    }

    // 静默启动安装包并退出当前应用
    logger.info('UpdateService', 'Launching silent installer')
    const child = spawn(filePath, ['/S'], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    })
    child.unref()

    app.quit()
    return filePath
  } finally {
    isDownloading = false
  }
}
