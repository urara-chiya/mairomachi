/**
 * 应用配置 Store
 *
 * 持久化用户配置（UI、对局监控、战绩记录等），支持按模块读写。
 */

import type { AppConfigs } from '../type'
import ElectronStore from 'electron-store'
import { logger } from '../service/logger'

interface ConfigStoreSchema {
  config: AppConfigs['app']
}

const DEFAULT: AppConfigs['app'] = {
  ui: {
    theme: 'dark',
    allyUI: 'ltr',
    enemyUI: 'rtl',
    shipNameLanguage: 'zh-cn'
  },
  arenaMonitor: {
    gamePath: '',
    enableAutoMonitor: false,
    realm: 'ASIA'
  },
  record: {
    enableAutoRecord: false,
    cacheDays: 7
  }
}

const store = new ElectronStore<ConfigStoreSchema>({
  name: 'config-store',
  defaults: {
    config: DEFAULT
  }
})

logger.info('ConfigStore', 'Config store initialized')

/** 读取完整配置 */
export function getConfig(): AppConfigs['app'] {
  logger.debug('ConfigStore', 'Reading config')
  const saved = store.get('config')
  /**
   * @remarks 兼容旧版本配置：补全缺失的 record 字段
   */
  if (!saved.record) {
    saved.record = { enableAutoRecord: false, cacheDays: 30 }
    store.set('config', saved)
  }
  return saved
}

/** 读取 UI 配置 */
export function getUIConfig(): AppConfigs['ui'] {
  logger.debug('ConfigStore', 'Reading UI config')
  return store.get('config').ui
}

/** 读取对局监控配置 */
export function getArenaMonitorConfig(): AppConfigs['arena-monitor'] {
  logger.debug('ConfigStore', 'Reading monitor config')
  return store.get('config').arenaMonitor
}

/** 读取战绩记录配置 */
export function getRecordConfig(): AppConfigs['record'] {
  logger.debug('ConfigStore', 'Reading record config')
  return store.get('config').record
}

/** 保存完整配置 */
export function setConfig(conf: AppConfigs['app']): void {
  logger.debug('ConfigStore', 'Saving full config')
  store.set('config', conf)
}

/** 保存 UI 配置 */
export function setUIConfig(conf: AppConfigs['ui']): void {
  logger.debug(
    'ConfigStore',
    `Saving UI config: theme=${conf.theme}, allyUI=${conf.allyUI}, enemyUI=${conf.enemyUI}, shipNameLanguage=${conf.shipNameLanguage}`
  )
  const old = getConfig()
  old.ui = conf
  store.set('config', old)
}

/** 保存对局监控配置 */
export function setArenaMonitorConfig(conf: AppConfigs['arena-monitor']): void {
  logger.debug(
    'ConfigStore',
    `Saving monitor config: gamePath=${conf.gamePath}, enableAutoMonitor=${conf.enableAutoMonitor}, realm=${conf.realm}`
  )
  const old = getConfig()
  old.arenaMonitor = conf
  store.set('config', old)
}

/** 保存战绩记录配置 */
export function setRecordConfig(conf: AppConfigs['record']): void {
  logger.debug(
    'ConfigStore',
    `Saving record config: enableAutoRecord=${conf.enableAutoRecord}, cacheDays=${conf.cacheDays}`
  )
  const old = getConfig()
  old.record = conf
  store.set('config', old)
}

/** 重置为默认配置 */
export function reset(): void {
  logger.info('ConfigStore', 'Resetting config to defaults')
  store.set('config', DEFAULT)
}
