import { ArenaPlayerStatItem } from './http'
import { ShipInfoDetail } from './file'

/**
 * 回放文件（`.wowsreplay`）解析类型
 *
 * 定义 replay 文件头中的战斗结果与玩家表现数据。
 */

/** 战斗胜负结果 */
export interface ReplayMatchResult {
  result: string
  teamId: number
}

/**
 * replay-parser（analyze-lite）原始玩家数据
 *
 * 字段名保持与 replayshark 输出一致（snake_case），
 * 由调用方（如 replay-service）负责映射到 camelCase 的业务类型。
 */
export interface ReplayLitePlayer {
  account_id: number
  name: string
  ship_id: number
  team_id: number
  relation: string
  is_bot: boolean
  damage: number
  frags: number
  exp?: number
  raw_exp?: number
}

/**
 * replay-parser（analyze-lite）原始报告结构
 *
 * 与 replayshark analyze-lite 的 JSON 输出字段一一对应。
 */
export interface ReplayLiteReport {
  match_result?: {
    result?: string
    team_id?: number
    inferred?: boolean
  }
  map_name?: string
  game_mode?: string
  match_group?: string
  finish_type?: string | null
  players?: ReplayLitePlayer[]
}

/**
 * 单名玩家的战斗报告
 *
 * 从 replay 文件解析的原始数据，不含后端计算的 PR 等级。
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

/** 完整 replay 战斗报告 */
export interface ReplayBattleReportResponse {
  matchResult: ReplayMatchResult
  mapName: string
  gameMode: string
  matchGroup: string
  rawMatchGroup: string
  finishType: string
  players: ReplayPlayerBattleReport[]
}

/**
 * 记录详情页的玩家数据
 *
 * 在 `ReplayPlayerBattleReport` 基础上追加后端计算的 PR、伤害等级等。
 */
export interface RecordDetailPlayerResponse extends ReplayPlayerBattleReport {
  pr?: ArenaPlayerStatItem
  dmg?: ArenaPlayerStatItem
  fragsLevel?: ArenaPlayerStatItem
  xpLevel?: ArenaPlayerStatItem
}

/** 玩家公会信息响应 */
export interface RecordClanInfoResponse {
  accountId: number
  clanId?: number
  clanName?: string
  clanTag?: string
  clanTagColor?: string
}

/**
 * 带舰船信息的完整玩家记录
 *
 * 用于战绩详情页展示，舰船信息通过 `shipId` 查询本地缓存后填充。
 */
export interface RecordPlayerInfo extends RecordDetailPlayerResponse {
  shipInfo: ShipInfoDetail | undefined
}
