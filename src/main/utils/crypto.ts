import { createHash, createPrivateKey, generateKeyPairSync, sign } from 'crypto'
import { logger } from '../service/logger'

/**
 * 生成 Ed25519 密钥对
 */
export function generateEd25519KeyPair(): {
  publicKey: string
  privateKey: string
} {
  logger.debug('Crypto', 'Generating Ed25519 key pair')
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' }, // 返回 DER 格式，便于 base64
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  })

  const result = {
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64')
  }
  logger.debug(
    'Crypto',
    `Key pair generated, public key length: ${result.publicKey.length}, private key length: ${result.privateKey.length}`
  )
  return result
}

/**
 * 使用私钥签名
 * @param privateKeyBase64 - Base64 编码的私钥 (DER 格式)
 * @param message - 待签名字符串
 * @returns Base64 编码的签名
 */
export function ed25519Sign(privateKeyBase64: string, message: string): string {
  logger.debug('Crypto', `Starting Ed25519 signing, message length: ${message.length}`)
  const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64')

  // 从 DER 重建私钥对象
  const privateKey = createPrivateKey({
    key: privateKeyBuffer,
    format: 'der',
    type: 'pkcs8'
  })

  const signature = sign(null, Buffer.from(message, 'utf-8'), privateKey)
  const signatureBase64 = signature.toString('base64')
  logger.debug('Crypto', `Signing completed, signature length: ${signatureBase64.length}`)
  return signatureBase64
}

/**
 * 构建签名载荷（与后端约定一致）
 * METHOD|URI|timestamp|nonce
 */
export function buildPayload(method: string, uri: string, timestamp: string, nonce: string): string {
  // 确保 URI 不含查询参数（与后端 axios 配置保持一致）
  const cleanUri = uri.split('?')[0]
  const payload = `${method.toUpperCase()}|${cleanUri}|${timestamp}|${nonce}`
  logger.debug('Crypto', `Building signature payload: ${payload}`)
  return payload
}

/**
 * 生成随机 Nonce
 */
export function generateNonce(): string {
  const nonce = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}-${process.hrtime.bigint()}`)
    .digest('hex')
    .substring(0, 32) // 32字符长度
  logger.debug('Crypto', `Generated nonce: ${nonce.substring(0, 8)}...`)
  return nonce
}

/**
 * 获取当前 Unix 时间戳（秒）
 */
export function getTimestamp(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  logger.debug('Crypto', `Getting timestamp: ${timestamp}`)
  return timestamp
}
