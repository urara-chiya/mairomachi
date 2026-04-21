/**
 * 应用配置类型
 *
 * 定义用户可持久化的配置项结构，通过 `electron-store` 读写。
 * 修改后需同步更新 `ConfigStoreSchema` 与默认值。
 */

/** 对局监控配置 */
export interface ArenaMonitorConfig {
  /** 游戏客户端安装路径 */
  gamePath: string
  /** 是否启动后自动监控 */
  enableAutoMonitor: boolean
  /** 游戏服务器 */
  realm: 'NA' | 'EU' | 'ASIA'
}

/** 战绩记录配置 */
export interface RecordConfig {
  /** 是否自动保存战绩 */
  enableAutoRecord: boolean
  /** 本地缓存天数 */
  cacheDays: number
}

/** 界面显示配置 */
export interface UIConfig {
  /** 主题 */
  theme: 'light' | 'dark'
  /** 我方玩家列表布局方向 */
  allyUI: 'ltr' | 'rtl'
  /** 敌方玩家列表布局方向 */
  enemyUI: 'ltr' | 'rtl'
  /** 舰船名称显示语言 */
  shipNameLanguage: 'zh-cn' | 'zh-tw' | 'en' | 'ja'
}

/** 完整应用配置 */
export interface AppConfig {
  arenaMonitor: ArenaMonitorConfig
  record: RecordConfig
  ui: UIConfig
}

/**
 * 按模块划分的配置映射
 *
 * 用于 `electron-store` 的 `name` 选项，支持按子模块独立读写。
 */
export type AppConfigs = {
  app: AppConfig
  'arena-monitor': ArenaMonitorConfig
  record: RecordConfig
  ui: UIConfig
}
