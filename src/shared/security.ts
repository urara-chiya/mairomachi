/**
 * 外部链接安全白名单
 *
 * 供主进程窗口导航拦截与 IPC handler 统一使用。
 */

export const ALLOWED_SCHEMES = ['https:', 'http:']
export const ALLOWED_HOSTS = ['wows-numbers.com', 'developers.wargaming.net']

export function isAllowedExternalUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    return ALLOWED_SCHEMES.includes(url.protocol) && ALLOWED_HOSTS.includes(url.hostname)
  } catch {
    return false
  }
}
