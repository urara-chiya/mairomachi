import { ReplayBattleReportResponse, ReplayLiteReport } from '../type'
import { parseReplayLite, ReplayParseError } from '../utils/replay-parser'
import { logger } from './logger'

/**
 * 解析 replay 文件
 *
 * 基于 Node.js 实现的轻量解析器，直接读取 .wowsreplay ZIP 包中的 BattleResults packet
 *
 * @param filePath - replay 文件绝对路径
 * @returns 解析后的战斗报告，失败返回 null
 */
export async function parseReplayFile(filePath: string): Promise<ReplayBattleReportResponse | null> {
  try {
    const report = parseReplayLite(filePath)
    logger.info('ReplayService', `Replay parsed successfully: ${filePath}`)
    return buildResponse(report)
  } catch (error) {
    if (error instanceof ReplayParseError) {
      logger.warn('ReplayService', `Replay parse failed: ${error.message}`)
    } else {
      logger.error('ReplayService', 'Unexpected error parsing replay', error)
    }
    return null
  }
}

// ------------------------------------------------------------------------------
// 数据映射：ReplayLiteReport → ReplayBattleReportResponse
// ------------------------------------------------------------------------------

function buildResponse(report: ReplayLiteReport): ReplayBattleReportResponse {
  const matchResult = {
    result: report.matchResult?.result ?? 'unknown',
    teamId: report.matchResult?.teamId ?? 0,
    inferred: report.matchResult?.inferred
  }

  const players = (report.players || []).map((p) => ({
    ...p,
    exp: p.exp ?? 0,
    rawExp: p.rawExp ?? 0
  }))

  return {
    matchResult,
    mapName: formatMapName(report.mapName ?? null) ?? '',
    gameMode: localizeGameMode(report.gameMode ?? null) ?? '',
    matchGroup: localizeMatchGroup(report.matchGroup ?? null) ?? '',
    rawMatchGroup: report.matchGroup ?? '',
    finishType: report.finishType ?? '',
    players
  }
}

function formatMapName(raw: string | null): string | null {
  if (!raw) return null
  let s = raw
  if (s.startsWith('spaces/')) {
    s = s.substring(7)
  }
  const firstUnderscore = s.indexOf('_')
  if (firstUnderscore > 0 && firstUnderscore < s.length - 1) {
    const prefix = s.substring(0, firstUnderscore)
    if (/^\d+$/.test(prefix)) {
      s = s.substring(firstUnderscore + 1)
    }
  }
  return s.replace(/_/g, ' ')
}

const GAME_MODE_NAMES: Record<string, string> = {
  domination_3point: '制海权',
  domination_4point: '制海权',
  domination_localweather_3point: '制海权',
  domination: '制海权',
  standard: '标准战斗',
  epicenter: '热点',
  assault: '突袭',
  scenario: '剧情',
  training: '训练房',
  clan: '军团战',
  ranked: '排位赛',
  brawl: '对决',
  cooperative: '联合作战',
  random: '随机战',
  event: '特殊模式',
  air_defense: '守卫机场',
  armsrace: '军备竞赛',
  arms_race: '军备竞赛',
  RandomBattle: '随机战',
  RankedBattle: '排位赛',
  ClanBattle: '军团战',
  CooperativeBattle: '联合作战',
  BrawlBattle: '对决',
  TrainingBattle: '训练房',
  EventBattle: '特殊模式'
}

const MATCH_GROUP_NAMES: Record<string, string> = {
  random: '随机战',
  ranked: '排位赛',
  clan: '军团战',
  cooperative: '联合作战',
  brawl: '对决',
  training: '训练房',
  event: '特殊模式',
  pvp: '随机战'
}

function localizeGameMode(raw: string | null): string | null {
  if (!raw) return null
  return GAME_MODE_NAMES[raw] || raw
}

function localizeMatchGroup(raw: string | null): string | null {
  if (!raw) return null
  return MATCH_GROUP_NAMES[raw] || raw
}
