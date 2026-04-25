import { FileArenaInfo } from './file'

/**
 * HTTP / API 通信类型
 *
 * 与后端 Mairo API 交互的请求/响应数据结构。
 */

/** 后端通用响应包装器 */
export interface MairoResult<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

/** 激活请求（首次绑定设备） */
export interface ActivateRequest {
  code: string
  deviceFingerprint: string
  /** Base64 编码的 Ed25519 公钥 */
  publicKey: string
}

/** 登录请求（已有设备） */
export interface LoginRequest {
  code: string
  deviceFingerprint: string
}

/** 后端颁发的 Token */
export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  deviceId: string
}

/** 游戏服务器大区 */
export type Realm = 'ASIA' | 'NA' | 'EU'

/**
 * 对局信息查询请求
 *
 * 合并 `tempArenaInfo.json` 解析结果与玩家选择的大区。
 */
export interface ArenaInfoRequest extends FileArenaInfo {
  realm: Realm
}

/** 玩家单项统计指标（PR、胜率等） */
export interface ArenaPlayerStatItem {
  /** 用于 UI 渲染的颜色值 */
  color: string
  /** 等级标签，如 "Very Good" */
  tag: string
  /** 原始数值 */
  value: number
}

/**
 * 玩家统计维度
 *
 * 包含总场均、舰船场均、同舰种同等级场均等多维度数据。
 */
export interface ArenaPlayerStat {
  battles: ArenaPlayerStatItem
  winRates: ArenaPlayerStatItem
  rapidPr: ArenaPlayerStatItem
  pr: ArenaPlayerStatItem
  avgDmg: ArenaPlayerStatItem
}

/**
 * 对局中的玩家信息
 *
 * 由后端根据 `ArenaInfoRequest` 查询并返回的玩家综合数据。
 */
export interface ArenaPlayerInfo {
  playerId: number
  playerName: string
  relation: number

  /** 当前使用舰船的 ID */
  shipId: number

  /** 公会 ID */
  clanId: number
  clanName: string
  clanTag: string
  clanTagColor: string

  /**
   * 统计信息
   * @remarks 隐藏战绩或场次为 0 时字段不存在
   */
  total?: ArenaPlayerStat
  ship?: ArenaPlayerStat
  totalAtTierType?: ArenaPlayerStat
  shipAtTierType?: ArenaPlayerStat
}

/** 对局信息查询响应 */
export interface ArenaInfoResponse {
  allies: ArenaPlayerInfo[]
  enemies: ArenaPlayerInfo[]
}

/** 登录操作结果 */
export interface LoginResult {
  success: boolean
  /** 是否需要重新激活（设备变更或密钥失效） */
  needReactivate: boolean
  message?: string
}

/** 战绩统计响应 */
export interface RecordStatsResponse {
  totalBattles: number
  winRate: ArenaPlayerStatItem
  avgDamage: ArenaPlayerStatItem
  overallPr: ArenaPlayerStatItem
}

/** 批量 PR 查询响应 */
export interface RecordBatchPrResponse {
  pr?: ArenaPlayerStatItem
  dmg?: ArenaPlayerStatItem
  frags?: ArenaPlayerStatItem
  xp?: ArenaPlayerStatItem
}

// ==============================================================================
// RecordController 新接口类型（面向业务的对局记录服务）
// ==============================================================================

/** 单场对局 enrich 请求 */
export interface RecordEnrichBattleRequest {
  matchResult: {
    result: string
    teamId: number
  }
  players: {
    accountId: number
    shipId: number
    damage: number
    frags: number
    rawExp: number
    teamId: number
  }[]
  realm: Realm
}

/** 单场对局 enrich 响应 */
export interface RecordEnrichBattleResponse {
  evaluateResults: {
    accountId: number
    pr?: ArenaPlayerStatItem
    dmg?: ArenaPlayerStatItem
    fragsLevel?: ArenaPlayerStatItem
    xpLevel?: ArenaPlayerStatItem
  }[]
  clanInfos: {
    accountId: number
    clanId?: number
    clanName?: string
    clanTag?: string
    clanTagColor?: string
  }[]
}
