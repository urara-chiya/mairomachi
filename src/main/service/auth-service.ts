import axios, { AxiosError } from 'axios'
import mairoClient from '../http/client'
import { ActivateRequest, LoginRequest, LoginResult, MairoResult, TokenResponse } from '../type'
import { clearKeys, clearToken, getCode, getKeys, hasKeys, saveKeys, setToken } from '../store'
import { buildPayload, ed25519Sign, generateEd25519KeyPair, generateNonce, getTimestamp } from '../utils/crypto'
import { generateDeviceFingerprint } from '../utils/device'
import { logger } from './logger'
import { initShipInfoService } from './ship-info-service'

/**
 * 激活设备（首次使用）
 * 生成密钥对，上传公钥，保存 JWT、私钥和激活码
 */
export async function activate(code: string): Promise<boolean> {
  logger.info('AuthService', `Starting device activation, code length: ${code?.length || 0}`)
  try {
    // 1. 生成设备指纹和密钥对
    const fingerprint = generateDeviceFingerprint()
    logger.debug('AuthService', `Device fingerprint generated: ${fingerprint.substring(0, 16)}...`)
    const { publicKey, privateKey } = generateEd25519KeyPair()
    logger.debug('AuthService', `Ed25519 key pair generated, public key length: ${publicKey.length}`)

    // 2. 调用激活接口
    const data: ActivateRequest = {
      code,
      deviceFingerprint: fingerprint,
      publicKey
    }

    const result = await mairoClient.post<ActivateRequest, MairoResult<TokenResponse>>(
      import.meta.env.VITE_API_ENDPOINT_AUTH_ACTIVATE,
      data,
      undefined,
      5000
    )

    // 3. 保存 Token、密钥和激活码（激活码用于后续自动登录）
    setToken(result.data.accessToken, result.data.expiresIn)
    logger.info('AuthService', `Token saved, expires in: ${result.data.expiresIn}s`)

    // 关键：保存激活码，登录时自动读取
    saveKeys(code, publicKey, privateKey, fingerprint)
    logger.info('AuthService', 'Device keys and activation code saved')

    // 4. 初始化 ShipInfo 缓存服务（登录后）
    logger.info('AuthService', 'Initializing ShipInfo service after activation')
    await initShipInfoService()

    return true
  } catch (error) {
    logger.error('AuthService', 'Device activation failed', error)
    return false
  }
}

/**
 * 登录（已有设备）
 * 自动读取保存的激活码，无需手动传入
 */
export async function login(): Promise<LoginResult> {
  logger.info('AuthService', 'Starting login process')
  try {
    const keys = getKeys()
    const code = getCode()

    if (!keys || !code) {
      logger.error('AuthService', 'Login failed: device keys or activation code not found')
      return {
        success: false,
        needReactivate: true,
        message: '本地激活信息缺失，请重新激活'
      }
    }
    logger.debug('AuthService', `Device info loaded, fingerprint: ${keys.deviceFingerprint.substring(0, 16)}...`)

    // 使用保存的激活码自动构建登录请求
    const loginData: LoginRequest = {
      code, // 自动读取存储的激活码
      deviceFingerprint: keys.deviceFingerprint
    }

    // 生成签名参数
    const timestamp = getTimestamp()
    const nonce = generateNonce()
    const payload = buildPayload('POST', import.meta.env.VITE_API_ENDPOINT_AUTH_LOGIN, timestamp, nonce)
    const signature = ed25519Sign(keys.privateKey, payload)

    logger.debug('AuthService', `Sending login request, timestamp: ${timestamp}, nonce: ${nonce.substring(0, 8)}...`)
    // 调用登录接口（手动添加签名头）
    const result = await mairoClient.post<LoginRequest, MairoResult<TokenResponse>>(
      import.meta.env.VITE_API_ENDPOINT_AUTH_LOGIN,
      loginData,
      {
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature
      },
      5000
    )

    // 更新 Token（版本号已递增，旧 JWT 失效）
    setToken(result.data.accessToken, result.data.expiresIn)
    logger.info('AuthService', `Login successful, new token expires in: ${result.data.expiresIn}s`)

    // 初始化 ShipInfo 缓存服务（登录后，不阻塞启动）
    logger.info('AuthService', 'Initializing ShipInfo service after login')
    initShipInfoService().catch((err) => {
      logger.warn('AuthService', 'ShipInfo initialization failed after login, will retry later', err)
    })

    return { success: true, needReactivate: false }
  } catch (error) {
    logger.error('AuthService', 'Login failed', error)

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError & {
        __needReactivate?: boolean
        __authMessage?: string
      }
      if (axiosError.__needReactivate) {
        return {
          success: false,
          needReactivate: true,
          message: axiosError.__authMessage || '激活已过期，请重新激活>_<'
        }
      }

      const status = error.response?.status
      if (status === 401 || status === 403) {
        return {
          success: false,
          needReactivate: true,
          message: '激活已过期，请重新激活>_<'
        }
      }
      if (!status) {
        return {
          success: false,
          needReactivate: false,
          message: '连接服务器失败，请检查网络或稍后重试'
        }
      }
      return {
        success: false,
        needReactivate: false,
        message: `服务器响应异常 (${status})，请稍后重试`
      }
    }

    return {
      success: false,
      needReactivate: false,
      message: '登录时发生未知错误，请稍后重试'
    }
  }
}

/**
 * 刷新 Token
 */
export async function refreshToken(): Promise<boolean> {
  logger.info('AuthService', 'Starting token refresh')
  try {
    const result = await mairoClient.post<void, MairoResult<TokenResponse>>(
      import.meta.env.VITE_API_ENDPOINT_AUTH_REFRESH,
      undefined,
      undefined,
      5000
    )
    setToken(result.data.accessToken, result.data.expiresIn)
    logger.info('AuthService', `Token refreshed, new expiry: ${result.data.expiresIn}s`)
    return true
  } catch (error) {
    logger.error('AuthService', 'Token refresh failed', error)
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError & {
        __needReactivate?: boolean
      }
      if (axiosError.__needReactivate) {
        return false
      }
    }
    return false
  }
}

/**
 * 登出（清除本地存储，包括激活码）
 */
export function logout(): void {
  logger.info('AuthService', 'Logging out, clearing token and keys')
  clearToken()
  clearKeys() // 这会同时清除激活码、私钥、公钥
  logger.info('AuthService', 'Logout completed')
}

/**
 * 检查是否已激活（有私钥和激活码）
 */
export function isActivated(): boolean {
  const activated = hasKeys() && getCode() !== null
  logger.debug('AuthService', `Checking device activation status: ${activated}`)
  return activated
}
