import { BrowserWindow, ipcMain, shell } from 'electron'
import { normalize, sep } from 'path'
import { resolveAndValidateGamePath } from './utils/replay-files'
import { EMIT_CHANNELS, INVOKE_CHANNELS } from '../shared/ipc'
import type { InvokeChannel, InvokeHandler } from '../shared/ipc-types'
import { isAllowedExternalUrl } from '../shared/security'
import { sendToast } from './utils/ipc-sender'
import { activate, isActivated, login, logout, refreshToken } from './service/auth-service'
import { createConfigService } from './service/config-service'
import monitor, { checkArenaNow, runMonitor, stopMonitor } from './service/arena-monitor-service'
import { selectDirPath } from './service/file-service'
import { fetchArenaInfo } from './service/arena-info-service'
import { clearArenaCache, getArenaCache } from './store'
import { getShipsInfo } from './service/ship-info-service'
import { checkUpdate, downloadUpdate, getIsDownloading } from './service/update-service'
import {
  fetchBatchPr,
  fetchClanInfo,
  fetchRecordDetail,
  fetchRecordStats,
  listRecords,
  parseAndSaveLatestReplay,
  removeRecord
} from './service/record-service'
import { logger } from './service/logger'

type UnknownInvokeHandler = (event: Electron.IpcMainInvokeEvent, data: unknown) => Promise<unknown>

const handlers = new Map<InvokeChannel, UnknownInvokeHandler>()
let mainWindowRef: BrowserWindow | null = null

function assertRealm(value: unknown): asserts value is 'NA' | 'EU' | 'ASIA' {
  if (!['NA', 'EU', 'ASIA'].includes(value as string)) {
    throw new Error(`Invalid realm: ${value}`)
  }
}

function assertIsArray(value: unknown, name: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`)
  }
}

function assertIsNumber(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${name} must be a number`)
  }
}

/**
 * 判断错误是否为认证异常
 *
 * 认证异常包含 `__needReactivate` 标记，触发后需向渲染进程推送
 * `auth:expired` 事件并引导重新激活。
 */
function isAuthError(error: unknown): error is { __needReactivate: boolean; __authMessage?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    '__needReactivate' in error &&
    (error as Record<string, unknown>).__needReactivate === true
  )
}

/**
 * 注册 Invoke Handler
 *
 * 自动包装 handler 以拦截认证异常，并向渲染进程推送 `auth:expired` 事件。
 * Handler 参数类型由 `InvokeHandler<T>` 从 `InvokeChannels` 自动推导，
 * 回调中无需显式标注参数类型。
 */
function registerHandler<T extends InvokeChannel>(channel: T, handler: InvokeHandler<T>): void {
  handlers.set(channel, handler as unknown as UnknownInvokeHandler)

  const wrapped = async (event: Electron.IpcMainInvokeEvent, data: unknown): Promise<unknown> => {
    try {
      return await (handler as unknown as UnknownInvokeHandler)(event, data)
    } catch (error: unknown) {
      if (isAuthError(error)) {
        const message = error.__authMessage || '登录状态已失效，请重新激活'
        logger.warn('IPC', `Auth error intercepted on channel ${channel}: ${message}`)
        if (mainWindowRef) {
          sendToast('error', message)
          mainWindowRef.webContents.send(EMIT_CHANNELS.AUTH_EXPIRED, {
            message
          })
        }
      }
      throw error
    }
  }

  ipcMain.handle(channel, wrapped)
}

// ------------------------------------------------------------------------------
// 注册所有 IPC Handlers
// ------------------------------------------------------------------------------

const configService = createConfigService({ monitor })

export function registerIPCHandlers(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow
  logger.info('IPC', 'Registering IPC handlers...')

  // Auth
  registerHandler(INVOKE_CHANNELS.AUTH_ACTIVATE, async (_, code) => {
    logger.info('Auth', `Activation request, code length: ${code?.length || 0}`)
    const result = await activate(code)
    logger.info('Auth', `Activation completed: ${result}`)
    return result
  })

  registerHandler(INVOKE_CHANNELS.AUTH_LOGIN, async () => {
    logger.info('Auth', 'Login request')
    const result = await login()
    logger.info('Auth', `Login completed: success=${result.success}, needReactivate=${result.needReactivate}`)
    return result
  })

  registerHandler(INVOKE_CHANNELS.AUTH_CHECK, () => {
    logger.debug('Auth', 'Checking activation status')
    return isActivated()
  })

  registerHandler(INVOKE_CHANNELS.AUTH_REFRESH, async () => {
    logger.info('Auth', 'Token refresh request')
    const result = await refreshToken()
    logger.info('Auth', `Token refresh completed: ${result}`)
    return result
  })

  registerHandler(INVOKE_CHANNELS.AUTH_LOGOUT, () => {
    logger.info('Auth', 'Logout request')
    logout()
  })

  // Window
  registerHandler(INVOKE_CHANNELS.WINDOW_MINIMIZE, () => {
    logger.debug('Window', 'Minimize')
    mainWindow.minimize()
  })

  registerHandler(INVOKE_CHANNELS.WINDOW_MAXIMIZE, () => {
    const isMaximized = mainWindow.isMaximized()
    logger.debug('Window', isMaximized ? 'Restore' : 'Maximize')
    if (isMaximized) {
      mainWindow.unmaximize()
      return false
    } else {
      mainWindow.maximize()
      return true
    }
  })

  registerHandler(INVOKE_CHANNELS.WINDOW_CLOSE, () => {
    logger.info('Window', 'Close requested')
    mainWindow.close()
  })

  // Settings
  registerHandler(INVOKE_CHANNELS.SETTINGS_LOAD, () => {
    logger.debug('Settings', 'Loading')
    return configService.getAppConfig()
  })

  /**
   * 保存应用配置
   * @param config - 应用配置对象，包含 ui、arenaMonitor、record 等字段
   * @throws 配置字段校验失败时抛出错误
   */
  registerHandler(INVOKE_CHANNELS.SETTINGS_SAVE, (_, config) => {
    logger.info('Settings', 'Saving')
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object')
    }
    const validThemes = ['light', 'dark']
    const validUis = ['ltr', 'rtl']
    const validLanguages = ['zh-cn', 'zh-tw', 'en', 'ja']
    const validRealms = ['NA', 'EU', 'ASIA']
    if (config.ui) {
      if (!validThemes.includes(config.ui.theme)) {
        throw new Error(`Invalid theme: ${config.ui.theme}`)
      }
      if (!validUis.includes(config.ui.allyUI)) {
        throw new Error(`Invalid allyUI: ${config.ui.allyUI}`)
      }
      if (!validUis.includes(config.ui.enemyUI)) {
        throw new Error(`Invalid enemyUI: ${config.ui.enemyUI}`)
      }
      if (!validLanguages.includes(config.ui.shipNameLanguage)) {
        throw new Error(`Invalid shipNameLanguage: ${config.ui.shipNameLanguage}`)
      }
    }
    if (config.arenaMonitor) {
      if (config.arenaMonitor.realm && !validRealms.includes(config.arenaMonitor.realm)) {
        throw new Error(`Invalid realm: ${config.arenaMonitor.realm}`)
      }
      // 如果配置了游戏路径，校验路径有效性
      if (config.arenaMonitor.gamePath && config.arenaMonitor.gamePath.length > 0) {
        try {
          resolveAndValidateGamePath(config.arenaMonitor.gamePath)
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          logger.warn('Settings', `Game path validation failed: ${reason}`)
          throw new Error(`游戏路径校验失败：${reason}`)
        }
      }
    }
    if (config.record) {
      assertIsNumber(config.record.cacheDays, 'cacheDays')
      if (config.record.cacheDays < 1 || config.record.cacheDays > 365) {
        throw new Error('cacheDays must be between 1 and 365')
      }
    }
    configService.saveAppConfig(config)
  })

  registerHandler(INVOKE_CHANNELS.SETTINGS_RESET, () => {
    logger.info('Settings', 'Resetting to defaults')
    configService.resetAppConfig()
  })

  // Explorer
  registerHandler(INVOKE_CHANNELS.EXPLORER_SELECT_DIRECTORY, async () => {
    logger.info('Explorer', 'Select directory dialog')
    const result = await selectDirPath()
    logger.info('Explorer', `Selected: ${result || 'none'}`)
    return result
  })

  registerHandler(INVOKE_CHANNELS.EXPLORER_NORMALIZE_GAME_PATH, (_, path) => {
    const normalized = normalize(path)
    const replaysIndex = normalized.toLowerCase().indexOf(`${sep}replays`)
    if (replaysIndex !== -1) {
      return normalized.substring(0, replaysIndex)
    }
    return normalized
  })

  registerHandler(INVOKE_CHANNELS.EXPLORER_OPEN_EXTERNAL, (_, url) => {
    if (!isAllowedExternalUrl(url)) {
      logger.warn('IPC', `Blocked openExternal request: ${url}`)
      throw new Error('URL not in whitelist')
    }
    logger.debug('IPC', `Opening external link via IPC: ${url}`)
    shell.openExternal(url).then()
  })

  // Arena
  /**
   * 获取对局信息
   * @param request - 请求参数，包含 realm（服务器区域）和玩家列表
   * @returns 对局信息响应，包含敌我双方玩家统计
   * @throws realm 非法时抛出错误
   */
  registerHandler(INVOKE_CHANNELS.ARENA_FETCH_INFO, async (_, request) => {
    logger.info('Arena', 'Fetch info request')
    assertRealm(request.realm)
    return await fetchArenaInfo(request)
  })

  registerHandler(INVOKE_CHANNELS.ARENA_MONITOR_START, () => {
    logger.info('Arena', 'Monitor start')
    runMonitor(mainWindow)
  })

  registerHandler(INVOKE_CHANNELS.ARENA_MONITOR_STOP, () => {
    logger.info('Arena', 'Monitor stop')
    stopMonitor()
  })

  registerHandler(INVOKE_CHANNELS.ARENA_GET_CACHE, () => {
    logger.debug('Arena', 'Get arena cache request')
    const cached = getArenaCache()
    return cached?.response ?? null
  })

  registerHandler(INVOKE_CHANNELS.ARENA_CLEAR_CACHE, () => {
    logger.info('Arena', 'Clear arena cache request')
    clearArenaCache()
  })

  registerHandler(INVOKE_CHANNELS.ARENA_CHECK_NOW, () => {
    logger.info('Arena', 'Check now request')
    return checkArenaNow()
  })

  // Record
  /**
   * 解析并保存最新的 replay 文件
   * @param request - 请求参数，包含 realm（服务器区域）
   * @returns 解析后的战斗记录，或 null（无可用 replay）
   * @throws realm 非法时抛出错误
   */
  registerHandler(INVOKE_CHANNELS.RECORD_PARSE_LATEST, async (_, request) => {
    logger.info('Record', 'Parse latest replay request')
    assertRealm(request.realm)
    return await parseAndSaveLatestReplay(request.realm)
  })

  registerHandler(INVOKE_CHANNELS.RECORD_LIST, () => {
    logger.info('Record', 'List battle records')
    return listRecords()
  })

  registerHandler(INVOKE_CHANNELS.RECORD_DELETE, (_, id) => {
    logger.info('Record', `Delete battle record: ${id}`)
    removeRecord(id)
  })

  /**
   * 获取记录详情（补充玩家 PR、伤害等级等统计）
   * @param request - 请求参数，包含 matchResult 和 players
   * @returns  enrich 后的玩家详情列表
   */
  registerHandler(INVOKE_CHANNELS.RECORD_GET_DETAIL, async (_, request) => {
    logger.info('Record', 'Fetching record detail')
    return await fetchRecordDetail(request)
  })

  /**
   * 计算战绩统计（胜率、场均伤害、PR 等）
   * @param request - 请求参数，包含 shipId、damage、frags、wins 数组
   * @returns 统计结果对象
   */
  registerHandler(INVOKE_CHANNELS.RECORD_GET_STATS, async (_, request) => {
    logger.info('Record', 'Fetching record stats')
    return await fetchRecordStats(request)
  })

  /**
   * 批量计算记录 PR 与颜色等级
   * @param request - 请求参数，包含 shipId、damage、frags、wins、rawExp 数组
   * @returns 每条记录对应的 PR、伤害等级、击杀等级、经验等级
   */
  registerHandler(INVOKE_CHANNELS.RECORD_GET_BATCH_PR, async (_, request) => {
    logger.info('Record', 'Fetching batch pr')
    return await fetchBatchPr(request)
  })

  /**
   * 批量获取玩家公会信息
   * @param request - 请求参数，包含 accountIds（账号 ID 数组）和 realm
   * @returns 公会信息列表
   * @throws realm 非法或 accountIds 不是数组时抛出错误
   */
  registerHandler(INVOKE_CHANNELS.RECORD_GET_CLAN_INFO, async (_, request) => {
    assertRealm(request.realm)
    assertIsArray(request.accountIds, 'accountIds')
    logger.info('Record', `Fetching clan info for ${request.accountIds.length} players`)
    return await fetchClanInfo(request)
  })

  // Ship
  registerHandler(INVOKE_CHANNELS.SHIP_GET_BY_IDS, (_, shipIds) => {
    assertIsArray(shipIds, 'shipIds')
    logger.info('Ship', `Getting ships info: ${shipIds.length} ids`)
    return getShipsInfo(shipIds)
  })

  // Update
  /**
   * 检查应用更新
   * @returns 更新检查结果，包含 hasUpdate、latestVersion、currentVersion、hash
   */
  registerHandler(INVOKE_CHANNELS.UPDATE_CHECK, async () => {
    logger.info('Update', 'Check update request')
    return await checkUpdate()
  })

  /**
   * 下载并安装最新版本
   * @returns 下载的安装包路径
   * @throws 下载中重复调用、或哈希校验失败时抛出错误
   */
  registerHandler(INVOKE_CHANNELS.UPDATE_DOWNLOAD, async () => {
    if (getIsDownloading()) {
      logger.warn('Update', 'Download already in progress')
      throw new Error('正在下载更新中，请勿重复操作')
    }
    logger.info('Update', 'Download update request')
    return await downloadUpdate((transferred, total) => {
      const percent = total > 0 ? Math.round((transferred / total) * 100) : 0
      mainWindow.webContents.send(EMIT_CHANNELS.UPDATE_PROGRESS, {
        percent,
        transferred,
        total
      })
    })
  })

  logger.info('IPC', `Registered ${handlers.size} handlers`)
}

export default registerIPCHandlers
