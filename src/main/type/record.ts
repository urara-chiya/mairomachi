import { ArenaPlayerStatItem } from './http'
import { ShipInfoDetail } from './file'
import { Realm } from './http'

export type { Realm }

/**
 * 对局记录中的玩家
 *
 * 前端自有的数据模型，聚合了 replay 原始数据、后端计算的等级数据、以及公会信息。
 */
export interface BattleRecordPlayer {
  /** 玩家账号 ID */
  accountId: number
  /** 玩家名称 */
  name: string
  /** 舰船 ID */
  shipId: number
  /** 队伍 ID */
  teamId: number
  /** 关系（Self / Ally / Enemy） */
  relation: string
  /** 是否为机器人 */
  isBot: boolean
  /** 伤害 */
  damage: number
  /** 击杀 */
  frags: number
  /** 经验（基础经验） */
  exp: number
  /** 原始经验 */
  rawExp: number

  // 后端计算字段
  /** PR 等级 */
  pr?: ArenaPlayerStatItem
  /** 伤害等级 */
  dmg?: ArenaPlayerStatItem
  /** 击杀等级 */
  fragsLevel?: ArenaPlayerStatItem
  /** 经验等级 */
  xpLevel?: ArenaPlayerStatItem

  // 公会信息
  /** 公会 ID */
  clanId?: number
  /** 公会名称 */
  clanName?: string
  /** 公会标签 */
  clanTag?: string
  /** 公会标签颜色 */
  clanTagColor?: string
}

/**
 * 本地持久化的战斗记录
 */
export interface BattleRecord {
  /** 本地生成的唯一标识（时间戳 + 随机数） */
  id: string
  /** 战斗时间 */
  dateTime: string
  /** 游戏服务器 */
  realm: Realm
  /** 原始 replay 文件绝对路径 */
  replayPath: string
  /** 战斗结果 */
  matchResult: {
    result: string
    teamId: number
  }
  /** 地图名称 */
  mapName: string
  /** 游戏模式 */
  gameMode: string
  /** 匹配分组 */
  matchGroup: string
  /** 原始匹配分组 */
  rawMatchGroup: string
  /** 结束类型 */
  finishType: string
  /** 所有玩家数据 */
  players: BattleRecordPlayer[]
  /** 当前玩家自身的战斗报告 */
  self?: BattleRecordPlayer
}

/**
 * 带舰船信息的完整玩家记录
 *
 * 用于战绩详情页展示，舰船信息通过 `shipId` 查询本地缓存后填充。
 */
export interface RecordPlayerInfo extends BattleRecordPlayer {
  shipInfo: ShipInfoDetail | undefined
}
