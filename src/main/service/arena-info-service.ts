/**
 * 对局信息查询服务
 *
 * 负责向后端查询对局玩家信息，并维护本地缓存。
 */

import { ArenaInfoRequest, ArenaInfoResponse, MairoResult } from '../type'
import mairoClient from '../http/client'
import { getArenaCache, saveArenaCache } from '../store'
import { logger } from './logger'

/**
 * 查询对局信息
 * @param req - 包含 tempArenaInfo.json 内容与大区的请求
 * @returns 对局双方玩家信息，失败返回 null
 */
export async function fetchArenaInfo(req: ArenaInfoRequest): Promise<ArenaInfoResponse | null> {
  logger.info('ArenaInfoService', `Fetching arena info, vehicles: ${req.vehicles?.length || 0}`)

  const cached = getArenaCache()
  if (cached && cached.dateTime === req.dateTime) {
    logger.info('ArenaInfoService', `Arena cache hit, dateTime=${req.dateTime}`)
    return cached.response
  }

  logger.debug('ArenaInfoService', `Request details - player: ${req.playerName}, map: ${req.mapDisplayName}`)
  try {
    const result = await mairoClient.post<ArenaInfoRequest, MairoResult<ArenaInfoResponse>>(
      import.meta.env.VITE_API_ENDPOINT_ARENA,
      req
    )
    logger.info('ArenaInfoService', `Arena info fetched successfully, items: ${Object.keys(result.data || {}).length}`)
    if (result.data) {
      saveArenaCache(req.dateTime, result.data)
    }
    return result.data
  } catch (error) {
    logger.error('ArenaInfoService', 'Failed to fetch arena info', error)
    return null
  }
}
