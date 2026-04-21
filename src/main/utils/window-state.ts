/**
 * 主窗口状态管理
 *
 * 提供全局主窗口引用，供 IPC 发送、监控服务等模块使用。
 * @remarks 此模块应保持极简，仅存储/读取引用，不包含业务逻辑。
 */

import { BrowserWindow } from 'electron'

let globalMainWindow: BrowserWindow | null = null

/** 设置全局主窗口引用 */
export function setMainWindow(mainWindow: BrowserWindow | null): void {
  globalMainWindow = mainWindow
}

/** 获取全局主窗口引用 */
export function getMainWindow(): BrowserWindow | null {
  return globalMainWindow
}
