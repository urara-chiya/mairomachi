/**
 * IPC 核心模块
 *
 * 提供统一的 IPC 通信工具，包括类型安全的调用和事件处理。
 */

import type { EmitChannel, EmitData, InvokeChannel, InvokeHandler, InvokeRequest, InvokeResponse } from './ipc-types'

// ------------------------------------------------------------------------------
// Renderer Process API（用于 Preload Script）
// ------------------------------------------------------------------------------

export interface RendererIPC {
  /**
   * 调用主进程方法（Invoke/Handle 模式）
   * @template T - Invoke channel 名称
   */
  invoke<T extends InvokeChannel>(
    channel: T,
    ...args: InvokeRequest<T> extends void ? [] : [InvokeRequest<T>]
  ): Promise<InvokeResponse<T>>

  /**
   * 监听主进程事件（Send/On 模式）
   * @returns 取消订阅函数
   */
  on<T extends EmitChannel>(channel: T, callback: (data: EmitData<T>) => void): () => void

  /**
   * 一次性监听主进程事件
   */
  once<T extends EmitChannel>(channel: T, callback: (data: EmitData<T>) => void): void
}

// ------------------------------------------------------------------------------
// Main Process API（用于主进程 IPC Handlers 注册）
// ------------------------------------------------------------------------------

export interface MainIPC {
  /** 注册 Invoke Handler */
  handle<T extends InvokeChannel>(channel: T, handler: InvokeHandler<T>): void

  /** 移除 Invoke Handler */
  removeHandler<T extends InvokeChannel>(channel: T): void

  /** 向渲染进程发送事件 */
  emit<T extends EmitChannel>(webContents: Electron.WebContents, channel: T, data: EmitData<T>): void

  /** 向所有渲染进程广播事件 */
  broadcast<T extends EmitChannel>(windows: Electron.BrowserWindow[], channel: T, data: EmitData<T>): void
}

// ------------------------------------------------------------------------------
// Channel 常量定义
// ------------------------------------------------------------------------------

export const INVOKE_CHANNELS = {
  // Auth
  AUTH_ACTIVATE: 'auth:activate' as const,
  AUTH_LOGIN: 'auth:login' as const,
  AUTH_CHECK: 'auth:check' as const,
  AUTH_REFRESH: 'auth:refresh' as const,
  AUTH_LOGOUT: 'auth:logout' as const,

  // Window
  WINDOW_MINIMIZE: 'window:minimize' as const,
  WINDOW_MAXIMIZE: 'window:maximize' as const,
  WINDOW_CLOSE: 'window:close' as const,

  // Settings
  SETTINGS_LOAD: 'settings:load' as const,
  SETTINGS_SAVE: 'settings:save' as const,
  SETTINGS_RESET: 'settings:reset' as const,

  // Explorer
  EXPLORER_SELECT_DIRECTORY: 'explorer:selectDirectory' as const,
  EXPLORER_NORMALIZE_GAME_PATH: 'explorer:normalizeGamePath' as const,
  EXPLORER_OPEN_EXTERNAL: 'explorer:openExternal' as const,

  // Arena
  ARENA_FETCH_INFO: 'arena:fetchInfo' as const,
  ARENA_MONITOR_START: 'arena:monitor:start' as const,
  ARENA_MONITOR_STOP: 'arena:monitor:stop' as const,
  ARENA_GET_CACHE: 'arena:getCache' as const,
  ARENA_CLEAR_CACHE: 'arena:clearCache' as const,
  ARENA_CHECK_NOW: 'arena:checkNow' as const,

  // Record
  RECORD_PARSE_LATEST: 'record:parseLatest' as const,
  RECORD_LIST: 'record:list' as const,
  RECORD_DELETE: 'record:delete' as const,
  RECORD_GET_DETAIL: 'record:getDetail' as const,
  RECORD_GET_STATS: 'record:getStats' as const,
  RECORD_GET_BATCH_PR: 'record:getBatchPr' as const,
  RECORD_GET_CLAN_INFO: 'record:getClanInfo' as const,

  // Ship
  SHIP_GET_BY_IDS: 'ship:getByIds' as const,

  // Update
  UPDATE_CHECK: 'update:check' as const,
  UPDATE_DOWNLOAD: 'update:download' as const
} satisfies Record<string, InvokeChannel>

export const EMIT_CHANNELS = {
  // Notify
  NOTIFY_TOAST: 'notify:toast' as const,

  // Auth
  AUTH_EXPIRED: 'auth:expired' as const,

  // Arena
  ARENA_DETECTED: 'arena:detected' as const,
  ARENA_ENDED: 'arena:ended' as const,
  ARENA_RECORD_STATUS: 'arena:recordStatus' as const,

  // Settings
  SETTINGS_CHANGED: 'settings:changed' as const,

  // Update
  UPDATE_PROGRESS: 'update:progress' as const
} satisfies Record<string, EmitChannel>

// ------------------------------------------------------------------------------
// 类型守卫
// ------------------------------------------------------------------------------

/** 检查是否为有效的 Invoke Channel */
export function isInvokeChannel(channel: string): channel is InvokeChannel {
  return Object.values(INVOKE_CHANNELS).includes(channel as InvokeChannel)
}

/** 检查是否为有效的 Emit Channel */
export function isEmitChannel(channel: string): channel is EmitChannel {
  return Object.values(EMIT_CHANNELS).includes(channel as EmitChannel)
}
