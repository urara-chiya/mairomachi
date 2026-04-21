import { contextBridge, ipcRenderer } from 'electron'

import type { EmitChannel, EmitData, InvokeChannel, InvokeRequest, InvokeResponse, IpcApi } from '../shared/ipc-types'
import { EMIT_CHANNELS, INVOKE_CHANNELS } from '../shared/ipc'

// ------------------------------------------------------------------------------
// IPC 调用基础函数
// ------------------------------------------------------------------------------

/**
 * 调用主进程方法（Invoke/Handle 模式）
 *
 * @template T - Invoke channel 名称，自动从 channel 参数推导
 * @param channel - 通道名（来自 INVOKE_CHANNELS 常量）
 * @param args - 请求参数，类型由 InvokeChannels[T]['request'] 推导
 */
async function invoke<T extends InvokeChannel>(
  channel: T,
  ...args: InvokeRequest<T> extends void ? [] : [InvokeRequest<T>]
): Promise<InvokeResponse<T>> {
  try {
    return await ipcRenderer.invoke(channel, ...args)
  } catch (err) {
    if (err instanceof Error) {
      const prefix = `Error invoking remote method '${String(channel)}': `
      if (err.message.startsWith(prefix)) {
        let cleaned = err.message.slice(prefix.length)
        if (cleaned.startsWith('Error: ')) {
          cleaned = cleaned.slice('Error: '.length)
        }
        throw new Error(cleaned)
      }
    }
    throw err
  }
}

/**
 * 监听主进程事件（Send/On 模式）
 *
 * @template T - Emit channel 名称
 * @param channel - 通道名（来自 EMIT_CHANNELS 常量）
 * @param callback - 事件回调，参数类型由 EmitChannels[T]['data'] 推导
 * @returns 取消订阅函数
 */
function on<T extends EmitChannel>(channel: T, callback: (data: EmitData<T>) => void): () => void {
  const subscription = (_event: unknown, data: EmitData<T>): void => callback(data)
  ipcRenderer.on(channel, subscription)
  return (): void => {
    ipcRenderer.removeListener(channel, subscription)
  }
}

// ------------------------------------------------------------------------------
// 命名空间组织的 IPC API
//
// 实现代码不写任何显式类型标注，全部通过 `satisfies IpcApi` 由 TypeScript
// 反向推导。修改 InvokeChannels / EmitChannels 后，此处自动获得最新类型。
// ------------------------------------------------------------------------------

const ipc = {
  auth: {
    activate: (code) => invoke(INVOKE_CHANNELS.AUTH_ACTIVATE, code),
    login: () => invoke(INVOKE_CHANNELS.AUTH_LOGIN),
    check: () => invoke(INVOKE_CHANNELS.AUTH_CHECK),
    refresh: () => invoke(INVOKE_CHANNELS.AUTH_REFRESH),
    logout: () => invoke(INVOKE_CHANNELS.AUTH_LOGOUT),
    onExpired: (callback) => on(EMIT_CHANNELS.AUTH_EXPIRED, callback)
  },

  window: {
    minimize: () => invoke(INVOKE_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => invoke(INVOKE_CHANNELS.WINDOW_MAXIMIZE),
    close: () => invoke(INVOKE_CHANNELS.WINDOW_CLOSE)
  },

  settings: {
    load: () => invoke(INVOKE_CHANNELS.SETTINGS_LOAD),
    save: (config) => invoke(INVOKE_CHANNELS.SETTINGS_SAVE, config),
    reset: () => invoke(INVOKE_CHANNELS.SETTINGS_RESET),
    onChanged: (callback) => on(EMIT_CHANNELS.SETTINGS_CHANGED, callback)
  },

  explorer: {
    selectDirectory: () => invoke(INVOKE_CHANNELS.EXPLORER_SELECT_DIRECTORY),
    normalizeGamePath: (path) => invoke(INVOKE_CHANNELS.EXPLORER_NORMALIZE_GAME_PATH, path),
    openExternal: (url) => invoke(INVOKE_CHANNELS.EXPLORER_OPEN_EXTERNAL, url)
  },

  arena: {
    fetchInfo: (request) => invoke(INVOKE_CHANNELS.ARENA_FETCH_INFO, request),
    monitor: {
      start: () => invoke(INVOKE_CHANNELS.ARENA_MONITOR_START),
      stop: () => invoke(INVOKE_CHANNELS.ARENA_MONITOR_STOP)
    },
    getCache: () => invoke(INVOKE_CHANNELS.ARENA_GET_CACHE),
    clearCache: () => invoke(INVOKE_CHANNELS.ARENA_CLEAR_CACHE),
    checkNow: () => invoke(INVOKE_CHANNELS.ARENA_CHECK_NOW),
    onDetected: (callback) => on(EMIT_CHANNELS.ARENA_DETECTED, callback),
    onEnded: (callback) => on(EMIT_CHANNELS.ARENA_ENDED, callback),
    onRecordStatus: (callback) => on(EMIT_CHANNELS.ARENA_RECORD_STATUS, callback)
  },

  record: {
    parseLatest: (request) => invoke(INVOKE_CHANNELS.RECORD_PARSE_LATEST, request),
    list: () => invoke(INVOKE_CHANNELS.RECORD_LIST),
    delete: (id) => invoke(INVOKE_CHANNELS.RECORD_DELETE, id),
    getDetail: (request) => invoke(INVOKE_CHANNELS.RECORD_GET_DETAIL, request),
    getStats: (request) => invoke(INVOKE_CHANNELS.RECORD_GET_STATS, request),
    getBatchPr: (request) => invoke(INVOKE_CHANNELS.RECORD_GET_BATCH_PR, request),
    getClanInfo: (request) => invoke(INVOKE_CHANNELS.RECORD_GET_CLAN_INFO, request)
  },

  ship: {
    getByIds: (shipIds) => invoke(INVOKE_CHANNELS.SHIP_GET_BY_IDS, shipIds)
  },

  update: {
    check: () => invoke(INVOKE_CHANNELS.UPDATE_CHECK),
    download: () => invoke(INVOKE_CHANNELS.UPDATE_DOWNLOAD),
    onProgress: (callback) => on(EMIT_CHANNELS.UPDATE_PROGRESS, callback)
  },

  notify: {
    onToast: (callback) => on(EMIT_CHANNELS.NOTIFY_TOAST, callback)
  }
} satisfies IpcApi

// ------------------------------------------------------------------------------
// 暴露 API 到渲染进程
// ------------------------------------------------------------------------------

if (!process.contextIsolated) {
  throw new Error('Mairomachi requires contextIsolation to be enabled. Aborting.')
}

try {
  contextBridge.exposeInMainWorld('ipc', ipc)
} catch (error) {
  console.error('Failed to expose IPC API:', error)
}

export type { IpcApi }
