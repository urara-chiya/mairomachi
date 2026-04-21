/**
 * 游戏客户端原始文件解析类型
 *
 * 对应 `ship.json`（舰船信息）与 `tempArenaInfo.json`（对局信息）的数据结构。
 */

/** 舰船名称支持的语言 */
export type ShipLanguageKey = 'en' | 'zh-cn' | 'zh-tw' | 'ja'

/** 单艘舰船的详细信息 */
export interface ShipInfoDetail {
  /** 多语言名称映射 */
  names: Record<ShipLanguageKey, string>
  nation: string
  tier: string
  type: string
}

/** `ship.json` 根结构 */
export interface FileShipInfo {
  version: string
  date: string
  /** key 为 shipId */
  ships: Record<string, ShipInfoDetail>
}

/** `tempArenaInfo.json` 中的单舰船信息 */
export interface ArenaInfoVehicle {
  shipId: number
  relation: number
  id: number
  name: string
}

/**
 * `tempArenaInfo.json` 根结构
 *
 * @remarks 其中 `never` 类型的字段（如 `mapBorder`）为游戏客户端保留字段，
 *          实际解析时按占位处理，不参与业务逻辑。
 */
export interface FileArenaInfo {
  matchGroup: string
  gameMode: number
  filtersByShipConfigName: object
  clientVersionFromExe: number
  mapBorder: never
  scenarioUiCategoryId: number
  eventType: string
  mapDisplayName: string
  mapId: number
  clientVersionFromXml: string
  weatherParams: Record<string, string[]>
  disabledShipClasses: never[]
  playersPerTeam: number
  duration: number
  gameTypeGameParamId: number
  name: string
  scenario: string
  playerID: number
  vehicles: ArenaInfoVehicle[]
  gameType: string
  dateTime: string
  mapName: string
  playerName: string
  scenarioConfigId: number
  teamsCount: number
  playerVehicle: string
  battleDuration: number
  battleItemTrees: object
}
