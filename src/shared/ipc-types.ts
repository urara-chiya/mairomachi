import {
  AppConfig,
  AppConfigs,
  ArenaInfoRequest,
  ArenaInfoResponse,
  BattleRecord,
  CheckUpdateResult,
  FileArenaInfo,
  LoginResult,
  Realm,
  RecordBatchPrResponse,
  RecordClanInfoResponse,
  RecordDetailPlayerResponse,
  RecordEnrichBattleRequest,
  RecordEnrichBattleResponse,
  RecordStatsResponse,
  ShipInfoDetail,
  ToastInfo,
  UpdateProgressInfo
} from './types'

/**
 * IPC Channel 命名规范
 *
 * 格式：`domain:action` 或 `domain:subdomain:action`
 * 示例：`auth:login`、`window:minimize`、`arena:monitor:start`
 *
 * Domain 列表：
 * - auth     认证相关
 * - window   窗口控制
 * - settings 应用设置
 * - explorer 文件浏览
 * - arena    对局信息
 * - record   对局记录
 * - ship     舰船信息
 * - update   应用更新
 * - notify   通知推送
 */

// ------------------------------------------------------------------------------
// Renderer -> Main Invoke Channels（请求-响应模式）
// ------------------------------------------------------------------------------

/**
 * Invoke channel 映射表
 *
 * 每个 channel 定义 `request`（渲染进程传入参数）与 `response`（主进程返回值）类型。
 * 这是 IPC 类型体系的唯一人工维护点，所有上层类型（`InvokeFn`、`IpcApi` 等）均从此推导。
 */
export interface InvokeChannels {
  // Auth
  'auth:activate': {
    request: string
    response: boolean
  }
  'auth:login': {
    request: void
    response: LoginResult
  }
  'auth:check': {
    request: void
    response: boolean
  }
  'auth:refresh': {
    request: void
    response: boolean
  }
  'auth:logout': {
    request: void
    response: void
  }

  // Window
  'window:minimize': {
    request: void
    response: void
  }
  'window:maximize': {
    request: void
    response: boolean
  }
  'window:close': {
    request: void
    response: void
  }

  // Settings
  'settings:load': {
    request: void
    response: AppConfigs['app']
  }
  'settings:save': {
    request: AppConfigs['app']
    response: void
  }
  'settings:reset': {
    request: void
    response: void
  }

  // Explorer
  'explorer:selectDirectory': {
    request: void
    response: string
  }
  'explorer:selectReplayFile': {
    request: void
    response: string
  }
  'explorer:normalizeGamePath': {
    request: string
    response: string
  }
  'explorer:openExternal': {
    request: string
    response: void
  }

  // Arena
  'arena:fetchInfo': {
    request: ArenaInfoRequest
    response: ArenaInfoResponse | null
  }
  'arena:monitor:start': {
    request: void
    response: void
  }
  'arena:monitor:stop': {
    request: void
    response: void
  }
  'arena:getCache': {
    request: void
    response: ArenaInfoResponse | null
  }
  'arena:clearCache': {
    request: void
    response: void
  }
  'arena:checkNow': {
    request: void
    response: FileArenaInfo | null
  }

  // Ship
  'ship:getByIds': {
    request: number[]
    response: Record<string, ShipInfoDetail>
  }

  // Record
  'record:parseLatest': {
    request: { realm: Realm }
    response: BattleRecord | null
  }
  'record:list': {
    request: void
    response: BattleRecord[]
  }
  'record:delete': {
    request: string
    response: void
  }
  'record:getDetail': {
    request: {
      matchResult: BattleRecord['matchResult']
      players: BattleRecord['players']
    }
    response: RecordDetailPlayerResponse[]
  }
  'record:getStats': {
    request: { shipId: number; damage: number; frags: number; wins: number }[]
    response: RecordStatsResponse
  }
  'record:getBatchPr': {
    request: {
      shipId: number
      damage: number
      frags: number
      wins: number
      rawExp: number
    }[]
    response: RecordBatchPrResponse[]
  }
  'record:getClanInfo': {
    request: { accountIds: number[]; realm: Realm }
    response: RecordClanInfoResponse[]
  }
  'record:enrichBattle': {
    request: RecordEnrichBattleRequest
    response: RecordEnrichBattleResponse
  }
  'record:parseFile': {
    request: { filePath: string; realm: Realm }
    response: BattleRecord | null
  }

  // Update
  'update:check': {
    request: void
    response: CheckUpdateResult
  }
  'update:download': {
    request: void
    response: string
  }
}

// ------------------------------------------------------------------------------
// Main -> Renderer Emit Channels（推送模式）
// ------------------------------------------------------------------------------

/**
 * Emit channel 映射表
 *
 * 每个 channel 定义 `data`（主进程推送给渲染进程的数据）类型。
 * `data: void` 表示该事件不携带额外数据，仅作为信号使用。
 */
export interface EmitChannels {
  // Notify
  'notify:toast': {
    data: ToastInfo
  }

  // Auth
  'auth:expired': {
    data: { message: string }
  }

  // Arena
  'arena:detected': {
    data: FileArenaInfo
  }
  'arena:ended': {
    data: void
  }
  'arena:recordStatus': {
    data: { status: 'idle' | 'recording' | 'processing' | 'saved' | 'disabled' }
  }

  // Settings
  'settings:changed': {
    data: AppConfig
  }

  // Update
  'update:progress': {
    data: UpdateProgressInfo
  }
}

// ------------------------------------------------------------------------------
// 类型辅助工具
// ------------------------------------------------------------------------------

export type InvokeChannel = keyof InvokeChannels
export type EmitChannel = keyof EmitChannels

export type InvokeRequest<T extends InvokeChannel> = InvokeChannels[T]['request']
export type InvokeResponse<T extends InvokeChannel> = InvokeChannels[T]['response']
export type EmitData<T extends EmitChannel> = EmitChannels[T]['data']

/** Handler 类型定义（用于主进程注册回调） */
export type InvokeHandler<T extends InvokeChannel> = (
  event: Electron.IpcMainInvokeEvent,
  data: InvokeRequest<T>
) => Promise<InvokeResponse<T>> | InvokeResponse<T>

// ------------------------------------------------------------------------------
// 从 Channel Maps 推导 API 方法签名
// ------------------------------------------------------------------------------

/**
 * 从 InvokeChannels 推导单个调用方法的签名
 *
 * @example
 * // 当 request 为 void 时推导为无参函数
 * InvokeFn<'auth:check'> → () => Promise<boolean>
 *
 * // 当 request 有具体类型时推导为单参函数
 * InvokeFn<'auth:activate'> → (req: string) => Promise<boolean>
 */
export type InvokeFn<K extends InvokeChannel> = InvokeChannels[K]['request'] extends void
  ? () => Promise<InvokeChannels[K]['response']>
  : (req: InvokeChannels[K]['request']) => Promise<InvokeChannels[K]['response']>

/**
 * 从 EmitChannels 推导单个事件监听方法的签名
 *
 * @example
 * // 当 data 为 void 时推导为无参回调
 * EmitFn<'arena:ended'> → (callback: () => void) => () => void
 *
 * // 当 data 有具体类型时推导为带参回调
 * EmitFn<'notify:toast'> → (callback: (data: ToastInfo) => void) => () => void
 */
export type EmitFn<K extends EmitChannel> = EmitChannels[K]['data'] extends void
  ? (callback: () => void) => () => void
  : (callback: (data: EmitChannels[K]['data']) => void) => () => void

// ------------------------------------------------------------------------------
// Domain API 接口（结构手写，签名从 Channel Maps 推导）
// ------------------------------------------------------------------------------

export interface IPCAuthAPI {
  activate: InvokeFn<'auth:activate'>
  login: InvokeFn<'auth:login'>
  check: InvokeFn<'auth:check'>
  refresh: InvokeFn<'auth:refresh'>
  logout: InvokeFn<'auth:logout'>
  onExpired: EmitFn<'auth:expired'>
}

export interface IPCWindowAPI {
  minimize: InvokeFn<'window:minimize'>
  maximize: InvokeFn<'window:maximize'>
  close: InvokeFn<'window:close'>
}

export interface IPCSettingsAPI {
  load: InvokeFn<'settings:load'>
  save: InvokeFn<'settings:save'>
  reset: InvokeFn<'settings:reset'>
  onChanged: EmitFn<'settings:changed'>
}

export interface IPCExplorerAPI {
  selectDirectory: InvokeFn<'explorer:selectDirectory'>
  selectReplayFile: InvokeFn<'explorer:selectReplayFile'>
  normalizeGamePath: InvokeFn<'explorer:normalizeGamePath'>
  openExternal: InvokeFn<'explorer:openExternal'>
}

export interface IPCArenaAPI {
  fetchInfo: InvokeFn<'arena:fetchInfo'>
  monitor: {
    start: InvokeFn<'arena:monitor:start'>
    stop: InvokeFn<'arena:monitor:stop'>
  }
  getCache: InvokeFn<'arena:getCache'>
  clearCache: InvokeFn<'arena:clearCache'>
  checkNow: InvokeFn<'arena:checkNow'>
}

export interface IPCShipAPI {
  getByIds: InvokeFn<'ship:getByIds'>
}

export interface IPCRecordAPI {
  parseLatest: InvokeFn<'record:parseLatest'>
  list: InvokeFn<'record:list'>
  delete: InvokeFn<'record:delete'>
  getDetail: InvokeFn<'record:getDetail'>
  getStats: InvokeFn<'record:getStats'>
  getBatchPr: InvokeFn<'record:getBatchPr'>
  getClanInfo: InvokeFn<'record:getClanInfo'>
  enrichBattle: InvokeFn<'record:enrichBattle'>
  parseFile: InvokeFn<'record:parseFile'>
}

export interface IPCUpdateAPI {
  check: InvokeFn<'update:check'>
  download: InvokeFn<'update:download'>
  onProgress: EmitFn<'update:progress'>
}

export interface IPCNotifyAPI {
  onToast: EmitFn<'notify:toast'>
}

export interface IPCArenaEventsAPI {
  onDetected: EmitFn<'arena:detected'>
  onEnded: EmitFn<'arena:ended'>
  onRecordStatus: EmitFn<'arena:recordStatus'>
}

/** 完整的 IPC API 聚合接口（用于 Preload 暴露到渲染进程） */
export interface IpcApi {
  auth: IPCAuthAPI
  window: IPCWindowAPI
  settings: IPCSettingsAPI
  explorer: IPCExplorerAPI
  arena: IPCArenaAPI & IPCArenaEventsAPI
  ship: IPCShipAPI
  record: IPCRecordAPI
  update: IPCUpdateAPI
  notify: IPCNotifyAPI
}
