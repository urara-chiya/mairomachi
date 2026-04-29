import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { FileMapInfo } from '../type'
import mairoClient from '../http/client'
import { logger } from './logger'

const CACHE_FILE_NAME = 'map-info-cache.json'

function getCacheFilePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, CACHE_FILE_NAME)
}

async function fetchMapInfoFromServer(): Promise<FileMapInfo | null> {
  logger.info('MapInfoService', 'Fetching map info from server')
  try {
    const result = await mairoClient.get<void, { data: FileMapInfo }>(
      import.meta.env.VITE_API_ENDPOINT_INFO_MAPS,
      undefined,
      undefined,
      5000
    )
    logger.info(
      'MapInfoService',
      `Fetched map info: version=${result.data.version}, maps=${Object.keys(result.data.maps).length}`
    )
    return result.data
  } catch (error) {
    logger.error('MapInfoService', 'Failed to fetch map info from server', error)
    return null
  }
}

async function fetchMapInfoVersion(): Promise<string | null> {
  logger.info('MapInfoService', 'Fetching map info version from server')
  try {
    const result = await mairoClient.get<void, { data: string }>(
      import.meta.env.VITE_API_ENDPOINT_INFO_MAPS_VERSION,
      undefined,
      undefined,
      5000
    )
    logger.info('MapInfoService', `Fetched map info version: ${result.data}`)
    return result.data
  } catch (error) {
    logger.error('MapInfoService', 'Failed to fetch map info version', error)
    return null
  }
}

function readMapInfoFromCache(): FileMapInfo | null {
  const cachePath = getCacheFilePath()
  logger.debug('MapInfoService', `Reading map info from cache: ${cachePath}`)

  try {
    if (!fs.existsSync(cachePath)) {
      logger.info('MapInfoService', 'Cache file does not exist')
      return null
    }

    const content = fs.readFileSync(cachePath, 'utf-8')
    const mapInfo: FileMapInfo = JSON.parse(content)
    logger.info(
      'MapInfoService',
      `Read map info from cache: version=${mapInfo.version}, maps=${Object.keys(mapInfo.maps).length}`
    )
    return mapInfo
  } catch (error) {
    logger.error('MapInfoService', 'Failed to read map info from cache', error)
    return null
  }
}

function saveMapInfoToCache(mapInfo: FileMapInfo): void {
  const cachePath = getCacheFilePath()
  logger.info('MapInfoService', `Saving map info to cache: ${cachePath}`)

  try {
    const content = JSON.stringify(mapInfo, null, 2)
    fs.writeFileSync(cachePath, content, 'utf-8')
    logger.info('MapInfoService', 'Map info saved to cache successfully')
  } catch (error) {
    logger.error('MapInfoService', 'Failed to save map info to cache', error)
  }
}

// ------------------------------------------------------------------------------
// MapInfoCache：内存缓存 + 文件缓存 + 服务器同步
// ------------------------------------------------------------------------------

class MapInfoCache {
  private memoryCache: FileMapInfo | null = null

  /** 初始化：从本地缓存加载，并检查服务器版本更新 */
  async initialize(): Promise<void> {
    logger.info('MapInfoService', 'Initializing map info service')

    const cached = readMapInfoFromCache()
    if (cached) {
      this.memoryCache = cached
    }

    const serverVersion = await fetchMapInfoVersion()
    if (!serverVersion) {
      logger.warn('MapInfoService', 'Failed to fetch server version, using cached data')
      return
    }

    const cachedVersion = cached?.version
    if (cachedVersion === serverVersion) {
      logger.info('MapInfoService', `Cache is up to date (version: ${cachedVersion})`)
      return
    }

    logger.info('MapInfoService', `New version available: ${cachedVersion} -> ${serverVersion}`)
    const serverData = await fetchMapInfoFromServer()
    if (serverData) {
      this.memoryCache = serverData
      saveMapInfoToCache(serverData)
    }
  }

  /** 获取全部地图信息 */
  getAll(): FileMapInfo | null {
    logger.debug('MapInfoService', 'Getting all map info')
    if (!this.memoryCache) {
      this.memoryCache = readMapInfoFromCache()
    }
    return this.memoryCache
  }

  /** 查询地图名称 */
  getMapName(mapId: number | string, language: string): string | null {
    const mapInfo = this.getAll()
    if (!mapInfo) return null
    const detail = mapInfo.maps[String(mapId)]
    if (!detail) return null
    return detail.names[language] ?? detail.names['en'] ?? null
  }

  /** 强制从服务器刷新缓存 */
  async refresh(): Promise<boolean> {
    logger.info('MapInfoService', 'Force refreshing map info cache')
    const serverData = await fetchMapInfoFromServer()
    if (serverData) {
      this.memoryCache = serverData
      saveMapInfoToCache(serverData)
      return true
    }
    return false
  }
}

const cache = new MapInfoCache()

// 保持原有 API 不变
export const initMapInfoService = (): Promise<void> => cache.initialize()
export const getMapInfo = (): FileMapInfo | null => cache.getAll()
export const getMapName = (mapId: number | string, language: string): string | null => cache.getMapName(mapId, language)
export const refreshMapInfoCache = (): Promise<boolean> => cache.refresh()
