import {
  BattleRecord,
  MairoResult,
  Realm,
  RecordBatchPrResponse,
  RecordClanInfoResponse,
  RecordDetailPlayerResponse,
  RecordEnrichBattleRequest,
  RecordEnrichBattleResponse,
  RecordStatsResponse
} from '../type'
import mairoClient from '../http/client'
import { deleteRecord, getArenaMonitorConfig, getRecords, hasRecordByReplayPath, saveRecord } from '../store'
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
 * 使用新的面向业务接口 /api/v1/record/battle/enrich，串行计算+查公会。
 * 失败时填充降级值，不影响主流程。
 */
export async function enrichBattleRecord(record: BattleRecord): Promise<BattleRecord> {
  try {
    const { evaluateResults, clanInfos } = await fetchRecordEnrich({
      matchResult: record.matchResult,
      players: record.players.map((p) => ({
        accountId: p.accountId,
        shipId: p.shipId,
        damage: p.damage,
        frags: p.frags,
        rawExp: p.rawExp,
        teamId: p.teamId
      })),
      realm: record.realm
    })

    // 合并计算结果
    for (const result of evaluateResults) {
      const player = record.players.find((p) => p.accountId === result.accountId)
      if (player) {
        player.pr = result.pr
        player.dmg = result.dmg
        player.fragsLevel = result.fragsLevel
        player.xpLevel = result.xpLevel
      }
    }

    // 合并公会信息
    for (const clan of clanInfos) {
      const player = record.players.find((p) => p.accountId === clan.accountId)
      if (player) {
        player.clanId = clan.clanId
        player.clanName = clan.clanName
        player.clanTag = clan.clanTag
        player.clanTagColor = clan.clanTagColor
      }
    }

    logger.info(
      'RecordService',
      `Enriched record ${record.id}: ${evaluateResults.length} evaluateResults, ${clanInfos.length} clans`
    )
  } catch (error) {
    logger.warn('RecordService', `Failed to enrich record ${record.id}, filling fallback values`, error)
    // 填充降级值
    for (const player of record.players) {
      player.dmg = { value: player.damage, color: '#888888', tag: '' }
      player.fragsLevel = { value: player.frags, color: '#888888', tag: '' }
      player.xpLevel = { value: player.rawExp, color: '#888888', tag: '' }
    }
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

  return parseAndSaveReplayFile(replayPath, realm)
}

export async function parseAndSaveReplayFile(replayPath: string, realm: Realm): Promise<BattleRecord | null> {
  // 去重检测
  if (hasRecordByReplayPath(replayPath)) {
    logger.warn('RecordService', `Replay already exists: ${replayPath}`)
    throw new Error('该 replay 文件已被导入过')
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
    matchResult: report.matchResult,
    mapName: report.mapName,
    mapId: report.mapId,
    gameMode: report.gameMode,
    matchGroup: report.matchGroup,
    rawMatchGroup: report.rawMatchGroup,
    finishType: report.finishType,
    players: report.players as BattleRecord['players'],
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    dateTime: new Date().toISOString(),
    realm,
    replayPath,
    self: report.players.find((p) => p.relation === 'Self') as BattleRecord['self']
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
    import.meta.env.VITE_API_ENDPOINT_RECORD_STATS_NEW,
    body
  )
  return (
    result.data ?? {
      totalBattles: 0,
      winRate: { value: 0, color: '#888888', tag: '' },
      avgDamage: { value: 0, color: '#888888', tag: '' },
      overallPr: { value: 0, color: '#888888', tag: '' }
    }
  )
}

export async function fetchRecordStatsBatch(
  requests: { records: RecordStatsItem[] }[]
): Promise<RecordStatsResponse[]> {
  logger.info('RecordService', 'Fetching record stats batch')
  const result = await mairoClient.post<{ records: RecordStatsItem[] }[], MairoResult<RecordStatsResponse[]>>(
    import.meta.env.VITE_API_ENDPOINT_RECORD_STATS_BATCH,
    requests
  )
  return result.data ?? []
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

export async function fetchRecordEnrich(request: RecordEnrichBattleRequest): Promise<RecordEnrichBattleResponse> {
  logger.info('RecordService', `Enriching battle record: ${request.players.length} players`)
  const result = await mairoClient.post<RecordEnrichBattleRequest, MairoResult<RecordEnrichBattleResponse>>(
    import.meta.env.VITE_API_ENDPOINT_RECORD_BATTLE_ENRICH,
    request
  )
  return (
    result.data ?? {
      evaluateResults: [],
      clanInfos: []
    }
  )
}
