export function getDayStart(offsetDays = 0): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays).getTime()
}

export function getTodayEnd(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1
}

export function getDayRange(offsetDays = 0): number[] {
  return [getDayStart(offsetDays), getTodayEnd()]
}
