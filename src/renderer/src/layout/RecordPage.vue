<script lang="ts" setup>
import { computed, CSSProperties, onMounted, onUnmounted, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { CloseOutlined } from '@vicons/antd'
import { useAsync } from '@renderer/composables/useAsync'
import type {
  BattleRecord,
  RecordBatchPrResponse,
  RecordStatsResponse,
  ShipInfoDetail,
  ShipLanguageKey
} from '@shared/types'
import RecordDetailPage from '@renderer/layout/RecordDetailPage.vue'
import RecordCard from '@renderer/components/RecordCard.vue'
import { formatDate, getResultTagType, getResultText } from '@renderer/utils/format'
import { getSelfPlayer } from '@renderer/utils/record'

/** 共享的 SelfPlayer 数据结构 */
interface SelfPlayer {
  recordId: string
  shipId: number
  damage: number
  frags: number
  rawExp: number
  result: 'win' | 'loss' | 'draw' | undefined
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
const recordPrMap = ref<Record<string, RecordBatchPrResponse>>({})
const shipInfoMap = ref<Record<number, ShipInfoDetail>>({})

/** 从 records 提取的共享 SelfPlayer 列表，避免多次重复遍历 */
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
      rawExp: self.rawExp,
      result: r.matchResult?.result as 'win' | 'loss' | 'draw' | undefined
    })
  }
  return list
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

const { execute: loadBatchPr, loading: isLoadingBatchPr } = useAsync({
  fn: async () => {
    const players = selfPlayers.value
    const requests = players.map((self) => ({
      shipId: self.shipId,
      damage: self.damage,
      frags: self.frags,
      wins: self.result === 'win' ? 100 : self.result === 'loss' ? 0 : 50,
      rawExp: self.rawExp
    }))
    if (requests.length === 0) {
      recordPrMap.value = {}
      return
    }
    const result = await window.ipc.record.getBatchPr(requests)
    const map: Record<string, RecordBatchPrResponse> = {}
    result.forEach((item, idx) => {
      map[players[idx].recordId] = item
    })
    recordPrMap.value = map
  },
  onError: () => {
    message.error('加载记录颜色失败>_<')
  }
})

const totalCount = computed(() => records.value.length)
const winCount = computed(() => records.value.filter((r) => r.matchResult?.result === 'win').length)
const lossCount = computed(() => records.value.filter((r) => r.matchResult?.result === 'loss').length)

const { execute: loadStats, loading: isLoadingStats } = useAsync({
  fn: async () => {
    const selfRecords = selfPlayers.value.map((self) => ({
      shipId: self.shipId,
      damage: self.damage,
      frags: self.frags,
      wins: self.result === 'win' ? 100 : self.result === 'loss' ? 0 : 50
    }))
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

const { execute: deleteRecordById } = useAsync({
  fn: async (id: string) => {
    await window.ipc.record.delete(id)
    await loadRecords()
    await loadStats()
    await loadBatchPr()
  },
  onSuccess: () => {
    message.success('记录已删除')
  },
  onError: () => {
    message.error('删除记录失败>_<')
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
  await loadBatchPr()

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
</script>

<template>
  <n-spin
    :show="isLoading || isLoadingStats || isLoadingBatchPr"
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
            <n-text depth="3">自动保存的对局记录会显示在这里</n-text>
          </template>
        </n-empty>
      </n-flex>
      <template v-else>
        <div class="record-page-content">
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
              <n-text :style="{ color: stats?.winRateColor }" class="stat-font">{{ stats?.winRate ?? 0 }}%</n-text>
            </n-card>
            <n-card class="record-stat-card" size="small" title="场均">
              <n-text :style="{ color: stats?.avgDamageColor }" class="stat-font">{{ stats?.avgDamage ?? 0 }}</n-text>
            </n-card>
            <n-card class="record-stat-card" size="small" title="PR">
              <n-text :style="{ color: stats?.overallPrColor }" class="stat-font">{{ stats?.overallPr ?? 0 }}</n-text>
            </n-card>
          </n-flex>
          <n-card
            class="record-list-wrapper"
            :content-style="wrapperCardContentStyle"
            size="small"
            content-scrollable
            :bordered="false">
            <n-alert :bordered="false" :show-icon="true" size="small" type="info" style="width: 100%">
              仅随机战（PvP）对局会被自动保存，其他模式（排位、军团战、剧情等）不会计入记录。
            </n-alert>
            <record-card
              v-for="record in records"
              :key="record.id"
              :dmg="recordPrMap[record.id]?.dmg"
              :frags="recordPrMap[record.id]?.frags"
              :language="shipNameLanguage"
              :pr="recordPrMap[record.id]?.pr"
              :record="record"
              :ship-info="shipInfoMap[getSelfPlayer(record)?.shipId ?? 0]"
              :xp="recordPrMap[record.id]?.xp"
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

.record-list-wrapper {
  height: calc(
    100vh - var(--mr-header-height) - var(--mr-main-padding) * 2 - var(--mr-record-stat-height) - var(--mr-sub-padding)
  );
}

.stat-font {
  font-size: 24px;
  font-weight: 600;
}
</style>
