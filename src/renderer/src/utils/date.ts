/**
 * 游戏日分割偏移量：每天凌晨 4:00 为新的游戏日开始
 */
const DAY_RESET_OFFSET_MS = 4 * 60 * 60 * 1000

/**
 * 获取某天游戏日开始的 04:00:00 时间戳（0=今天，1=昨天，2=前天...）
 */
export function getDayStart(offsetDays = 0): number {
  const now = new Date()
  const adjusted = new Date(now.getTime() - DAY_RESET_OFFSET_MS)
  const start = new Date(adjusted.getFullYear(), adjusted.getMonth(), adjusted.getDate() - offsetDays)
  return start.getTime() + DAY_RESET_OFFSET_MS
}

/**
 * 获取今天游戏日结束的 03:59:59.999 时间戳
 */
export function getTodayEnd(): number {
  const now = new Date()
  const adjusted = new Date(now.getTime() - DAY_RESET_OFFSET_MS)
  const end = new Date(adjusted.getFullYear(), adjusted.getMonth(), adjusted.getDate() + 1)
  return end.getTime() + DAY_RESET_OFFSET_MS - 1
}

/**
 * 获取某天游戏日的完整时间范围 [start, end]
 */
export function getDayRange(offsetDays = 0): number[] {
  return [getDayStart(offsetDays), getTodayEnd()]
}

/**
 * 判断某个时间戳属于哪个游戏日，返回该游戏日 04:00 的时间戳
 */
export function getGameDayStart(timestamp: number): number {
  const dt = new Date(timestamp - DAY_RESET_OFFSET_MS)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime() + DAY_RESET_OFFSET_MS
}

/**
 * 将时间戳格式化为 MM-DD 的日期字符串
 */
export function formatShortDate(timestamp: number): string {
  const dt = new Date(timestamp)
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${m}-${d}`
}
