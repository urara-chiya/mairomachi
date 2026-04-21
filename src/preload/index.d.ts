/**
 * Preload 脚本类型声明
 *
 * 为渲染进程提供 `window.ipc` 的全局类型声明。
 */

import { IpcApi } from './index'

declare global {
  interface Window {
    /** 应用自定义 IPC API */
    ipc: IpcApi
  }
}

export {}
