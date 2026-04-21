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

  const record: BattleRecord = {
    ...report,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    dateTime: new Date().toISOString(),
    realm,
    replayPath,
    self: report.players.find((p) => p.relation === 'Self')
  }

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
      avgPr: 0,
      winRateColor: '',
      avgDamageColor: '',
      prColor: ''
    }
  )
}

export async function fetchBatchPr(request: RecordBatchPrItem[]): Promise<RecordBatchPrResponse[]> {
  logger.info('RecordService', 'Fetching batch PR')
  const result = await mairoClient.post<RecordBatchPrItem[], MairoResult<RecordBatchPrResponse[]>>(
    import.meta.env.VITE_API_ENDPOINT_RECORD_BATCH_PR,
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
