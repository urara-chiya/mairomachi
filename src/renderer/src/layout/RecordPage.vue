<script lang="ts" setup>
import { computed, CSSProperties, onMounted, onUnmounted, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { CloseOutlined, ImportOutlined } from '@vicons/antd'
import { useAsync } from '@renderer/composables/useAsync'
import type { BattleRecord, RecordStatsResponse, ShipInfoDetail, ShipLanguageKey } from '@shared/types'
import RecordDetailPage from '@renderer/layout/RecordDetailPage.vue'
import RecordCard from '@renderer/components/RecordCard.vue'
import { formatDate, getResultTagType, getResultText } from '@renderer/utils/format'
import { getSelfPlayer } from '@renderer/utils/record'
import { getDayRange } from '@renderer/utils/date'

/** 共享的 SelfPlayer 数据结构 */
interface SelfPlayer {
  recordId: string
  shipId: number
  damage: number
  frags: number
  rawExp: number
}

defineOptions({ inheritAttrs: false })

const message = useMessage()

const records = ref<BattleRecord[]>([])
const selectedRecord = ref<BattleRecord | null>(null)
const showDetail = ref(false)
const shipNameLanguage = ref<ShipLanguageKey>('zh-cn')
const allyUI = ref<'ltr' | 'rtl'>('ltr')
const enemyUI = ref<'ltr' | 'rtl'>('rtl')
const hidePlayerId = ref(false)
const stats = ref<RecordStatsResponse | null>(null)
const shipInfoMap = ref<Record<number, ShipInfoDetail>>({})

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
      rawExp: self.rawExp
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

/** 统计栏基于过滤后的记录 */
const totalCount = computed(() => filteredRecords.value.length)
const winCount = computed(() => filteredRecords.value.filter((r) => r.matchResult?.result === 'win').length)
const lossCount = computed(() => filteredRecords.value.filter((r) => r.matchResult?.result === 'loss').length)

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
        const winningTeam = record.matchResult?.teamId
        let wins: number
        if (matchResult === 'draw') {
          wins = 50
        } else if (winningTeam != null) {
          wins = self.teamId === winningTeam ? 100 : 0
        } else {
          wins = 50
        }
        return {
          shipId: self.shipId,
          damage: self.damage,
          frags: self.frags,
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

// 筛选条件变化时自动重新计算 stats
watch([filterShipId, filterDateRange], () => {
  loadStats()
})

const { execute: deleteRecordById } = useAsync({
  fn: async (id: string) => {
    await window.ipc.record.delete(id)
    await loadRecords()
    await loadStats()
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
  await loadRecords()
  await loadStats()

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
const wrapperCardContentStyle: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
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
    :show="isLoading || isLoadingStats || isImporting"
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
          <n-flex align="center" class="record-stat-wrapper" justify="space-between" :size="8">
            <n-card class="record-stat-card" size="small" title="总场次">
              <n-text class="stat-font" type="info">{{ totalCount }}</n-text>
            </n-card>
            <n-card class="record-stat-card" size="small" title="胜利">
              <n-text class="stat-font" type="success">{{ winCount }}</n-text>
            </n-card>
            <n-card class="record-stat-card" size="small" title="失败">
              <n-text class="stat-font" type="error">{{ lossCount }}</n-text>
            </n-card>
            <n-card class="record-stat-card" size="small" title="胜率">
              <n-text :style="{ color: stats?.winRate?.color }" class="stat-font">
                {{ stats?.winRate?.value ?? 0 }}%
              </n-text>
            </n-card>
            <n-card class="record-stat-card" size="small" title="场均">
              <n-text :style="{ color: stats?.avgDamage?.color }" class="stat-font">{{
                stats?.avgDamage?.value ?? 0
              }}</n-text>
            </n-card>
            <n-card class="record-stat-card" size="small" title="PR">
              <n-text :style="{ color: stats?.overallPr?.color }" class="stat-font">{{
                stats?.overallPr?.value ?? 0
              }}</n-text>
            </n-card>
          </n-flex>

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
            <n-button secondary size="small" type="primary" @click="importReplay">
              <template #icon>
                <n-icon :component="ImportOutlined" />
              </template>
              导入 Replay
            </n-button>
          </n-card>

          <!-- 记录列表 -->
          <n-card
            class="record-list-wrapper"
            :content-style="wrapperCardContentStyle"
            size="small"
            content-scrollable
            :bordered="false">
            <n-alert
              v-if="filteredRecords.length === 0"
              :bordered="false"
              :show-icon="true"
              size="small"
              type="warning"
              style="width: 100%">
              没有符合筛选条件的记录，请调整筛选条件
            </n-alert>
            <n-alert v-else :bordered="false" :show-icon="true" size="small" type="info" style="width: 100%">
              仅随机战（PvP）对局会被自动保存，其他模式（排位、军团战、剧情等）不会计入记录。
            </n-alert>
            <record-card
              v-for="record in filteredRecords"
              :key="record.id"
              :language="shipNameLanguage"
              :player="getSelfPlayer(record)"
              :record="record"
              :ship-info="shipInfoMap[getSelfPlayer(record)?.shipId ?? 0]"
              @click="openDetail"
              @delete="deleteRecordById" />
          </n-card>
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
                <n-text>{{ selectedRecord?.mapName || '对局详情' }}</n-text>
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

.record-stat-wrapper {
  width: 100%;
  height: var(--mr-record-stat-height);
  margin-bottom: var(--mr-sub-padding);
}

.record-stat-card {
  height: 100%;
  display: flex;
  flex: 1;
}

.record-filter-wrapper {
  width: 100%;
  height: var(--mr-record-filter-height);
  margin-bottom: var(--mr-sub-padding);
  flex-shrink: 0;
}

.record-list-wrapper {
  height: calc(
    100vh - var(--mr-header-height) - var(--mr-main-padding) * 2 - var(--mr-record-stat-height) -
      var(--mr-record-filter-height) - var(--mr-sub-padding) * 2
  );
}

.stat-font {
  font-size: 24px;
  font-weight: 600;
}
</style>
