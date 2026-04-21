import type { ShipInfoDetail, ShipLanguageKey } from '@shared/types'

/**
 * 获取舰船显示名称
 *
 * 优先使用指定语言，回退到英文，最后是兜底文本。
 */
export function getShipName(shipInfo: ShipInfoDetail | undefined, language: ShipLanguageKey): string {
  if (!shipInfo) return 'Unknown Ship'
  return shipInfo.names[language] || shipInfo.names['en'] || 'Unknown Ship'
}
