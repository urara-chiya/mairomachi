/**
 * 应用更新相关类型
 *
 * 涵盖自动更新检查与下载进度推送的数据结构。
 */

/** 更新检查结果 */
export interface CheckUpdateResult {
  /** 是否有新版本 */
  hasUpdate: boolean
  /** 最新版本号 */
  latestVersion: string
  /** 当前版本号 */
  currentVersion: string
  /** 安装包 SHA-256 哈希值 */
  hash?: string
}

/** 更新下载进度 */
export interface UpdateProgressInfo {
  /** 下载百分比 (0-100) */
  percent: number
  /** 已传输字节数 */
  transferred: number
  /** 总字节数 */
  total: number
}
