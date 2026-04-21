import type { BattleRecord } from '@shared/types'

/**
 * 从对局记录中获取当前玩家（Self）的信息
 */
export function getSelfPlayer(record: BattleRecord): BattleRecord['players'][number] | undefined {
  return record.self ?? record.players.find((p) => p.relation === 'Self')
}
