/**
 * Replay 文件轻量解析器（analyze-lite）
 *
 * 自定义二进制格式，扫描 BattleResults packet（type 0x22）提取结算数据。
 *
 * 文件格式（15.3+）：
 *   [0..4)   magic (le_u32)
 *   [4..8)   block_count (le_u32)
 *   [8..12)  meta_len (le_u32)
 *   [12..12+meta_len) JSON 元数据（UTF-8）
 *   随后 (block_count-1) 个额外 block：4 字节长度 + 数据
 *   随后 4 字节 decompressed_size
 *   随后 4 字节 compressed_size
 *   剩余部分：Blowfish 加密 + zlib 压缩的 packet_data
 *
 * 解密流程：
 *   1. Blowfish ECB 逐块解密（使用固定密钥）
 *   2. Rust-style CBC：每块解密后与上一块的明文 XOR（非标准 CBC）
 *   3. zlib inflate 解压
 *
 * 索引对照表：
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

import fs from 'node:fs'
import zlib from 'node:zlib'
import { Blowfish } from 'egoroof-blowfish'
import { ReplayLiteReport, ReplayLitePlayer } from '../type'

const BLOWFISH_KEY = new Uint8Array([
  0x29, 0xb7, 0xc9, 0x09, 0x38, 0x3f, 0x84, 0x88, 0xfa, 0x98, 0xec, 0x4e, 0x13, 0x19, 0x79, 0xfb
])

/** 解析异常 */
export class ReplayParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReplayParseError'
  }
}

/** little-endian u32 */
function readUInt32LE(buf: Buffer, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)
}

/**
 * 解析 replay 文件头并提取加密后的 packet_data。
 *
 * 返回 { meta, encryptedPacketData }
 */
function readReplayFile(filePath: string): { meta: Record<string, unknown>; encrypted: Buffer } {
  let data: Buffer
  try {
    data = fs.readFileSync(filePath)
  } catch {
    throw new ReplayParseError(`Failed to read replay file: ${filePath}`)
  }

  let offset = 0

  // const magic = readUInt32LE(data, offset)
  offset += 4
  // Magic 为 0x11343212，此处不做严格校验以兼容未来版本变动

  const blockCount = readUInt32LE(data, offset)
  offset += 4

  const metaLen = readUInt32LE(data, offset)
  offset += 4
  if (offset + metaLen > data.length) {
    throw new ReplayParseError('Invalid replay: meta length exceeds file size')
  }

  const metaBuf = data.subarray(offset, offset + metaLen)
  let meta: Record<string, unknown>
  try {
    meta = JSON.parse(metaBuf.toString('utf-8')) as Record<string, unknown>
  } catch {
    throw new ReplayParseError('Failed to parse replay meta JSON')
  }
  offset += metaLen

  for (let i = 0; i < blockCount - 1; i++) {
    const blockSize = readUInt32LE(data, offset)
    offset += 4
    if (offset + blockSize > data.length) {
      throw new ReplayParseError('Invalid replay: extra block exceeds file size')
    }
    offset += blockSize
  }

  if (offset + 8 > data.length) {
    throw new ReplayParseError('Invalid replay: missing size footer')
  }

  // decompressed_size + compressed_size（解析流程中不严格校验）
  offset += 4 + 4

  const encrypted = data.subarray(offset)
  if (encrypted.length === 0) {
    throw new ReplayParseError('Invalid replay: no encrypted packet data')
  }
  if (encrypted.length % 8 !== 0) {
    throw new ReplayParseError('Invalid replay: encrypted data length is not a multiple of 8')
  }

  return { meta, encrypted }
}

/**
 * Blowfish 解密 + zlib 解压。
 *
 * 自定义 chaining mode：
 * - 初始化 previous = [0,0,0,0,0,0,0,0]
 * - 对每个块 ECB 解密
 * - 解密结果与 previous XOR 得到明文
 * - previous = 当前明文
 */
function decryptPacketData(encrypted: Buffer): Buffer {
  const bf = new Blowfish(BLOWFISH_KEY, Blowfish.MODE.ECB, Blowfish.PADDING.PKCS5)

  // 必须一次性批量 ECB 解密。egoroof-blowfish 逐块调用 bf.decode() 会改变内部状态，导致后续块解密结果错误。
  const ecbDecrypted = Buffer.from(bf.decode(encrypted, Blowfish.TYPE.UINT8_ARRAY))

  const blockSize = 8
  const numBlocks = ecbDecrypted.length / blockSize
  const decrypted = Buffer.alloc(ecbDecrypted.length)
  const previous = Buffer.alloc(8, 0)

  for (let i = 0; i < numBlocks; i++) {
    const blockOffset = i * blockSize

    // Rust-style CBC：与上一块明文 XOR
    for (let j = 0; j < 8; j++) {
      decrypted[blockOffset + j] = ecbDecrypted[blockOffset + j] ^ previous[j]
    }

    // previous 更新为当前明文（Rust 风格，非标准 CBC）
    for (let j = 0; j < 8; j++) {
      previous[j] = decrypted[blockOffset + j]
    }
  }

  try {
    return zlib.inflateSync(decrypted)
  } catch {
    throw new ReplayParseError('Failed to decompress packet data')
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
    const packetSize = readUInt32LE(packetData, offset)
    const packetType = readUInt32LE(packetData, offset + 4)

    if (offset + 12 + packetSize > packetData.length) {
      break
    }

    if (packetType === 0x22) {
      const payload = packetData.subarray(offset + 12, offset + 12 + packetSize)
      if (payload.length < 4) {
        return null
      }
      const jsonLen = readUInt32LE(payload, 0)
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
 * 如果 Ally / Self 的 exp 是 raw_exp 的1.5倍，为 win，否则为 loss
 */
function inferWinner(players: ReplayLitePlayer[]): ReplayLiteReport['matchResult'] {
  // 记录友方的 teamId，用于填充平局的 teamId
  let allyId: number = -1
  for (const p of players) {
    const { rawExp, exp, teamId, relation } = p
    // 跳过为0的
    if (!rawExp || !exp || rawExp <= 0 || exp <= 0) {
      continue
    }
    if (relation === 'Self' || relation === 'Ally') {
      allyId = teamId
      return {
        result: exp > rawExp ? 'win' : 'loss',
        teamId
      }
    } else {
      return {
        result: exp > rawExp ? 'loss' : 'win',
        teamId: teamId === 0 ? 1 : 0
      }
    }
  }

  return {
    result: 'draw',
    teamId: allyId,
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
  const { meta, encrypted } = readReplayFile(filePath)
  const packetData = decryptPacketData(encrypted)

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
      accountId: toInt(arr[0]),
      name,
      shipId: toInt(arr[7]),
      teamId,
      relation,
      isBot: false,
      damage: toInt(arr[426]),
      frags: toInt(arr[486]),
      rawExp: toInt(arr[403]),
      exp: toInt(arr[404])
    })
  }

  const matchResult = inferWinner(players)

  return {
    matchResult,
    mapName: typeof meta.mapName === 'string' ? meta.mapName : undefined,
    gameMode: typeof meta.scenario === 'string' ? meta.scenario : undefined,
    matchGroup: typeof meta.matchGroup === 'string' ? meta.matchGroup : undefined,
    finishType: null,
    players
  }
}
