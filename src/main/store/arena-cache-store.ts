/**
 * 对局缓存 Store
 *
 * 缓存最近一次成功查询的对局信息，用于应用重启后恢复对局面板状态。
 */

import ElectronStore from 'electron-store'
import { ArenaInfoResponse } from '../type'
import { logger } from '../service/logger'

interface ArenaCacheStoreSchema {
  cache: {
    dateTime: string
    response: ArenaInfoResponse
  } | null
}

const store = new ElectronStore<ArenaCacheStoreSchema>({
  name: 'arena-cache-store',
  defaults: {
    cache: null
  }
})

logger.info('ArenaCacheStore', 'Arena cache store initialized')

/** 获取缓存的对局信息 */
export function getArenaCache(): {
  dateTime: string
  response: ArenaInfoResponse
} | null {
  return store.get('cache')
}

/** 保存对局信息到缓存 */
export function saveArenaCache(dateTime: string, response: ArenaInfoResponse): void {
  store.set('cache', { dateTime, response })
  logger.info('ArenaCacheStore', `Arena cache saved, dateTime=${dateTime}`)
}

/** 清空对局缓存 */
export function clearArenaCache(): void {
  store.set('cache', null)
  logger.info('ArenaCacheStore', 'Arena cache cleared')
}
