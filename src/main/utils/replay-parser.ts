/**
 * Replay 文件轻量解析器（analyze-lite）
 *
 * 不依赖游戏元数据或外部二进制（replayshark.exe），直接扫描 replay 文件中的
 * BattleResults packet（type 0x22）提取结算数据。性能开销极低，适合客户端
 * 实时解析。
 *
 * 索引对照表（15.3+ 客户端验证）：
 *   [0]   = account_id
 *   [1]   = name
 *   [6]   = team_id（0-based：0 或 1）
 *   [7]   = ship_id
 *   [15]  = max_health
 *   [403] = raw_exp
 *   [404] = exp
 *   [426] = damage（服务器权威值）
 *   [486] = frags
 */

import AdmZip from 'adm-zip'
import { ReplayLitePlayer, ReplayLiteReport } from '../type'

/** 解析异常 */
export class ReplayParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReplayParseError'
  }
}

/**
 * 在 packet_data 缓冲区中线性扫描 BattleResults packet（type 0x22）。
 *
 * Packet 格式（little-endian）：
 *   [0..4)   packet_size
 *   [4..8)   packet_type
 *   [8..12)  保留/未知
 *   [12..12+packet_size) payload
 *
 * 0x22 的 payload 前 4 字节为 JSON 长度，后续为 UTF-8 JSON 字符串。
 */
function scanBattleResults(packetData: Buffer): string | null {
  let offset = 0
  while (offset + 12 <= packetData.length) {
    const packetSize = packetData.readUInt32LE(offset)
    const packetType = packetData.readUInt32LE(offset + 4)

    if (offset + 12 + packetSize > packetData.length) {
      break
    }

    if (packetType === 0x22) {
      const payload = packetData.subarray(offset + 12, offset + 12 + packetSize)
      if (payload.length < 4) {
        return null
      }
      const jsonLen = payload.readUInt32LE(0)
      if (payload.length < 4 + jsonLen) {
        return null
      }
      return payload.subarray(4, 4 + jsonLen).toString('utf-8')
    }

    offset += 12 + packetSize
  }
  return null
}

/** 将可能为 float 的 JSON 数值安全地转为 integer */
function toInt(v: unknown): number {
  if (typeof v === 'number') return Math.floor(v)
  return 0
}

/**
 * 通过 raw_exp 推断胜负（相对于 Self 的视角）。
 *
 * 对每队 raw_exp 排序后去掉最高和最低值取平均（trimmed mean）；
 * 若任一队人数不足掐头去尾，则退化为普通算术平均。
 *
 * 返回值中的 `result` 以 Self 为参照：
 *   - "win"     Self 所在队伍平均值更高
 *   - "loss"    Self 所在队伍平均值更低
 *   - "unknown" 找不到 Self 或数据异常无法推断
 *
 * `team_id` 固定为 Self 的 team_id，方便服务层直接消费。
 */
function inferWinner(players: ReplayLitePlayer[]): ReplayLiteReport['match_result'] {
  const teamExps = new Map<number, number[]>()
  for (const p of players) {
    const list = teamExps.get(p.team_id) ?? []
    list.push(p.raw_exp ?? 0)
    teamExps.set(p.team_id, list)
  }

  if (teamExps.size !== 2) {
    return undefined
  }

  const avgs: Array<[number, number]> = []
  for (const [teamId, exps] of teamExps) {
    const sorted = [...exps].sort((a, b) => a - b)
    let avg: number
    if (exps.length <= 2) {
      // 人数不足，退化为普通平均
      avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
    } else {
      const trimmed = sorted.slice(1, -1)
      avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
    }
    avgs.push([teamId, avg])
  }

  avgs.sort((a, b) => b[1] - a[1])
  const winnerTeamId = avgs[0][0]

  const selfPlayer = players.find((p) => p.relation === 'Self')
  if (!selfPlayer) {
    return { result: 'unknown', team_id: winnerTeamId, inferred: true }
  }

  const selfTeamId = selfPlayer.team_id
  const result = selfTeamId === winnerTeamId ? 'win' : 'loss'

  return {
    result,
    team_id: selfTeamId,
    inferred: true
  }
}

/**
 * 轻量解析单个 .wowsreplay 文件。
 *
 * @param filePath - replay 文件的绝对路径
 * @returns 解析后的原始报告（字段名为 snake_case，与 replayshark 输出兼容）
 * @throws {ReplayParseError} 文件格式非法或缺少 BattleResults packet
 */
export function parseReplayLite(filePath: string): ReplayLiteReport {
  let zip: AdmZip
  try {
    zip = new AdmZip(filePath)
  } catch {
    throw new ReplayParseError(`Failed to open replay as ZIP: ${filePath}`)
  }

  const metaEntry = zip.getEntry('replay.json')
  const packetEntry = zip.getEntry('packet_data')
  if (!metaEntry || !packetEntry) {
    throw new ReplayParseError('Invalid replay: missing replay.json or packet_data')
  }

  let meta: Record<string, unknown>
  try {
    meta = JSON.parse(metaEntry.getData().toString('utf-8')) as Record<string, unknown>
  } catch {
    throw new ReplayParseError('Failed to parse replay.json')
  }

  const packetData = packetEntry.getData()
  const battleResultsJson = scanBattleResults(packetData)
  if (!battleResultsJson) {
    throw new ReplayParseError('No BattleResults packet found')
  }

  let battleResults: Record<string, unknown>
  try {
    battleResults = JSON.parse(battleResultsJson) as Record<string, unknown>
  } catch {
    throw new ReplayParseError('Failed to parse BattleResults JSON')
  }

  const playersPublicInfo = battleResults.playersPublicInfo as Record<string, unknown[]> | undefined
  if (!playersPublicInfo) {
    throw new ReplayParseError('Missing playersPublicInfo in BattleResults')
  }

  const recorderName = typeof meta.playerName === 'string' ? meta.playerName : ''

  // 先找到录制玩家的 team_id
  let recorderTeamId: number | undefined
  for (const arr of Object.values(playersPublicInfo)) {
    if (!Array.isArray(arr)) continue
    const name = arr[1]
    if (name === recorderName) {
      recorderTeamId = toInt(arr[6])
      break
    }
  }

  const players: ReplayLitePlayer[] = []
  for (const arr of Object.values(playersPublicInfo)) {
    if (!Array.isArray(arr)) continue

    const name = typeof arr[1] === 'string' ? arr[1] : ''
    const teamId = toInt(arr[6])

    let relation: string
    if (recorderTeamId !== undefined) {
      if (name === recorderName) {
        relation = 'Self'
      } else if (teamId === recorderTeamId) {
        relation = 'Ally'
      } else {
        relation = 'Enemy'
      }
    } else {
      relation = 'Unknown'
    }

    players.push({
      account_id: toInt(arr[0]),
      name,
      ship_id: toInt(arr[7]),
      team_id: teamId,
      relation,
      is_bot: false,
      damage: toInt(arr[426]),
      frags: toInt(arr[486]),
      raw_exp: toInt(arr[403]),
      exp: toInt(arr[404])
    })
  }

  const matchResult = inferWinner(players)

  return {
    match_result: matchResult,
    map_name: typeof meta.mapName === 'string' ? meta.mapName : undefined,
    game_mode: typeof meta.scenario === 'string' ? meta.scenario : undefined,
    match_group: typeof meta.matchGroup === 'string' ? meta.matchGroup : undefined,
    finish_type: null,
    players
  }
}
