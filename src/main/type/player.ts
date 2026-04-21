import { ArenaPlayerInfo } from './http'
import { ShipInfoDetail } from './file'

/** 带舰船详细信息的玩家（用于渲染进程展示） */
export interface PlayerWithShipInfo extends ArenaPlayerInfo {
  shipInfo: ShipInfoDetail | undefined
}
