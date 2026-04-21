import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { FileShipInfo, MairoResult, ShipInfoDetail } from '../type'
import mairoClient from '../http/client'
import { logger } from './logger'

const CACHE_FILE_NAME = 'ship-info-cache.json'

function getCacheFilePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, CACHE_FILE_NAME)
}

async function fetchShipInfoFromServer(): Promise<FileShipInfo | null> {
  logger.info('ShipInfoService', 'Fetching ship info from server')
  try {
    const result = await mairoClient.get<void, MairoResult<FileShipInfo>>(
      import.meta.env.VITE_API_ENDPOINT_INFO_SHIPS,
      undefined,
      undefined,
      5000
    )
    logger.info(
      'ShipInfoService',
      `Fetched ship info: version=${result.data.version}, ships=${Object.keys(result.data.ships).length}`
    )
    return result.data
  } catch (error) {
    logger.error('ShipInfoService', 'Failed to fetch ship info from server', error)
    return null
  }
}

async function fetchShipInfoVersion(): Promise<string | null> {
  logger.info('ShipInfoService', 'Fetching ship info version from server')
  try {
    const result = await mairoClient.get<void, MairoResult<string>>(
      import.meta.env.VITE_API_ENDPOINT_INFO_SHIPS_VERSION,
      undefined,
      undefined,
      5000
    )
    logger.info('ShipInfoService', `Fetched ship info version: ${result.data}`)
    return result.data
  } catch (error) {
    logger.error('ShipInfoService', 'Failed to fetch ship info version', error)
    return null
  }
}

function readShipInfoFromCache(): FileShipInfo | null {
  const cachePath = getCacheFilePath()
  logger.debug('ShipInfoService', `Reading ship info from cache: ${cachePath}`)

  try {
    if (!fs.existsSync(cachePath)) {
      logger.info('ShipInfoService', 'Cache file does not exist')
      return null
    }

    const content = fs.readFileSync(cachePath, 'utf-8')
    const shipInfo: FileShipInfo = JSON.parse(content)
    logger.info(
      'ShipInfoService',
      `Read ship info from cache: version=${shipInfo.version}, ships=${Object.keys(shipInfo.ships).length}`
    )
    return shipInfo
  } catch (error) {
    logger.error('ShipInfoService', 'Failed to read ship info from cache', error)
    return null
  }
}

function saveShipInfoToCache(shipInfo: FileShipInfo): void {
  const cachePath = getCacheFilePath()
  logger.info('ShipInfoService', `Saving ship info to cache: ${cachePath}`)

  try {
    const content = JSON.stringify(shipInfo, null, 2)
    fs.writeFileSync(cachePath, content, 'utf-8')
    logger.info('ShipInfoService', 'Ship info saved to cache successfully')
  } catch (error) {
    logger.error('ShipInfoService', 'Failed to save ship info to cache', error)
  }
}

// ------------------------------------------------------------------------------
// ShipInfoCache：内存缓存 + 文件缓存 + 服务器同步
// ------------------------------------------------------------------------------

class ShipInfoCache {
  private memoryCache: FileShipInfo | null = null

  /** 初始化：从本地缓存加载，并检查服务器版本更新 */
  async initialize(): Promise<void> {
    logger.info('ShipInfoService', 'Initializing ship info service')

    const cached = readShipInfoFromCache()
    if (cached) {
      this.memoryCache = cached
    }

    const serverVersion = await fetchShipInfoVersion()
    if (!serverVersion) {
      logger.warn('ShipInfoService', 'Failed to fetch server version, using cached data')
      return
    }

    const cachedVersion = cached?.version
    if (cachedVersion === serverVersion) {
      logger.info('ShipInfoService', `Cache is up to date (version: ${cachedVersion})`)
      return
    }

    logger.info('ShipInfoService', `New version available: ${cachedVersion} -> ${serverVersion}`)
    const serverData = await fetchShipInfoFromServer()
    if (serverData) {
      this.memoryCache = serverData
      saveShipInfoToCache(serverData)
    }
  }

  /** 按 ID 查询舰船信息 */
  get(shipIds: number[]): Record<string, ShipInfoDetail> {
    logger.info('ShipInfoService', `Getting ships info: ${shipIds.length} ships`)

    if (!this.memoryCache) {
      logger.warn('ShipInfoService', 'Memory cache is empty, trying to read from file')
      this.memoryCache = readShipInfoFromCache()
    }

    if (!this.memoryCache) {
      logger.error('ShipInfoService', 'No ship info cache available')
      return {}
    }

    const result: Record<string, ShipInfoDetail> = {}
    const missingIds: number[] = []

    for (const shipId of shipIds) {
      const shipInfo = this.memoryCache.ships[shipId.toString()]
      if (shipInfo) {
        result[shipId.toString()] = shipInfo
      } else {
        missingIds.push(shipId)
      }
    }

    if (missingIds.length > 0) {
      logger.warn('ShipInfoService', `Ship info not found for IDs: ${missingIds.join(', ')}`)
    }

    logger.info('ShipInfoService', `Found ${Object.keys(result).length}/${shipIds.length} ships info`)
    return result
  }

  /** 获取全部舰船信息 */
  getAll(): FileShipInfo | null {
    logger.debug('ShipInfoService', 'Getting all ships info')
    if (!this.memoryCache) {
      this.memoryCache = readShipInfoFromCache()
    }
    return this.memoryCache
  }

  /** 强制从服务器刷新缓存 */
  async refresh(): Promise<boolean> {
    logger.info('ShipInfoService', 'Force refreshing ship info cache')
    const serverData = await fetchShipInfoFromServer()
    if (serverData) {
      this.memoryCache = serverData
      saveShipInfoToCache(serverData)
      return true
    }
    return false
  }
}

const cache = new ShipInfoCache()

// 保持原有 API 不变
export const initShipInfoService = (): Promise<void> => cache.initialize()
export const getShipsInfo = (shipIds: number[]): Record<string, ShipInfoDetail> => cache.get(shipIds)
export const getAllShipsInfo = (): FileShipInfo | null => cache.getAll()
export const refreshShipInfoCache = (): Promise<boolean> => cache.refresh()
