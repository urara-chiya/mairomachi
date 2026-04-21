/**
 * 登录 Token Store
 *
 * 持久化后端颁发的 JWT 凭证，支持过期检查与自动缓冲（预留 60 秒）。
 */

import ElectronStore from 'electron-store'
import { logger } from '../service/logger'

interface TokenData {
  accessToken: string
  /** 有效期（秒） */
  expiresIn: number
  /** 存储时的 Unix 时间戳（秒） */
  savedAt: number
}

interface TokenStoreSchema {
  token: TokenData | null
}

const store = new ElectronStore<TokenStoreSchema>({
  name: 'token-store',
  defaults: {
    token: null
  }
})

logger.info('TokenStore', 'Token store initialized')

/** 获取当前存储的 Token（不检查是否过期） */
export function getToken(): TokenData | null {
  logger.debug('TokenStore', 'Reading token')
  return store.get('token')
}

/**
 * 保存登录凭证
 * @param accessToken - JWT 字符串
 * @param expiresIn - 有效期（秒）
 */
export function setToken(accessToken: string, expiresIn: number): void {
  logger.info('TokenStore', `Saving token, expires in: ${expiresIn}s`)
  store.set('token', {
    accessToken,
    expiresIn,
    savedAt: Math.floor(Date.now() / 1000)
  })
  logger.debug('TokenStore', `Token saved, expires at ${new Date(Date.now() + expiresIn * 1000).toLocaleString()}`)
}

/** 清除 Token（登出时使用） */
export function clearToken(): void {
  logger.info('TokenStore', 'Clearing token')
  store.set('token', null)
}

/**
 * 检查 Token 是否过期
 * @returns true 如果已过期或不存在（预留 60 秒缓冲）
 */
export function isTokenExpired(): boolean {
  const token = getToken()
  if (!token) {
    logger.debug('TokenStore', 'Token does not exist, treating as expired')
    return true
  }

  const now = Math.floor(Date.now() / 1000)
  const expireTime = token.savedAt + token.expiresIn
  const isExpired = now >= expireTime - 60

  logger.debug('TokenStore', `Token expiry check: now=${now}, expireTime=${expireTime}, isExpired=${isExpired}`)
  return isExpired
}

/**
 * 获取有效的 AccessToken
 * @returns token 字符串或 null（过期/不存在）
 */
export function getValidToken(): string | null {
  const token = getToken()
  if (!token || isTokenExpired()) {
    logger.debug('TokenStore', 'Failed to get valid token: token missing or expired')
    return null
  }
  logger.debug('TokenStore', 'Got valid token successfully')
  return token.accessToken
}
