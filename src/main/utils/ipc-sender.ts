/**
 * IPC 发送工具
 *
 * 封装向渲染进程发送事件的通用逻辑，统一处理主窗口可用性检查。
 */

import { EmitChannel, EmitData } from '../../shared/ipc-types'
import { getMainWindow } from './window-state'
import { logger } from '../service/logger'

/**
 * 向渲染进程发送事件
 * @template T - Emit channel 名称
 * @param channel - 通道常量
 * @param data - 事件数据
 */
export function sendToRenderer<T extends EmitChannel>(channel: T, data: EmitData<T>): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  } else {
    logger.warn('IPCSender', `Main window not available, dropping event: ${channel}`)
  }
}

/**
 * 发送 Toast 通知
 */
export function sendToast(type: EmitData<'notify:toast'>['type'], content: string): void {
  sendToRenderer('notify:toast', { type, content })
}

/**
 * 通知检测到新对局
 */
export function notifyArenaDetected(data: EmitData<'arena:detected'>): void {
  sendToRenderer('arena:detected', data)
}

/**
 * 通知对局已结束
 */
export function notifyArenaEnded(): void {
  sendToRenderer('arena:ended', undefined as EmitData<'arena:ended'>)
}

/**
 * 通知对局记录状态变更
 */
export function notifyArenaRecordStatus(status: EmitData<'arena:recordStatus'>['status']): void {
  sendToRenderer('arena:recordStatus', { status })
}

/**
 * 通知设置已变更
 */
export function notifySettingsChanged(data: EmitData<'settings:changed'>): void {
  sendToRenderer('settings:changed', data)
}
