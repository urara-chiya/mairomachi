/**
 * 战绩记录 Store
 *
 * 持久化本地解析的战斗记录（BattleRecord），支持过期清理。
 */

import ElectronStore from 'electron-store'
import { BattleRecord } from '../type'
import { logger } from '../service/logger'

interface RecordStoreSchema {
  records: BattleRecord[]
}

const store = new ElectronStore<RecordStoreSchema>({
  name: 'record-store',
  defaults: {
    records: []
  }
})

logger.info('RecordStore', 'Record store initialized')

/** 获取所有战绩记录 */
export function getRecords(): BattleRecord[] {
  return store.get('records')
}

/** 保存一条战绩记录（插入到列表头部） */
export function saveRecord(record: BattleRecord): void {
  const records = getRecords()
  records.unshift(record)
  store.set('records', records)
  logger.info('RecordStore', `Saved battle record, total: ${records.length}`)
}

/** 删除指定 ID 的战绩记录 */
export function deleteRecord(id: string): void {
  const records = getRecords().filter((r) => r.id !== id)
  store.set('records', records)
  logger.info('RecordStore', `Deleted battle record ${id}, total: ${records.length}`)
}

/** 检查是否已存在指定 replayPath 的记录 */
export function hasRecordByReplayPath(replayPath: string): boolean {
  return getRecords().some((r) => r.replayPath === replayPath)
}

/**
 * 清理过期战绩记录
 * @param cacheDays - 保留天数
 */
export function clearExpiredRecords(cacheDays: number): void {
  const now = Date.now()
  const expireTime = cacheDays * 24 * 60 * 60 * 1000
  const records = getRecords().filter((r) => {
    const recordTime = new Date(r.dateTime).getTime()
    return now - recordTime < expireTime
  })
  store.set('records', records)
  logger.info('RecordStore', `Cleared expired records, total: ${records.length}`)
}
