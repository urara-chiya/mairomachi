import { ref } from 'vue'
import type { FileMapInfo } from '@shared/types'

const mapInfoCache = ref<FileMapInfo | null>(null)
let initialized = false

/** 初始化地图信息缓存 */
export async function initMapInfo(): Promise<void> {
  if (initialized) return
  try {
    const data = await window.ipc.info.getMaps()
    mapInfoCache.value = data
    initialized = true
  } catch (error) {
    console.error('Failed to load map info:', error)
  }
}

/** 获取地图名称（优先用 mapId 查表，fallback 到 mapName） */
export function getMapName(mapId: number | undefined, fallbackMapName: string | undefined, language: string): string {
  if (mapId == null) return fallbackMapName || '未知地图'
  const cache = mapInfoCache.value
  if (!cache) return fallbackMapName || '未知地图'
  const detail = cache.maps[String(mapId)]
  if (!detail) return fallbackMapName || '未知地图'
  return detail.names[language] ?? detail.names['en'] ?? fallbackMapName ?? '未知地图'
}

/** 获取原始缓存数据 */
export function useMapInfoCache(): typeof mapInfoCache {
  return mapInfoCache
}
