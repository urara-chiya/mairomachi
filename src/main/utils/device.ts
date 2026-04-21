import * as os from 'node:os'
import { createHash } from 'node:crypto'
import { logger } from '../service/logger'

/**
 * 生成设备唯一指纹
 */
export function generateDeviceFingerprint(): string {
  logger.info('Device', 'Generating device fingerprint')
  const systemInfo = {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().map((cpu) => cpu.model),
    totalMemory: os.totalmem(),
    hostname: os.hostname(),
    networkInterfaces: os.networkInterfaces()
  }
  logger.debug('Device', `System info: platform=${systemInfo.platform}, arch=${systemInfo.arch}`)

  const hash = createHash('sha256')
  hash.update(JSON.stringify(systemInfo))
  const fingerprint = hash.digest('hex')
  logger.info('Device', `Device fingerprint generated: ${fingerprint.substring(0, 16)}...`)
  return fingerprint
}
