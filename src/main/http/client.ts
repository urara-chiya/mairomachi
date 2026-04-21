import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  RawAxiosRequestHeaders
} from 'axios'
import { clearKeys, clearToken, getKeys, getToken } from '../store'
import { buildPayload, ed25519Sign, generateNonce, getTimestamp } from '../utils/crypto'
import { MairoResult } from '../type'
import { logger } from '../service/logger'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

interface AxiosErrorWithAuthMeta extends AxiosError {
  __needReactivate?: boolean
  __authCode?: number
  __authMessage?: string
}

class MairoHttpClient {
  private readonly instance: AxiosInstance

  public constructor() {
    logger.info('HttpClient', 'Initializing HTTP client')
    const baseURL = import.meta.env.VITE_MAIRO_API_BASE_URL
    logger.info('HttpClient', `Base URL: ${baseURL}`)
    this.instance = axios.create({
      baseURL,
      timeout: 30000
    })
    this.setupInterceptors()
    logger.info('HttpClient', 'HTTP client initialized')
  }

  async get<T, R>(url: string, params?: T, headers?: RawAxiosRequestHeaders, timeout?: number): Promise<R> {
    logger.debug('HttpClient', `GET request: ${url}`)
    return this.instance.get(url, { params, headers, timeout })
  }

  async post<T, R>(url: string, data?: T, headers?: RawAxiosRequestHeaders, timeout?: number): Promise<R> {
    logger.debug('HttpClient', `POST request: ${url}`)
    return this.instance.post(url, data, { headers, timeout })
  }

  async put<T, R>(url: string, data?: T, headers?: RawAxiosRequestHeaders, timeout?: number): Promise<R> {
    logger.debug('HttpClient', `PUT request: ${url}`)
    return this.instance.put(url, data, { headers, timeout })
  }

  async delete<R>(url: string, headers?: RawAxiosRequestHeaders, timeout?: number): Promise<R> {
    logger.debug('HttpClient', `DELETE request: ${url}`)
    return this.instance.delete(url, { headers, timeout })
  }

  async download(
    url: string,
    destinationPath: string,
    headers?: RawAxiosRequestHeaders,
    timeout?: number,
    onProgress?: (transferred: number, total: number) => void
  ): Promise<void> {
    logger.info('HttpClient', `Downloading file from ${url} to ${destinationPath}`)
    const response = await this.instance.get<NodeJS.ReadableStream>(url, {
      headers,
      timeout,
      responseType: 'stream'
    })
    const stream = response.data
    const totalLength = parseInt(response.headers['content-length'] || '0', 10)

    let transferred = 0
    if (onProgress && totalLength > 0) {
      stream.on('data', (chunk: Buffer) => {
        transferred += chunk.length
        onProgress(transferred, totalLength)
      })
    }

    await pipeline(stream, createWriteStream(destinationPath))
    logger.info('HttpClient', `Download completed: ${destinationPath}`)
  }

  private setupInterceptors(): void {
    logger.debug('HttpClient', 'Setting up request/response interceptors')
    // 请求拦截器：添加 JWT 和 Ed25519 签名
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const url = config.url || '/'
        const method = config.method?.toUpperCase() || 'GET'
        logger.debug('HttpClient', `Sending request: ${method} ${url}`)

        // 认证接口不需要自动携带旧 JWT，避免过期/失效 Token 干扰公开端点
        const isAuthEndpoint = url === '/auth/activate' || url === '/auth/login'

        // 1. 添加 JWT（如果存在且不是认证端点）
        if (!isAuthEndpoint) {
          const tokenStore = getToken()
          const accessToken = tokenStore?.accessToken
          if (accessToken && accessToken.length > 0) {
            config.headers['Authorization'] = `Bearer ${accessToken}`
            logger.debug('HttpClient', 'JWT auth header added')
          }
        }

        // 2. 添加 Ed25519 签名（如果已激活且不是认证端点；认证端点由调用方手动传入签名头）
        if (!isAuthEndpoint) {
          const keys = getKeys()
          if (keys && keys.privateKey) {
            const timestamp = getTimestamp()
            const nonce = generateNonce()

            // 构建签名载荷: METHOD|URI|timestamp|nonce
            const payload = buildPayload(method, url, timestamp, nonce)
            const signature = ed25519Sign(keys.privateKey, payload)

            config.headers['X-Timestamp'] = timestamp
            config.headers['X-Nonce'] = nonce
            config.headers['X-Signature'] = signature
            logger.debug('HttpClient', `Ed25519 signature added, timestamp: ${timestamp}`)
          }
        }

        return config
      },
      (error) => {
        logger.error('HttpClient', 'Request interceptor error', error)
        return Promise.reject(error)
      }
    )

    // 需要强制重新激活的 AuthException 业务错误码
    const AUTH_REACTIVATE_CODES = [1001, 1002, 1003, 1004, 3001, 3002, 3003]

    // 响应拦截器
    this.instance.interceptors.response.use(
      <T>(response: AxiosResponse<T>): T | AxiosResponse => {
        const { data, config } = response
        logger.debug('HttpClient', `Response received: ${config.method?.toUpperCase()} ${config.url}`)

        // Blob / Stream 类型直接返回原始响应
        if (config.responseType === 'blob' || config.responseType === 'stream') {
          return response
        }
        return data
      },
      <T>(error: AxiosError<MairoResult<T>>) => {
        const status = error.response?.status
        const url = error.config?.url
        const responseData = error.response?.data
        logger.error('HttpClient', `Request failed: ${url}, status: ${status}`, responseData)

        const bizCode = responseData?.code
        if (typeof bizCode === 'number' && AUTH_REACTIVATE_CODES.includes(bizCode)) {
          logger.warn('HttpClient', `Auth exception detected (code=${bizCode}), clearing local credentials`)
          clearToken()
          clearKeys()
          const authError = error as AxiosErrorWithAuthMeta
          authError.__needReactivate = true
          authError.__authCode = bizCode
          authError.__authMessage = responseData?.message || '登录状态已失效，请重新激活'
        }

        return Promise.reject(error)
      }
    )
  }
}

const mairoClient: MairoHttpClient = new MairoHttpClient()

export default mairoClient
