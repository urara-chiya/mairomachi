/**
 * Replay 文件扫描工具
 *
 * 递归扫描 `replays` 目录，收集 `.wowsreplay` 文件信息。
 */

import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../service/logger'

/**
 * 校验并解析游戏路径
 * @param gamePath - 用户配置的游戏根目录
 * @returns 解析后的绝对路径
 * @throws 路径非法或缺少必要文件/目录时抛出错误
 */
export function resolveAndValidateGamePath(gamePath: string): string {
  if (!gamePath) {
    throw new Error('游戏路径不能为空')
  }

  const resolved = path.resolve(gamePath)

  // 校验 replays 目录存在
  const replaysDir = path.join(resolved, 'replays')
  if (!fs.existsSync(replaysDir)) {
    throw new Error('未找到 replays 目录')
  }
  if (!fs.statSync(replaysDir).isDirectory()) {
    throw new Error('replays 路径不是目录')
  }

  // 校验 WorldOfWarships.exe 存在
  const exePath = path.join(resolved, 'WorldOfWarships.exe')
  if (!fs.existsSync(exePath)) {
    throw new Error('未找到游戏主程序 WorldOfWarships.exe')
  }

  return resolved
}

export interface ReplayFileInfo {
  path: string
  mtime: number
}

/**
 * 递归扫描目录下的所有 .wowsreplay 文件
 * @param dir - 要扫描的目录
 * @param options - 配置选项
 * @param options.excludeTemp - 是否排除 temp.wowsreplay（默认 true）
 * @returns 文件信息列表
 */
export function scanReplayFiles(dir: string, options: { excludeTemp?: boolean } = {}): ReplayFileInfo[] {
  const { excludeTemp = true } = options
  const results: ReplayFileInfo[] = []

  function traverse(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        if (entry.isDirectory()) {
          traverse(fullPath)
        } else if (
          entry.isFile() &&
          entry.name.endsWith('.wowsreplay') &&
          !(excludeTemp && entry.name === 'temp.wowsreplay')
        ) {
          try {
            const stat = fs.statSync(fullPath)
            results.push({ path: fullPath, mtime: stat.mtimeMs })
          } catch {
            // 忽略无法 stat 的文件
          }
        }
      }
    } catch (error) {
      logger.warn('ReplayFiles', `Failed to traverse directory: ${currentDir}`, error)
    }
  }

  traverse(dir)
  return results
}

/**
 * 查找指定目录下最新的 .wowsreplay 文件
 * @param gamePath - 游戏根目录（函数内部会拼接 `replays`）
 * @returns 最新 replay 的绝对路径，或 null（不存在）
 */
export function findLatestReplay(gamePath: string): string | null {
  const replaysDir = path.resolve(gamePath, 'replays')
  if (!fs.existsSync(replaysDir)) {
    logger.warn('ReplayFiles', `Replays directory does not exist: ${replaysDir}`)
    return null
  }

  const files = scanReplayFiles(replaysDir, { excludeTemp: true })
  if (files.length === 0) {
    logger.warn('ReplayFiles', `No .wowsreplay files found in ${replaysDir}`)
    return null
  }

  const latest = files.reduce((a, b) => (a.mtime > b.mtime ? a : b))
  logger.info('ReplayFiles', `Latest replay found: ${latest.path}`)
  return latest.path
}
