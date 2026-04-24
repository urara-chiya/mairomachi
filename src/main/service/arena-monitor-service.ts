import chokidar, { FSWatcher } from 'chokidar'
import path from 'node:path'
import fs from 'node:fs'
import { BrowserWindow } from 'electron'
import { BattleRecord, FileArenaInfo } from '../type'
import { getArenaMonitorConfig, getRecordConfig, saveRecord } from '../store'
import { parseReplayFile } from './replay-service'
import { enrichBattleRecord } from './record-service'
import { notifyArenaDetected, notifyArenaEnded, notifyArenaRecordStatus, sendToast } from '../utils/ipc-sender'
import { setMainWindow } from '../utils/window-state'
import { resolveAndValidateGamePath, scanReplayFiles } from '../utils/replay-files'
import { logger } from './logger'

/** 对局监控器抽象接口（用于解耦 ConfigService） */
export interface ArenaMonitorController {
  startWatch(gamePath: string): boolean
  stopWatch(): void
}

/** 简单的 LRU Set，超过容量时自动淘汰最旧的条目 */
class LRUSet<T> {
  private cache = new Map<T, boolean>()

  constructor(private readonly maxSize: number) {}

  has(key: T): boolean {
    return this.cache.has(key)
  }

  add(key: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    this.cache.set(key, true)
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value as T
      this.cache.delete(firstKey)
    }
  }

  delete(key: T): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

export class ArenaMonitor implements ArenaMonitorController {
  private watcher: FSWatcher | null = null
  private lastArenaContent: string | null = null
  private changeDebounceTimer: NodeJS.Timeout | null = null
  private delayedScanTimer: NodeJS.Timeout | null = null

  /** 已解析过的 replay 文件路径，防止重复解析（最多保留最近 50 条） */
  private parsedReplayPaths = new LRUSet<string>(50)
  /** 正在处理中的 replay 文件路径，防止异步并发导致重复解析 */
  private processingPaths = new Set<string>()
  /** 监控器就绪时间戳，只处理在此时间之后修改的 replay */
  private watchReadyTime = 0

  private readonly TEMP_ARENA_INFO_FILENAME: string = 'tempArenaInfo.json'
  private readonly TEMP_REPLAY_FILENAME: string = 'temp.wowsreplay'

  startWatch(gamePath: string): boolean {
    logger.info('ArenaMonitor', `Starting arena monitor, game path: ${gamePath}`)
    if (gamePath.length <= 0) {
      logger.warn('ArenaMonitor', 'Failed to start monitor: game path is empty')
      sendToast('warning', '游戏路径为空，无法启动对局监控')
      return false
    }

    let validatedPath: string
    try {
      validatedPath = resolveAndValidateGamePath(gamePath)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      logger.warn('ArenaMonitor', `Game path validation failed: ${reason}`)
      sendToast('warning', `对局监控启动失败：${reason}，请重新设置游戏路径`)
      return false
    }

    if (this.watcher) {
      logger.debug('ArenaMonitor', 'Existing watcher detected, stopping old watcher')
      this.stopWatch()
    }

    const recordConfig = getRecordConfig()
    notifyArenaRecordStatus(recordConfig.enableAutoRecord ? 'idle' : 'disabled')

    const replayDir = path.resolve(validatedPath, 'replays')
    logger.info('ArenaMonitor', `Watching directory: ${replayDir}`)
    const watcher = chokidar.watch(replayDir, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      depth: 3,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      },
      interval: 1000,
      binaryInterval: 1000
    })
    logger.debug('ArenaMonitor', 'Chokidar watcher configured')

    let isReady = false
    watcher
      .on('add', (filePath) => {
        const basename = path.basename(filePath)
        if (basename === this.TEMP_ARENA_INFO_FILENAME) {
          logger.info('ArenaMonitor', `New arena detected: ${path.dirname(filePath)}`)
          this.handleNewArena(filePath)
          return
        }
        if (basename.endsWith('.wowsreplay') && basename !== this.TEMP_REPLAY_FILENAME) {
          if (!isReady) return
          logger.info('ArenaMonitor', `New replay file detected: ${filePath}`)
          this.handleNewReplay(filePath).then()
        }
      })
      .on('change', (filePath) => {
        const basename = path.basename(filePath)
        if (basename.endsWith('.wowsreplay') && basename !== this.TEMP_REPLAY_FILENAME) {
          if (!isReady) return
          logger.info('ArenaMonitor', `Replay file changed: ${filePath}`)
          this.parsedReplayPaths.delete(filePath)
          this.handleNewReplay(filePath).then()
        }
      })
      .on('ready', () => {
        isReady = true
        this.watchReadyTime = Date.now()
        logger.info('ArenaMonitor', 'Watcher ready, initial scan complete, readyTime=' + this.watchReadyTime)
      })
      .on('unlink', (filePath) => {
        if (path.basename(filePath) === this.TEMP_ARENA_INFO_FILENAME) {
          logger.info('ArenaMonitor', `Arena ended, file removed: ${path.dirname(filePath)}`)
          this.handleArenaEnded()
          this.scheduleDelayedScan(replayDir)
        }
      })
      .on('error', (error) => {
        logger.error('ArenaMonitor', 'Watcher error', error)
      })
    logger.info('ArenaMonitor', 'File watcher started')
    this.watcher = watcher
    return true
  }

  stopWatch(): void {
    logger.info('ArenaMonitor', 'Stopping file watcher')
    if (this.changeDebounceTimer) {
      clearTimeout(this.changeDebounceTimer)
      this.changeDebounceTimer = null
    }
    if (this.delayedScanTimer) {
      clearTimeout(this.delayedScanTimer)
      this.delayedScanTimer = null
    }
    this.watcher?.close()
    this.watcher = null
    this.lastArenaContent = null
    this.parsedReplayPaths.clear()
    this.processingPaths.clear()
    this.watchReadyTime = 0
    logger.debug('ArenaMonitor', 'Watcher cleaned up')

    const recordConfig = getRecordConfig()
    notifyArenaRecordStatus(recordConfig.enableAutoRecord ? 'idle' : 'disabled')
  }

  /** 处理新对局 */
  private handleNewArena(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')

      if (content === this.lastArenaContent) {
        logger.debug('ArenaMonitor', 'Arena content unchanged, skipping notification')
        return
      }
      this.lastArenaContent = content

      const arenaInfo: FileArenaInfo = JSON.parse(content)
      logger.info(
        'ArenaMonitor',
        `Parsed arena info - player: ${arenaInfo.playerName}, map: ${arenaInfo.mapDisplayName}, vehicles: ${arenaInfo.vehicles?.length || 0}`
      )

      notifyArenaDetected(arenaInfo)
      logger.info('ArenaMonitor', 'Notified renderer process of new arena')

      const recordConfig = getRecordConfig()
      if (recordConfig.enableAutoRecord) {
        notifyArenaRecordStatus('recording')
      }
    } catch (error) {
      logger.error('ArenaMonitor', 'Failed to handle new arena', error)
    }
  }

  /** 处理新的完整 replay 文件 */
  private async handleNewReplay(filePath: string): Promise<void> {
    const recordConfig = getRecordConfig()
    if (!recordConfig.enableAutoRecord) {
      logger.debug('ArenaMonitor', 'Auto record disabled, skipping replay parse')
      return
    }

    if (this.parsedReplayPaths.has(filePath) || this.processingPaths.has(filePath)) {
      logger.debug('ArenaMonitor', `Replay already parsed or processing, skipping: ${filePath}`)
      return
    }

    this.processingPaths.add(filePath)

    const monitorConfig = getArenaMonitorConfig()
    const realm = monitorConfig.realm ?? 'ASIA'

    try {
      const stat = fs.statSync(filePath)
      if (stat.mtimeMs < this.watchReadyTime) {
        logger.debug(
          'ArenaMonitor',
          `Replay mtime ${stat.mtimeMs} < readyTime ${this.watchReadyTime}, skipping: ${filePath}`
        )
        return
      }
    } catch {
      logger.warn('ArenaMonitor', `Failed to stat replay file: ${filePath}`)
      return
    }

    logger.info('ArenaMonitor', `Parsing replay: ${filePath}, realm=${realm}`)
    try {
      const report = await parseReplayFile(filePath)
      if (!report) {
        logger.error('ArenaMonitor', 'Failed to parse replay file')
        return
      }

      if (!report.players || report.players.length === 0) {
        logger.warn('ArenaMonitor', `Replay data incomplete (no players), skipping: ${filePath}`)
        return
      }

      let record: BattleRecord = {
        ...report,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        dateTime: new Date().toISOString(),
        realm,
        replayPath: filePath
      }

      record = await enrichBattleRecord(record)

      saveRecord(record)
      this.parsedReplayPaths.add(filePath)
      logger.info('ArenaMonitor', `Battle record saved: ${record.id}`)

      notifyArenaRecordStatus('saved')
    } catch (error) {
      logger.error('ArenaMonitor', 'Failed to parse new replay', error)
    } finally {
      this.processingPaths.delete(filePath)
    }
  }

  /**
   * 对局结束后的延迟扫描：处理 add/change 事件可能被吞的情况，
   * 同时也处理中途退出后旧 replay 补充完整、以及多 replay 同时生成的情况。
   */
  private scheduleDelayedScan(replayDir: string): void {
    if (this.delayedScanTimer) {
      clearTimeout(this.delayedScanTimer)
    }
    this.delayedScanTimer = setTimeout(() => {
      this.delayedScanTimer = null
      this.scanAndParseReplays(replayDir).then()
    }, 5000)
    logger.info('ArenaMonitor', 'Scheduled delayed replay scan in 5s')
  }

  /**
   * 扫描 replays 目录，批量解析所有未处理过的 .wowsreplay 文件。
   * 按文件修改时间排序，优先处理最新的。
   */
  private async scanAndParseReplays(replayDir: string): Promise<void> {
    const recordConfig = getRecordConfig()
    if (!recordConfig.enableAutoRecord) {
      return
    }

    logger.info('ArenaMonitor', `Scanning for new replays in: ${replayDir}`)

    const newReplays = scanReplayFiles(replayDir)
      .filter((r) => r.mtime >= this.watchReadyTime && !this.parsedReplayPaths.has(r.path))
      .sort((a, b) => b.mtime - a.mtime)

    let parsedCount = 0
    for (const { path: filePath } of newReplays) {
      await this.handleNewReplay(filePath)
      parsedCount++
    }

    logger.info('ArenaMonitor', `Delayed scan complete, parsed ${parsedCount} new replay(s)`)
  }

  /** 处理对局结束通知 */
  private handleArenaEnded(): void {
    notifyArenaEnded()
    logger.info('ArenaMonitor', 'Notified renderer process of arena ended')

    const recordConfig = getRecordConfig()
    if (recordConfig.enableAutoRecord) {
      notifyArenaRecordStatus('processing')
    }
  }
}

const monitor = new ArenaMonitor()
export default monitor

export function runMonitor(mainWindow: BrowserWindow): void {
  logger.info('ArenaMonitor', 'Running auto-monitor check')
  setMainWindow(mainWindow)

  const config = getArenaMonitorConfig()
  logger.debug(
    'ArenaMonitor',
    `Auto-monitor config: enableAutoMonitor=${config.enableAutoMonitor}, gamePath=${config.gamePath}`
  )
  if (config.enableAutoMonitor) {
    monitor.startWatch(config.gamePath)
  } else {
    logger.debug('ArenaMonitor', 'Auto-monitor disabled, skipping')
  }
}

export function stopMonitor(): void {
  logger.info('ArenaMonitor', 'External stop monitor called')
  monitor.stopWatch()
}

/** 递归查找 replays 目录下最新的 tempArenaInfo.json */
function findTempArenaInfo(dir: string): string | null {
  let latestPath: string | null = null
  let latestMtime = 0

  function traverse(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        if (entry.isDirectory()) {
          traverse(fullPath)
        } else if (entry.isFile() && entry.name === 'tempArenaInfo.json') {
          try {
            const stat = fs.statSync(fullPath)
            if (stat.mtimeMs > latestMtime) {
              latestMtime = stat.mtimeMs
              latestPath = fullPath
            }
          } catch {
            // 忽略无法 stat 的文件
          }
        }
      }
    } catch (error) {
      logger.warn('ArenaMonitor', `Failed to traverse directory: ${currentDir}`, error)
    }
  }

  traverse(dir)
  return latestPath
}

/** 手动检查当前是否存在 tempArenaInfo.json */
export function checkArenaNow(): FileArenaInfo | null {
  logger.info('ArenaMonitor', 'Manual check arena triggered')
  const config = getArenaMonitorConfig()
  if (!config.gamePath || config.gamePath.length <= 0) {
    logger.warn('ArenaMonitor', 'Check now failed: game path not configured')
    return null
  }

  const replayDir = path.resolve(config.gamePath, 'replays')
  const filePath = findTempArenaInfo(replayDir)

  if (!filePath) {
    logger.debug('ArenaMonitor', `Check now: no tempArenaInfo.json found under ${replayDir}`)
    return null
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const arenaInfo: FileArenaInfo = JSON.parse(content)
    logger.info(
      'ArenaMonitor',
      `Check now: found arena at ${filePath}, player=${arenaInfo.playerName}, map=${arenaInfo.mapDisplayName}`
    )
    return arenaInfo
  } catch (error) {
    logger.error('ArenaMonitor', 'Check now failed', error)
    return null
  }
}
