import {
  BattleRecord,
  MairoResult,
  Realm,
  RecordBatchPrResponse,
  RecordClanInfoResponse,
  RecordDetailPlayerResponse,
  RecordStatsResponse
} from '../type'
import mairoClient from '../http/client'
import { deleteRecord, getArenaMonitorConfig, getRecords, saveRecord } from '../store'
import { findLatestReplay } from '../utils/replay-files'
import { parseReplayFile } from './replay-service'
import { logger } from './logger'

// 从 IPC 类型推导请求结构，避免重复定义
type RecordDetailRequest = {
  matchResult: BattleRecord['matchResult']
  players: BattleRecord['players']
}
type RecordStatsItem = {
  shipId: number
  damage: number
  frags: number
  wins: number
}
type RecordBatchPrItem = {
  shipId: number
  damage: number
  frags: number
  wins: number
  rawExp: number
}
type RecordClanInfoRequest = { accountIds: number[]; realm: Realm }

export function listRecords(): BattleRecord[] {
  return getRecords()
}

export function removeRecord(id: string): void {
  deleteRecord(id)
}

/**
 * 向后端请求 enrich 数据（PR、伤害等级、公会信息等）并合并到记录中。
 * 失败时返回原始记录，不影响主流程。
 */
export async function enrichBattleRecord(record: BattleRecord): Promise<BattleRecord> {
  try {
    const accountIds = record.players.map((p) => p.accountId)
    const [detailPlayers, clanInfos] = await Promise.all([
      fetchRecordDetail({
        matchResult: record.matchResult,
        players: record.players
      }),
      fetchClanInfo({ accountIds, realm: record.realm })
    ])

    if (detailPlayers.length > 0) {
      record.enrichedPlayers = detailPlayers
    }
    if (clanInfos.length > 0) {
      record.enrichedClanInfos = clanInfos
    }

    logger.info(
      'RecordService',
      `Enriched record ${record.id}: ${detailPlayers.length} players, ${clanInfos.length} clans`
    )
  } catch (error) {
    logger.warn('RecordService', `Failed to enrich record ${record.id}, saving raw data`, error)
  }
  return record
}

export async function parseAndSaveLatestReplay(realm: Realm): Promise<BattleRecord | null> {
  const monitorConfig = getArenaMonitorConfig()
  const gamePath = monitorConfig.gamePath
  if (!gamePath) {
    logger.warn('RecordService', 'Game path not configured, cannot parse replay')
    return null
  }

  const replayPath = findLatestReplay(gamePath)
  if (!replayPath) {
    logger.warn('RecordService', 'No replay file found')
    return null
  }

  logger.info('RecordService', `Parsing replay: ${replayPath}`)
  const report = await parseReplayFile(replayPath)
  if (!report) {
    logger.error('RecordService', 'Failed to parse replay')
    return null
  }

  if (report.rawMatchGroup !== 'pvp') {
    logger.info('RecordService', `Skipped non-pvp replay: ${report.rawMatchGroup} (${report.matchGroup})`)
    return null
  }

  let record: BattleRecord = {
    ...report,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    dateTime: new Date().toISOString(),
    realm,
    replayPath,
    self: report.players.find((p) => p.relation === 'Self')
  }

  // 尝试向后端请求 enrich 数据，失败不影响保存
  record = await enrichBattleRecord(record)

  saveRecord(record)
  logger.info('RecordService', `Battle record saved: ${record.id}`)
  return record
}

// ==============================================================================
// 后端 API 调用（战绩记录相关）
// ==============================================================================

export async function fetchRecordDetail(request: RecordDetailRequest): Promise<RecordDetailPlayerResponse[]> {
  logger.info('RecordService', 'Fetching record detail')
  const result = await mairoClient.post<RecordDetailRequest, MairoResult<RecordDetailPlayerResponse[]>>(
    import.meta.env.VITE_API_ENDPOINT_RECORD_DETAIL,
    request
  )
  return result.data ?? []
}

export async function fetchRecordStats(request: RecordStatsItem[]): Promise<RecordStatsResponse> {
  logger.info('RecordService', 'Fetching record stats')
  const body = { records: request }
  const result = await mairoClient.post<{ records: RecordStatsItem[] }, MairoResult<RecordStatsResponse>>(
    import.meta.env.VITE_API_ENDPOINT_RECORD_STATS,
    body
  )
  return (
    result.data ?? {
      winRate: 0,
      avgDamage: 0,
      overallPr: 0,
      winRateColor: '',
      avgDamageColor: '',
      overallPrColor: ''
    }
  )
}

export async function fetchBatchPr(request: RecordBatchPrItem[]): Promise<RecordBatchPrResponse[]> {
  logger.info('RecordService', 'Fetching batch PR')
  const result = await mairoClient.post<RecordBatchPrItem[], MairoResult<RecordBatchPrResponse[]>>(
    import.meta.env.VITE_API_ENDPOINT_RECORD_EVALUATE,
    request
  )
  return result.data ?? []
}

export async function fetchClanInfo(request: RecordClanInfoRequest): Promise<RecordClanInfoResponse[]> {
  logger.info('RecordService', `Fetching clan info for ${request.accountIds.length} players`)
  const result = await mairoClient.post<RecordClanInfoRequest, MairoResult<RecordClanInfoResponse[]>>(
    import.meta.env.VITE_API_ENDPOINT_RECORD_CLAN_INFO,
    request
  )
  return result.data ?? []
}
