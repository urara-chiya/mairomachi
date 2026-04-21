<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import ArenaPlayerCard from '@renderer/components/ArenaPlayerCard.vue'
import type {
  ArenaInfoRequest,
  ArenaInfoResponse,
  ArenaPlayerInfo,
  FileArenaInfo,
  PlayerWithShipInfo,
  Realm,
  UIConfig
} from '@shared/types'
import { useAsync } from '@renderer/composables/useAsync'
import { useMessage } from 'naive-ui'
import { ReloadOutlined } from '@vicons/antd'
import ArenaChartsPanel from '@renderer/components/ArenaChartsPanel.vue'

const message = useMessage()

// 舰船类型优先级映射（卡片排序：CV 在最上方）
const SHIP_TYPE_PRIORITY: Record<string, number> = {
  AirCarrier: 5,
  Battleship: 4,
  Cruiser: 3,
  Destroyer: 2,
  Submarine: 1,
  Unknown: 0
}

// 获取舰船类型优先级
function getShipTypePriority(type: string | undefined): number {
  if (!type) return SHIP_TYPE_PRIORITY['Unknown']
  return SHIP_TYPE_PRIORITY[type] ?? SHIP_TYPE_PRIORITY['Unknown']
}

// 排序玩家列表（CV > BB > CA > DD > SS，等级降序，舰船 PR 降序）
function sortPlayers(players: PlayerWithShipInfo[]): PlayerWithShipInfo[] {
  return [...players].sort((a, b) => {
    const priorityA = getShipTypePriority(a.shipInfo?.type)
    const priorityB = getShipTypePriority(b.shipInfo?.type)
    if (priorityB !== priorityA) {
      return priorityB - priorityA
    }
    const tierA = parseInt(a.shipInfo?.tier || '-1') || 0
    const tierB = parseInt(b.shipInfo?.tier || '-1') || 0
    if (tierB !== tierA) {
      return tierB - tierA
    }
    const prA = a.ship?.pr?.value || 0
    const prB = b.ship?.pr?.value || 0
    return prB - prA
  })
}

/**
 * 加载并组装对局数据到 players
 */
async function loadArenaData(result: ArenaInfoResponse): Promise<void> {
  // 1. 收集所有需要的 shipId
  const shipIds = [...result.allies, ...result.enemies].map((p) => p.shipId)

  // 2. 获取舰船信息缓存
  const shipInfoMap = await window.ipc.ship.getByIds(shipIds)

  // 3. 组装 PlayerInfo
  const assemblePlayer = (player: ArenaPlayerInfo): PlayerWithShipInfo => {
    const shipInfo = shipInfoMap[player.shipId.toString()]
    return {
      ...player,
      shipInfo
    }
  }

  // 4. 组装并排序我方和敌方玩家
  const assembledAllies = result.allies.map(assemblePlayer)
  const assembledEnemies = result.enemies.map(assemblePlayer)

  // 5. 排序
  players.allies = sortPlayers(assembledAllies)
  players.enemies = sortPlayers(assembledEnemies)
}

const { execute: fetchArenaInfo, loading: isFetchingArena } = useAsync<ArenaInfoResponse | null, [ArenaInfoRequest]>({
  fn: async (info: ArenaInfoRequest) => {
    const result = await window.ipc.arena.fetchInfo(info)
    if (!result) {
      throw new Error('计算新对局数据失败')
    }
    return result
  },
  onSuccess: async (result) => {
    if (!result) return
    await loadArenaData(result)
  },
  onError: () => {
    message.error('计算新对局数据失败>_<')
  }
})

const {
  execute: loadMonitorConfig,
  data: monitorConfig,
  loading: isLoadingMonitorConfig
} = useAsync({
  fn: async () => {
    const config = await window.ipc.settings.load()
    return config.arenaMonitor
  }
})

const { execute: loadRecordConfig, data: recordConfig } = useAsync({
  fn: async () => {
    const config = await window.ipc.settings.load()
    return config.record
  }
})

const isMonitorReady = computed(() => {
  if (isLoadingMonitorConfig.value) return false
  const cfg = monitorConfig.value
  return !!cfg?.gamePath && cfg?.enableAutoMonitor
})

const uiConfig = reactive<UIConfig>({
  theme: 'dark',
  allyUI: 'ltr',
  enemyUI: 'rtl',
  shipNameLanguage: 'zh-cn'
})

const players = reactive<{
  allies: PlayerWithShipInfo[]
  enemies: PlayerWithShipInfo[]
}>({
  allies: [],
  enemies: []
})

// 使用 useAsync 加载UI配置
const { execute: loadUiConfig } = useAsync({
  fn: async () => {
    const { ui } = await window.ipc.settings.load()
    uiConfig.allyUI = ui.allyUI
    uiConfig.enemyUI = ui.enemyUI
    uiConfig.shipNameLanguage = ui.shipNameLanguage
    uiConfig.theme = ui.theme
    return ui
  },
  onError: () => {
    message.error('初始化配置失败了>_<')
  }
})

const arenaSource = ref<'none' | 'cached' | 'live'>('none')
const recordStatus = ref<'idle' | 'recording' | 'processing' | 'saved' | 'disabled'>('disabled')

const handleDetectNewArena = async (base: FileArenaInfo): Promise<void> => {
  // 确保配置已加载
  if (!monitorConfig.value) {
    await loadMonitorConfig()
  }

  arenaSource.value = 'live'
  const info: ArenaInfoRequest = {
    ...base,
    realm: (monitorConfig.value?.realm ?? 'ASIA') as Realm
  }
  await fetchArenaInfo(info)
}

const handleArenaEnded = async (): Promise<void> => {
  // 对局结束通知已由主进程推送，自动记录逻辑已迁移至 arena-monitor-service
}

const handleRecordStatus = (data: { status: 'idle' | 'recording' | 'processing' | 'saved' | 'disabled' }): void => {
  recordStatus.value = data.status
}

const isRefreshing = ref(false)

const handleRefreshArena = async (): Promise<void> => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  try {
    const arenaInfo = await window.ipc.arena.checkNow()
    if (arenaInfo) {
      await window.ipc.arena.clearCache()
      await handleDetectNewArena(arenaInfo)
    } else {
      message.info('没有新对局呢>_<')
    }
  } catch {
    message.error('刷新对局失败>_<')
  } finally {
    isRefreshing.value = false
  }
}

let unsubscribeSettings: (() => void) | null = null
let unsubscribeArenaDetected: (() => void) | null = null
let unsubscribeArenaEnded: (() => void) | null = null
let unsubscribeRecordStatus: (() => void) | null = null

onMounted(async () => {
  // 先加载监控配置，用于首屏状态判断
  await loadMonitorConfig()
  // 加载对局记录配置
  await loadRecordConfig()
  // 绑定对局数据处理器
  unsubscribeArenaDetected = window.ipc.arena.onDetected(handleDetectNewArena)
  unsubscribeArenaEnded = window.ipc.arena.onEnded(handleArenaEnded)
  unsubscribeRecordStatus = window.ipc.arena.onRecordStatus(handleRecordStatus)
  // 启动对局监听
  await window.ipc.arena.monitor.start()
  // 加载UI配置
  await loadUiConfig()

  // 如果没有检测到对局，尝试加载缓存的上一次对局数据
  if (players.allies.length === 0 && players.enemies.length === 0) {
    const cached = await window.ipc.arena.getCache()
    if (cached) {
      arenaSource.value = 'cached'
      await loadArenaData(cached)
    }
  }

  // 监听设置变更
  unsubscribeSettings = window.ipc.settings.onChanged((config) => {
    if (monitorConfig.value) {
      monitorConfig.value = config.arenaMonitor
    }
    if (recordConfig.value) {
      recordConfig.value = config.record
    }
    if (!config.record.enableAutoRecord) {
      recordStatus.value = 'disabled'
    } else if (recordStatus.value === 'disabled') {
      recordStatus.value = 'idle'
    }
    uiConfig.allyUI = config.ui.allyUI
    uiConfig.enemyUI = config.ui.enemyUI
    uiConfig.shipNameLanguage = config.ui.shipNameLanguage
    uiConfig.theme = config.ui.theme
  })
})

onUnmounted(async () => {
  unsubscribeSettings?.()
  unsubscribeArenaDetected?.()
  unsubscribeArenaEnded?.()
  unsubscribeRecordStatus?.()
  await window.ipc.arena.monitor.stop()
})

// ==================== 状态栏 ====================
const sourceInfo = computed(() => {
  switch (arenaSource.value) {
    case 'live':
      return { label: '新对局', color: '#18a058' }
    case 'cached':
      return { label: '缓存对局', color: '#f0a020' }
    default:
      return { label: '等待对局', color: '#888' }
  }
})

const recordInfo = computed(() => {
  switch (recordStatus.value) {
    case 'recording':
      return { label: '对局记录中', color: '#d03050', blink: true }
    case 'processing':
      return { label: '对局解析中', color: '#f0a020', blink: true }
    case 'saved':
      return { label: '对局记录完成', color: '#18a058', blink: false }
    case 'disabled':
      return { label: '自动记录未开启', color: '#888', blink: false }
    default:
      return { label: '等待对局', color: '#888', blink: false }
  }
})
</script>

<template>
  <n-spin :show="isFetchingArena" class="arena-monitor-page" description="正在加载对局数据...">
    <template #default>
      <!-- 配置未就绪提示 -->
      <n-flex v-if="!isMonitorReady" align="center" justify="center" style="flex: 1">
        <n-empty description="请在“设置”中配置游戏路径并开启自动监控" size="large">
          <template #extra>
            <n-text depth="3">未检测到有效的对局监控配置</n-text>
          </template>
        </n-empty>
      </n-flex>

      <!-- 未检测到对局 -->
      <n-flex
        v-else-if="players.allies.length <= 0 && players.enemies.length <= 0"
        align="center"
        justify="center"
        style="flex: 1">
        <n-empty description="当前未检测到对局" size="large">
          <template #extra>
            <n-text depth="3">等待对局开始...</n-text>
          </template>
        </n-empty>
      </n-flex>

      <!-- 数据和图表 -->
      <template v-else>
        <!-- 状态栏 -->
        <n-flex :size="8" class="team-list-area">
          <n-card :bordered="false" class="player-card-wrapper" content-scrollable embedded size="small">
            <arena-player-card
              v-for="p in players.allies"
              :key="p.playerId"
              :direction="uiConfig.allyUI"
              :info="p"
              :language="uiConfig.shipNameLanguage"
              :ship-info="p.shipInfo" />
          </n-card>
          <n-card :bordered="false" class="player-card-wrapper" content-scrollable embedded size="small">
            <arena-player-card
              v-for="p in players.enemies"
              :key="p.playerId"
              :direction="uiConfig.enemyUI"
              :info="p"
              :language="uiConfig.shipNameLanguage"
              :ship-info="p.shipInfo" />
          </n-card>
          <n-flex vertical>
            <n-card :bordered="false" class="arena-status-bar" embedded size="small">
              <n-flex align="center" justify="space-between">
                <n-space size="small">
                  <span :style="{ backgroundColor: sourceInfo.color }" class="status-dot" />
                  <n-text depth="3" style="font-size: 12px">{{ sourceInfo.label }}</n-text>
                </n-space>
                <n-space size="small">
                  <span
                    :class="{ 'status-blink': recordInfo.blink }"
                    :style="{ backgroundColor: recordInfo.color }"
                    class="status-dot" />
                  <n-text depth="3" style="font-size: 12px">{{ recordInfo.label }}</n-text>
                </n-space>
                <n-button
                  :disabled="!isMonitorReady"
                  :loading="isRefreshing"
                  quaternary
                  size="tiny"
                  @click="handleRefreshArena">
                  <template #icon>
                    <n-icon><reload-outlined /></n-icon>
                  </template>
                  刷新对局
                </n-button>
              </n-flex>
            </n-card>
            <n-card :bordered="false" class="chart-area" content-scrollable embedded size="small">
              <arena-charts-panel
                :allies="players.allies"
                :enemies="players.enemies"
                :language="uiConfig.shipNameLanguage" />
            </n-card>
          </n-flex>
        </n-flex>
      </template>
    </template>
  </n-spin>
</template>

<style scoped>
.arena-monitor-page {
  display: flex;
  width: 100%;
  height: 100%;
}

:deep(.n-spin-content) {
  display: flex;
  width: 100%;
  height: 100%;
}

.team-list-area {
  padding: 8px;
  flex: 1;
}

.player-card-wrapper {
  height: 100%;
  flex: 1;
}

.player-card-wrapper :deep(.n-card-content) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-area {
  width: 420px;
  height: 100%;
}

.chart-area :deep(.n-card-content) {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.arena-status-bar {
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-blink {
  animation: statusBlink 1.2s ease-in-out infinite;
}

@keyframes statusBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
