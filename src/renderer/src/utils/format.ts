/**
 * 格式化工具函数
 *
 * 渲染进程共享的纯格式化函数，无副作用。
 */

/**
 * 将 ISO 日期字符串格式化为本地化显示格式
 */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 根据对局结果字符串返回 naive-ui 的 tag 类型
 */
export function getResultTagType(result?: string): 'success' | 'error' | 'default' {
  if (result === 'win') return 'success'
  if (result === 'loss') return 'error'
  return 'default'
}

/**
 * 根据对局结果字符串返回中文描述
 */
export function getResultText(result?: string): string {
  if (result === 'win') return '胜利'
  if (result === 'loss') return '失败'
  return result || '未知'
}

/**
 * 将数字格式化为千分位字符串（英文 locale）
 */
export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

/**
 * 将胜率小数格式化为百分比字符串
 */
export function formatWinRate(value: number): string {
  return `${Math.round(value)}%`
}
