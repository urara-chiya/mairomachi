import { ArenaPlayerStatItem } from './http'

/**
 * 战斗胜负结果
 */
export interface ReplayMatchResult {
  result: string
  teamId: number
}

/**
 * replay-parser（analyze-lite）原始玩家数据
 *
 * 字段名直接使用 camelCase，与业务类型保持一致，无需额外映射。
 */
export interface ReplayLitePlayer {
  accountId: number
  name: string
  shipId: number
  teamId: number
  relation: string
  isBot: boolean
  damage: number
  frags: number
  exp?: number
  rawExp?: number
}

/**
 * replay-parser（analyze-lite）原始报告结构
 */
export interface ReplayLiteReport {
  matchResult?: {
    result?: string
    teamId?: number
    inferred?: boolean
  }
  mapId?: number
  mapName?: string
  gameMode?: string
  matchGroup?: string
  finishType?: string | null
  players?: ReplayLitePlayer[]
}

/**
 * 单名玩家的战斗报告（遗留类型）
 *
 * 仅用于 replay 解析服务内部的数据映射，新代码应使用 {@link BattleRecordPlayer}。
 */
export interface ReplayPlayerBattleReport {
  accountId: number
  name: string
  shipId: number
  teamId: number
  relation: string
  isBot: boolean
  damage: number
  frags: number
  exp: number
  rawExp: number

  clanId?: number
  clanName?: string
  clanTag?: string
  clanTagColor?: string
}

/** 完整 replay 战斗报告（遗留类型） */
export interface ReplayBattleReportResponse {
  matchResult: ReplayMatchResult
  mapId?: number
  mapName: string
  gameMode: string
  matchGroup: string
  rawMatchGroup: string
  finishType: string
  players: ReplayPlayerBattleReport[]
}

/**
 * 记录详情页的玩家数据（遗留类型）
 *
 * 旧接口 /app/record/detail 仍在使用，新代码应使用 {@link BattleRecordPlayer}。
 */
export interface RecordDetailPlayerResponse extends ReplayPlayerBattleReport {
  pr?: ArenaPlayerStatItem
  dmg?: ArenaPlayerStatItem
  fragsLevel?: ArenaPlayerStatItem
  xpLevel?: ArenaPlayerStatItem
}

/** 玩家公会信息响应（遗留类型，旧接口仍在使用） */
export interface RecordClanInfoResponse {
  accountId: number
  clanId?: number
  clanName?: string
  clanTag?: string
  clanTagColor?: string
}
