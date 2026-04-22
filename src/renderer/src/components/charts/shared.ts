import type { PlayerWithShipInfo } from '@shared/types'

export const isHiddenStats = (p: PlayerWithShipInfo): boolean => !p.total
export const isZeroShipBattles = (p: PlayerWithShipInfo): boolean => !p.ship || p.ship.battles.value === 0
export const avg = (arr: number[]): number => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)

export const COMMON_COLORS = ['#18a058', '#d03050']

export const TOOLTIP_DARK = {
  backgroundColor: 'rgba(30,30,30,0.95)',
  borderColor: '#444',
  textStyle: { color: '#eee' } as const
}

export const LEGEND_BOTTOM = {
  data: ['我方', '敌方'],
  bottom: 0,
  textStyle: { color: '#ccc' } as const
}
