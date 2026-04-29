/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAIRO_API_BASE_URL: string

  // API 端点路径
  readonly VITE_API_ENDPOINT_ARENA: string
  readonly VITE_API_ENDPOINT_AUTH_ACTIVATE: string
  readonly VITE_API_ENDPOINT_AUTH_LOGIN: string
  readonly VITE_API_ENDPOINT_AUTH_REFRESH: string
  readonly VITE_API_ENDPOINT_VERSION_LATEST: string
  readonly VITE_API_ENDPOINT_DOWNLOAD_LATEST: string
  readonly VITE_API_ENDPOINT_INFO_SHIPS: string
  readonly VITE_API_ENDPOINT_INFO_SHIPS_VERSION: string
  readonly VITE_API_ENDPOINT_RECORD_DETAIL: string
  readonly VITE_API_ENDPOINT_RECORD_STATS: string
  readonly VITE_API_ENDPOINT_RECORD_STATS_NEW: string
  readonly VITE_API_ENDPOINT_RECORD_STATS_BATCH: string
  readonly VITE_API_ENDPOINT_RECORD_EVALUATE: string
  readonly VITE_API_ENDPOINT_RECORD_CLAN_INFO: string
  readonly VITE_API_ENDPOINT_RECORD_BATTLE_ENRICH: string
  readonly VITE_API_ENDPOINT_INFO_MAPS: string
  readonly VITE_API_ENDPOINT_INFO_MAPS_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
