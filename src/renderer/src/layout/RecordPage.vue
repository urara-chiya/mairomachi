<script lang="ts" setup>
import { computed, CSSProperties, onMounted, onUnmounted, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { CloseOutlined, ExportOutlined, ImportOutlined } from '@vicons/antd'
import { useAsync } from '@renderer/composables/useAsync'
import type { BattleRecord, RecordStatsResponse, ShipInfoDetail, ShipLanguageKey } from '@shared/types'
import RecordDetailPage from '@renderer/layout/RecordDetailPage.vue'
import RecordCard from '@renderer/components/RecordCard.vue'
import RecordTrendLineChart from '@renderer/components/charts/RecordTrendLineChart.vue'
import RecordExportPage from '@renderer/layout/RecordExportPage.vue'
import RecordStatCards from '@renderer/components/RecordStatCards.vue'
import { formatDate, getResultTagType, getResultText } from '@renderer/utils/format'
import { getSelfPlayer } from '@renderer/utils/record'
import { getDayRange, getGameDayStart, formatShortDate } from '@renderer/utils/date'
import { getMapName, initMapInfo } from '@renderer/composables/useMapInfo'
import useSwitch from '@renderer/composables/useSwitch'

/** 共享的 SelfPlayer 数据结构 */
interface SelfPlayer {
  recordId: string
  shipId: number
  damage: number
  frags: number
  exp: number
}

defineOptions({ inheritAttrs: false })

const message = useMessage()

const records = ref<BattleRecord[]>([])
const selectedRecord = ref<BattleRecord | null>(null)
const showDetail = ref(false)
const exportPageRef = ref<InstanceType<typeof RecordExportPage> | null>(null)
const shipNameLanguage = ref<ShipLanguageKey>('zh-cn')
const allyUI = ref<'ltr' | 'rtl'>('ltr')
const enemyUI = ref<'ltr' | 'rtl'>('rtl')
const hidePlayerId = ref(false)
const stats = ref<RecordStatsResponse | null>(null)
const shipInfoMap = ref<Record<number, ShipInfoDetail>>({})
const dailyStats = ref<{
  winRate: { date: string; value: number }[]
  avgDamage: { date: string; value: number }[]
  pr: { date: string; value: number }[]
}>({ winRate: [], avgDamage: [], pr: [] })

const { isOpen: exportModalShow, open: handleExportOpen, close: handleExportClose } = useSwitch()
/** 导出用玩家信息 */
const exportPlayerInfo = computed(() => {
  const firstRecord = filteredRecords.value[0]
  if (!firstRecord) return { name: '', clanTag: '', clanTagColor: '', realm: '', accountId: 0 }
  const self = getSelfPlayer(firstRecord)
  return {
    name: self?.name ?? '',
    clanTag: self?.clanTag ?? '',
    clanTagColor: self?.clanTagColor ?? '',
    realm: firstRecord.realm ?? '',
    accountId: self?.accountId ?? 0
  }
})

// 筛选条件
const filterShipId = ref<number | null>(null)
const filterDateRange = ref<[number, number] | null>(null)

/** 从全部 records 提取的 SelfPlayer 列表 */
const selfPlayers = computed<SelfPlayer[]>(() => {
  const list: SelfPlayer[] = []
  for (const r of records.value) {
    const self = getSelfPlayer(r)
    if (!self) continue
    list.push({
      recordId: r.id,
      shipId: self.shipId,
      damage: self.damage,
      frags: self.frags,
      exp: self.exp
    })
  }
  return list
})

/** 船只筛选下拉选项（从全部记录动态计算） */
const shipOptions = computed(() => {
  const ids = new Set(selfPlayers.value.map((p) => p.shipId))
  const options = Array.from(ids).map((id) => {
    const shipInfo = shipInfoMap.value[id]
    const name = shipInfo?.names?.[shipNameLanguage.value] ?? shipInfo?.names?.['zh-cn'] ?? `Ship ${id}`
    return { label: name, value: id }
  })
  options.sort((a, b) => a.label.localeCompare(b.label))
  return options
})

/** 过滤后的记录 */
const filteredRecords = computed(() => {
  return records.value.filter((r) => {
    const self = getSelfPlayer(r)
    if (filterShipId.value != null && self?.shipId !== filterShipId.value) {
      return false
    }
    if (filterDateRange.value) {
      const dt = new Date(r.dateTime).getTime()
      if (dt < filterDateRange.value[0] || dt > filterDateRange.value[1]) {
        return false
      }
    }
    return true
  })
})

const {
  execute: loadRecordConfig,
  data: recordConfig,
  loading: isLoadingRecordConfig
} = useAsync({
  fn: async () => {
    const config = await window.ipc.settings.load()
    return {
      gamePath: config.arenaMonitor?.gamePath ?? '',
      enableAutoRecord: config.record?.enableAutoRecord ?? false
    }
  }
})

const isRecordReady = computed(() => {
  if (isLoadingRecordConfig.value) return false
  return !!recordConfig.value?.gamePath && recordConfig.value?.enableAutoRecord
})

const { execute: loadRecords, loading: isLoading } = useAsync({
  fn: async () => {
    const list = await window.ipc.record.list()
    records.value = list

    const shipIds = new Set(selfPlayers.value.map((p) => p.shipId))
    if (shipIds.size > 0) {
      const infos = await window.ipc.ship.getByIds(Array.from(shipIds))
      shipInfoMap.value = Object.fromEntries(Object.entries(infos).map(([k, v]) => [Number(k), v]))
    }

    return list
  },
  onError: () => {
    message.error('加载对局记录失败>_<')
  }
})

const { execute: loadStats, loading: isLoadingStats } = useAsync({
  fn: async () => {
    const selfRecords = filteredRecords.value
      .map((record) => {
        const self = getSelfPlayer(record)
        if (!self) return null
        const matchResult = record.matchResult?.result
        let wins: number
        if (matchResult === 'draw') {
          wins = 50
        } else if (matchResult === 'win') {
          wins = 100
        } else {
          wins = 0
        }
        return {
          shipId: self.shipId,
          damage: self.damage,
          frags: self.frags,
          exp: self.exp,
          wins
        }
      })
      .filter((r): r is NonNullable<typeof r> => r != null)
    if (selfRecords.length === 0) {
      stats.value = null
      return
    }
    stats.value = await window.ipc.record.getStats(selfRecords)
  },
  onError: () => {
    message.error('加载战绩统计失败>_<')
  }
})

const { execute: loadDailyStats, loading: isLoadingDailyStats } = useAsync({
  fn: async () => {
    // 只按船只筛选，不按日期筛选（侧栏展示趋势不受日期筛选影响）
    const shipFiltered = records.value.filter((r) => {
      const self = getSelfPlayer(r)
      return !(filterShipId.value != null && self?.shipId !== filterShipId.value)
    })

    // 按游戏日(04:00分割)分组
    const groups = new Map<number, BattleRecord[]>()
    for (const r of shipFiltered) {
      const dayStart = getGameDayStart(new Date(r.dateTime).getTime())
      if (!groups.has(dayStart)) groups.set(dayStart, [])
      groups.get(dayStart)!.push(r)
    }

    // 构建最近7天的请求
    const todayStart = getGameDayStart(Date.now())
    const ONE_DAY = 24 * 60 * 60 * 1000
    const days: number[] = []
    for (let i = 6; i >= 0; i--) {
      days.push(todayStart - i * ONE_DAY)
    }

    const requests = days.map((day) => {
      const dayRecords = groups.get(day) ?? []
      const selfRecords = dayRecords
        .map((record) => {
          const self = getSelfPlayer(record)
          if (!self) return null
          const matchResult = record.matchResult?.result
          let wins: number
          if (matchResult === 'draw') {
            wins = 50
          } else if (matchResult === 'win') {
            wins = 100
          } else {
            wins = 0
          }
          return { shipId: self.shipId, damage: self.damage, frags: self.frags, exp: self.exp, wins }
        })
        .filter((r): r is NonNullable<typeof r> => r != null)
      return { records: selfRecords }
    })

    const responses = await window.ipc.record.getStatsBatch(requests)

    dailyStats.value = {
      winRate: days.map((day, i) => ({
        date: formatShortDate(day),
        value: responses[i]?.winRate?.value ?? 0
      })),
      avgDamage: days.map((day, i) => ({
        date: formatShortDate(day),
        value: responses[i]?.avgDamage?.value ?? 0
      })),
      pr: days.map((day, i) => ({
        date: formatShortDate(day),
        value: responses[i]?.overallPr?.value ?? 0
      }))
    }
  },
  onError: () => {
    message.error('加载趋势数据失败>_<')
  }
})

// 筛选条件变化时自动重新计算 stats 和趋势
watch([filterShipId, filterDateRange], () => {
  loadStats()
})

watch(filterShipId, () => {
  loadDailyStats()
})

const { execute: deleteRecordById } = useAsync({
  fn: async (id: string) => {
    await window.ipc.record.delete(id)
    await loadRecords()
    await loadStats()
    await loadDailyStats()
  },
  onSuccess: () => {
    message.success('记录已删除')
  },
  onError: () => {
    message.error('删除记录失败>_<')
  }
})

/** 手动导入 replay 文件 */
const { execute: importReplay, loading: isImporting } = useAsync({
  fn: async () => {
    const filePath = await window.ipc.explorer.selectReplayFile()
    if (!filePath) return

    const config = await window.ipc.settings.load()
    const realm = config.arenaMonitor?.realm ?? 'ASIA'

    const record = await window.ipc.record.parseFile({ filePath, realm })
    if (record) {
      message.success('对局记录导入成功')
      await loadRecords()
      await loadStats()
      await loadDailyStats()
    }
  },
  onError: (err) => {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('已被导入过')) {
      message.warning('该 replay 文件已被导入过')
    } else {
      message.error('导入失败>_<')
    }
  }
})

const openDetail = (record: BattleRecord): void => {
  selectedRecord.value = record
  showDetail.value = true
}

let unsubscribeSettings: (() => void) | null = null

onMounted(async () => {
  await loadRecordConfig()
  const config = await window.ipc.settings.load()
  shipNameLanguage.value = config.ui.shipNameLanguage
  allyUI.value = config.ui.allyUI
  enemyUI.value = config.ui.enemyUI
  hidePlayerId.value = config.ui.hidePlayerId
  await initMapInfo()
  await loadRecords()
  await loadStats()
  await loadDailyStats()

  unsubscribeSettings = window.ipc.settings.onChanged((cfg) => {
    if (recordConfig.value) {
      recordConfig.value.enableAutoRecord = cfg.record.enableAutoRecord
    }
    shipNameLanguage.value = cfg.ui.shipNameLanguage
    allyUI.value = cfg.ui.allyUI
    enemyUI.value = cfg.ui.enemyUI
    hidePlayerId.value = cfg.ui.hidePlayerId
  })
})

onUnmounted(() => {
  unsubscribeSettings?.()
})

const recordPageContentStyle: CSSProperties = {
  height: '100%',
  width: '100%'
}
const recordFilterWrapperContentStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  flexWrap: 'nowrap'
}

const dateShortcutsConfig = [
  {
    label: '今天',
    range: () => getDayRange()
  },
  {
    label: '最近3天',
    range: () => getDayRange(2)
  },
  {
    label: '最近7天',
    range: () => getDayRange(6)
  },
  {
    label: '最近30天',
    range: () => getDayRange(29)
  },
  {
    label: '本月',
    range: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1
      return [start, end]
    }
  }
]
const dateShortcuts = computed(() => {
  const shortcuts = {}
  dateShortcutsConfig.filter((cfg) => {
    shortcuts[cfg.label] = cfg.range
  })
  return shortcuts
})
</script>

<template>
  <n-spin
    :show="isLoading || isLoadingStats || isImporting || isLoadingDailyStats"
    class="record-page"
    :content-style="recordPageContentStyle"
    description="正在加载记录...">
    <template #default>
      <n-flex v-if="!isRecordReady" align="center" class="empty-wrapper" justify="center">
        <n-empty description="请在“设置”中配置游戏路径并开启自动记录" size="large">
          <template #extra>
            <n-text depth="3">未检测到有效的对局记录配置</n-text>
          </template>
        </n-empty>
      </n-flex>
      <n-flex v-else-if="records.length <= 0" align="center" class="empty-wrapper" justify="center">
        <n-empty description="这里什么也没有。。。" size="large">
          <template #extra>
            <n-flex vertical align="center" :size="8">
              <n-text depth="3">自动保存的对局记录会显示在这里</n-text>
              <n-button secondary size="small" type="primary" @click="importReplay">
                <template #icon>
                  <n-icon :component="ImportOutlined" />
                </template>
                导入 Replay
              </n-button>
            </n-flex>
          </template>
        </n-empty>
      </n-flex>
      <template v-else>
        <div class="record-page-content">
          <!-- 统计栏 -->
          <record-stat-cards :stats="stats" />

          <!-- 筛选栏 -->
          <n-card
            class="record-filter-wrapper"
            :content-style="recordFilterWrapperContentStyle"
            embedded
            size="small"
            :bordered="false">
            <n-space :size="8">
              <n-select
                v-model:value="filterShipId"
                :options="shipOptions"
                placeholder="筛选船只"
                clearable
                size="small"
                style="width: 240px"
                :consistent-menu-width="false" />
              <n-date-picker
                v-model:value="filterDateRange"
                type="daterange"
                clearable
                size="small"
                style="width: 320px"
                :shortcuts="dateShortcuts" />
            </n-space>
            <n-space :size="8">
              <n-button secondary size="small" type="primary" @click="importReplay">
                <template #icon>
                  <n-icon :component="ImportOutlined" />
                </template>
                导入 Replay
              </n-button>
              <n-button secondary size="small" type="info" @click="handleExportOpen">
                <template #icon>
                  <n-icon><export-outlined /></n-icon>
                </template>
                导出统计
              </n-button>
            </n-space>
          </n-card>

          <!-- 列表 + 侧栏 -->
          <n-grid :x-gap="8" :cols="8">
            <n-grid-item :span="6">
              <n-card class="record-main-wrapper" size="small" content-scrollable :bordered="false">
                <n-alert
                  v-if="filteredRecords.length === 0"
                  :bordered="false"
                  :show-icon="true"
                  size="small"
                  type="warning"
                  style="width: 100%">
                  没有符合筛选条件的记录，请调整筛选条件
                </n-alert>
                <n-alert
                  v-else
                  :bordered="false"
                  :show-icon="true"
                  size="small"
                  type="info"
                  style="width: 100%; margin-bottom: 8px">
                  仅随机战（PvP）对局会被自动保存，其他模式（排位、军团战、剧情等）不会计入记录。
                </n-alert>
                <record-card
                  v-for="record in filteredRecords"
                  :key="record.id"
                  style="margin-bottom: 8px"
                  :language="shipNameLanguage"
                  :player="getSelfPlayer(record)"
                  :record="record"
                  :ship-info="shipInfoMap[getSelfPlayer(record)?.shipId ?? 0]"
                  @click="openDetail"
                  @delete="deleteRecordById" />
              </n-card>
            </n-grid-item>
            <n-grid-item :span="2">
              <n-card class="record-main-wrapper" size="small" content-scrollable :bordered="false">
                <record-trend-line-chart title="胜率" :data="dailyStats.winRate" color="#18a058" unit="%" />
                <record-trend-line-chart title="场均" :data="dailyStats.avgDamage" color="#f0a020" />
                <record-trend-line-chart title="PR" :data="dailyStats.pr" color="#2080f0" />
              </n-card>
            </n-grid-item>
          </n-grid>
        </div>
      </template>
      <n-drawer
        v-model:show="showDetail"
        :block-scroll="false"
        :mask-closable="true"
        :trap-focus="false"
        placement="right"
        width="100%">
        <n-drawer-content :native-scrollbar="false" class="record-detail-drawer" :body-content-style="{ padding: 0 }">
          <template #header>
            <n-flex align="center" justify="space-between" style="width: 100%">
              <n-flex align="center">
                <n-tag :type="getResultTagType(selectedRecord?.matchResult?.result)">
                  {{ getResultText(selectedRecord?.matchResult?.result) }}
                </n-tag>
                <n-text>{{
                  selectedRecord
                    ? getMapName(selectedRecord.mapId, selectedRecord.mapName, shipNameLanguage)
                    : '对局详情'
                }}</n-text>
              </n-flex>
              <n-flex align="center">
                <n-text depth="3" style="font-size: 14px">
                  {{ selectedRecord?.gameMode }} · {{ selectedRecord?.matchGroup }}
                </n-text>
                <n-text depth="3" style="font-size: 14px">
                  {{ selectedRecord ? formatDate(selectedRecord.dateTime) : '' }}
                </n-text>
                <n-button secondary size="small" type="tertiary" @click="showDetail = false">
                  <template #icon>
                    <close-outlined />
                  </template>
                </n-button>
              </n-flex>
            </n-flex>
          </template>
          <record-detail-page
            :ally-ui="allyUI"
            :enemy-ui="enemyUI"
            :hide-player-id="hidePlayerId"
            :language="shipNameLanguage"
            :record="selectedRecord"
            @close="showDetail = false" />
        </n-drawer-content>
      </n-drawer>

      <n-modal v-model:show="exportModalShow" style="width: 960px">
        <n-card title="战绩统计导出" size="small">
          <template #header-extra>
            <n-space>
              <n-button secondary size="small" type="primary" @click="exportPageRef?.copyToClipboard()">
                <template #icon>
                  <n-icon><export-outlined /></n-icon>
                </template>
                复制到剪切板
              </n-button>
              <n-button secondary size="small" type="tertiary" @click="handleExportClose">
                <template #icon>
                  <close-outlined />
                </template>
              </n-button>
            </n-space>
          </template>
          <record-export-page
            ref="exportPageRef"
            :stats="stats"
            :ship-info-map="shipInfoMap"
            :language="shipNameLanguage"
            :player-name="exportPlayerInfo.name"
            :clan-tag="exportPlayerInfo.clanTag"
            :clan-tag-color="exportPlayerInfo.clanTagColor"
            :realm="exportPlayerInfo.realm"
            :account-id="exportPlayerInfo.accountId"
            :date-range="filterDateRange"
            :ship-filter-enabled="filterShipId != null" />
        </n-card>
      </n-modal>
    </template>
  </n-spin>
</template>

<style scoped>
.record-page {
  width: 100%;
  height: 100%;
}

.empty-wrapper {
  width: 100%;
  height: 100%;
}

.record-page-content {
  height: 100%;
  width: 100%;
}

.record-filter-wrapper {
  width: 100%;
  height: var(--mr-record-filter-height);
  margin-bottom: var(--mr-sub-padding);
  flex-shrink: 0;
}

.record-main-wrapper {
  height: calc(
    100vh - var(--mr-header-height) - var(--mr-main-padding) * 2 - var(--mr-record-stat-height) -
      var(--mr-record-filter-height) - var(--mr-sub-padding) * 2
  );
}
</style>
