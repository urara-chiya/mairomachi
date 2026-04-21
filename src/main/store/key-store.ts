/**
 * 设备密钥 Store
 *
 * 安全存储激活码与 Ed25519 密钥对，privateKey 优先使用系统安全存储加密。
 */

import { safeStorage } from 'electron'
import ElectronStore from 'electron-store'
import { logger } from '../service/logger'

interface KeyStoreData {
  /** 原始激活码 */
  code: string
  publicKey: string
  /** 加密存储的 privateKey（Base64 格式） */
  privateKey: string
  deviceFingerprint: string
}

interface KeyStoreSchema {
  keys: KeyStoreData | null
}

const store = new ElectronStore<KeyStoreSchema>({
  name: 'key-store',
  defaults: { keys: null }
})

logger.info('KeyStore', 'Key store initialized')

/** 检查是否已保存密钥 */
export function hasKeys(): boolean {
  const has = store.get('keys') !== null
  logger.debug('KeyStore', `Checking keys exist: ${has}`)
  return has
}

/**
 * 读取设备密钥
 * @returns 若系统支持加密存储则自动解密 privateKey
 */
export function getKeys(): KeyStoreData | null {
  logger.debug('KeyStore', 'Reading key data')
  const data = store.get('keys')
  if (!data) {
    logger.debug('KeyStore', 'Key data is empty')
    return null
  }

  if (safeStorage.isEncryptionAvailable()) {
    try {
      const encryptedBuffer = Buffer.from(data.privateKey, 'base64')
      const decrypted = safeStorage.decryptString(encryptedBuffer)
      logger.debug('KeyStore', 'Private key decrypted')
      return { ...data, privateKey: decrypted }
    } catch (e) {
      logger.error('KeyStore', 'Private key decryption failed', e)
      return null
    }
  }
  logger.debug('KeyStore', 'Encryption unavailable, returning raw key data')
  return data
}

/** 读取原始激活码 */
export function getCode(): string | null {
  const data = store.get('keys')
  const code = data?.code || null
  logger.debug('KeyStore', `Reading activation code: ${code ? 'saved' : 'not saved'}`)
  return code
}

/**
 * 保存设备密钥和激活码
 * @param code
 * @param publicKey
 * @param privateKey - 原始私钥（函数内部自动加密）
 * @param fingerprint
 */
export function saveKeys(code: string, publicKey: string, privateKey: string, fingerprint: string): void {
  logger.info('KeyStore', `Saving keys, device fingerprint: ${fingerprint.substring(0, 16)}...`)
  let encryptedPrivateKey = privateKey
  if (safeStorage.isEncryptionAvailable()) {
    encryptedPrivateKey = safeStorage.encryptString(privateKey).toString('base64')
    logger.debug('KeyStore', 'Private key encrypted and stored')
  } else {
    logger.debug('KeyStore', 'Encryption unavailable, storing private key in plaintext')
  }
  store.set('keys', {
    code,
    publicKey,
    privateKey: encryptedPrivateKey,
    deviceFingerprint: fingerprint
  })
  logger.info('KeyStore', 'Keys saved')
}

/** 清除所有密钥 */
export function clearKeys(): void {
  logger.info('KeyStore', 'Clearing all keys')
  store.set('keys', null)
}
