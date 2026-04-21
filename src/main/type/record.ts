import { ReplayBattleReportResponse, ReplayPlayerBattleReport } from './replay'
import { Realm } from './http'

/**
 * 本地持久化的战斗记录类型
 *
 * 在 `ReplayBattleReportResponse` 基础上追加本地元数据（ID、时间、大区、文件路径）。
 */

export type { Realm }

export interface BattleRecord extends ReplayBattleReportResponse {
  /** 本地生成的唯一标识（时间戳 + 随机数） */
  id: string
  /** 战斗时间 */
  dateTime: string
  /** 游戏服务器 */
  realm: Realm
  /** 原始 replay 文件绝对路径 */
  replayPath: string
  /** 当前玩家自身的战斗报告（从 players 中提取） */
  self?: ReplayPlayerBattleReport
}
