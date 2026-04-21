import { AppConfigs } from '../type'
import { clearExpiredRecords, getConfig, reset, setConfig } from '../store'
import objectsDiff from '../utils/diff'
import { ArenaMonitorController } from './arena-monitor-service'
import { logger } from './logger'
import { notifyArenaRecordStatus, notifySettingsChanged } from '../utils/ipc-sender'

interface ConfigServiceDeps {
  monitor: ArenaMonitorController
}

/**
 * 创建配置服务实例
 *
 * @param deps - 依赖注入：对局监控器控制器
 */
export function createConfigService(deps: ConfigServiceDeps): {
  resetAppConfig(): void
  getAppConfig(): AppConfigs['app']
  saveAppConfig(newConf: AppConfigs['app']): void
} {
  function handleArenaConfigChange(
    oldConfig: AppConfigs['arena-monitor'],
    newConfig: AppConfigs['arena-monitor']
  ): void {
    logger.debug('ConfigService', 'Processing monitor config change')
    const diff = objectsDiff<AppConfigs['arena-monitor']>(oldConfig, newConfig)
    if (Object.keys(diff).length <= 0) {
      logger.debug('ConfigService', 'No monitor config changes')
      return
    }
    logger.info('ConfigService', `Monitor config changed: ${Object.keys(diff).join(', ')}`)

    if (diff.gamePath) {
      logger.info('ConfigService', `Game path changed: ${diff.gamePath.from} -> ${diff.gamePath.to}`)
      deps.monitor.startWatch(diff.gamePath.to)
    }

    if (diff.enableAutoMonitor) {
      logger.info(
        'ConfigService',
        `Auto-monitor status changed: ${diff.enableAutoMonitor.from} -> ${diff.enableAutoMonitor.to}`
      )
      if (diff.enableAutoMonitor.to) {
        deps.monitor.startWatch(newConfig.gamePath)
      } else {
        deps.monitor.stopWatch()
      }
    }
  }

  function handleRecordConfigChange(
    oldConfig: AppConfigs['record'] | undefined,
    newConfig: AppConfigs['record']
  ): void {
    logger.debug('ConfigService', 'Processing record config change')
    const safeOld = oldConfig ?? { enableAutoRecord: false, cacheDays: 30 }
    const diff = objectsDiff<AppConfigs['record']>(safeOld, newConfig)
    if (Object.keys(diff).length <= 0) {
      logger.debug('ConfigService', 'No record config changes')
      return
    }
    logger.info('ConfigService', `Record config changed: ${Object.keys(diff).join(', ')}`)

    if (diff.cacheDays) {
      logger.info('ConfigService', `Cache days changed: ${diff.cacheDays.from} -> ${diff.cacheDays.to}`)
      clearExpiredRecords(diff.cacheDays.to)
    }

    if (diff.enableAutoRecord) {
      logger.info(
        'ConfigService',
        `Auto-record status changed: ${diff.enableAutoRecord.from} -> ${diff.enableAutoRecord.to}`
      )
      notifyArenaRecordStatus(diff.enableAutoRecord.to ? 'idle' : 'disabled')
    }
  }

  return {
    resetAppConfig(): void {
      logger.info('ConfigService', 'Resetting to default settings')
      const old = getConfig()
      logger.debug(
        'ConfigService',
        `Old settings - theme: ${old.ui.theme}, auto-monitor: ${old.arenaMonitor.enableAutoMonitor}`
      )
      reset()
      const _new = getConfig()
      logger.info('ConfigService', 'Settings reset to defaults')
      handleArenaConfigChange(old.arenaMonitor, _new.arenaMonitor)
      handleRecordConfigChange(old.record, _new.record)
      notifySettingsChanged(_new)
    },

    getAppConfig(): AppConfigs['app'] {
      logger.debug('ConfigService', 'Getting app config')
      return getConfig()
    },

    saveAppConfig(newConf: AppConfigs['app']): void {
      logger.info('ConfigService', 'Saving app settings')
      if (!newConf.record) {
        logger.warn('ConfigService', 'Incoming config missing record field, applying default')
        newConf.record = { enableAutoRecord: false, cacheDays: 30 }
      }
      const oldConfig = getConfig()
      const { arenaMonitor: oldArenaMonitorConf } = oldConfig
      const { arenaMonitor: newArenaMonitorConf } = newConf
      logger.debug(
        'ConfigService',
        `New settings - theme: ${newConf.ui.theme}, allyUI: ${newConf.ui.allyUI}, enemyUI: ${newConf.ui.enemyUI}`
      )
      logger.debug(
        'ConfigService',
        `Monitor settings - gamePath: ${newConf.arenaMonitor.gamePath}, autoMonitor: ${newConf.arenaMonitor.enableAutoMonitor}`
      )
      handleArenaConfigChange(oldArenaMonitorConf, newArenaMonitorConf)
      handleRecordConfigChange(oldConfig.record, newConf.record)

      setConfig(newConf)
      logger.info('ConfigService', 'App settings saved')
      notifySettingsChanged(newConf)
    }
  }
}
