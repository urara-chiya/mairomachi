/**
 * 共享类型聚合出口
 *
 * 所有主进程与渲染进程共享的数据类型统一从此导入。
 * 渲染进程禁止直接引用 `main/type/*`。
 */
export * from '../main/type'

/** Toast 通知数据结构 */
export interface ToastInfo {
  type: 'info' | 'success' | 'warning' | 'error' | 'loading'
  content: string
}
