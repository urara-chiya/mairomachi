<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useMessage } from 'naive-ui'

import AppFooter from '@renderer/components/AppFooter.vue'
import RecordPrBanner from '@renderer/components/RecordPrBanner.vue'
import RecordPlayerHeader from '@renderer/components/RecordPlayerHeader.vue'
import RecordStatCards from '@renderer/components/RecordStatCards.vue'
import type { RecordStatsResponse, ShipInfoDetail } from '@shared/types'
import RecordShipStatHeader from '@renderer/components/RecordShipStatHeader.vue'
import ShipNameCard from '@renderer/components/ShipNameCard.vue'

const message = useMessage()

const props = defineProps<{
  stats: RecordStatsResponse | null
  shipInfoMap: Record<number, ShipInfoDetail>
  language: string
  playerName?: string
  clanTag?: string
  clanTagColor?: string
  realm?: string
  accountId?: number
  dateRange?: [number, number] | null
  shipFilterEnabled?: boolean
}>()

const captureRef = ref<HTMLElement | null>(null)
const isCapturing = ref(false)

async function copyToClipboard(): Promise<void> {
  if (!captureRef.value) return
  isCapturing.value = true
  try {
    const rect = captureRef.value.getBoundingClientRect()
    const success = await window.ipc.clipboard.captureAndWrite({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    })
    if (success) {
      message.success('截图已保存到剪切板')
    } else {
      message.error('保存到剪切板失败')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    message.error(`截图生成失败: ${msg}`)
    console.error(err)
  } finally {
    isCapturing.value = false
  }
}

function getShipName(shipId: string): string {
  const id = Number(shipId)
  const info = props.shipInfoMap[id]
  return info?.names?.[props.language as keyof typeof info.names] ?? info?.names?.['zh-cn'] ?? `Ship ${shipId}`
}

function getShipInfo(shipId: string): ShipInfoDetail | undefined {
  return props.shipInfoMap[Number(shipId)]
}

const filterInfoText = computed(() => {
  const parts: string[] = []
  if (props.shipFilterEnabled) {
    parts.push('启用船只筛选')
  }
  if (props.dateRange) {
    const start = new Date(props.dateRange[0])
    const end = new Date(props.dateRange[1])
    const fmt = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    parts.push(`数据统计区间: ${fmt(start)} ~ ${fmt(end)} (UTC+8)`)
  } else {
    parts.push('数据统计区间: 全部')
  }
  return parts.join(' | ')
})

defineExpose({
  copyToClipboard,
  isCapturing
})
</script>

<template>
  <div ref="captureRef">
    <n-card class="record-export-page" :bordered="false" embedded>
      <!-- 玩家信息头 -->
      <record-player-header
        style="margin-bottom: 12px"
        :player-name="playerName || '未知玩家'"
        :clan-tag="clanTag"
        :clan-tag-color="clanTagColor"
        :realm="realm"
        :account-id="accountId" />

      <!-- PR 横幅 -->
      <record-pr-banner
        :pr-tag="stats?.overallPr?.tag"
        :pr-value="stats?.overallPr?.value"
        :pr-color="stats?.overallPr?.color"
        style="margin: 16px 0" />

      <!-- 总统计卡片 -->
      <record-stat-cards :stats="stats" style="margin-bottom: 12px" />

      <!-- 单船数据 -->
      <record-ship-stat-header :filter-info="filterInfoText" style="margin-bottom: 8px" />
      <n-table :bordered="false" :bottom-bordered="true" size="small" class="ship-table">
        <thead>
          <tr>
            <th style="width: 160px">舰船</th>
            <th>场次</th>
            <th>PR</th>
            <th>胜率</th>
            <th>伤害</th>
            <th>击杀</th>
            <th>经验</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ship in stats?.shipStats" :key="ship.shipId">
            <td>
              <ship-name-card
                mode="contour"
                :reverse="false"
                :tier="getShipInfo(ship.shipId)?.tier ?? '0'"
                :type="getShipInfo(ship.shipId)?.type ?? 'Unknown'"
                :name="getShipName(ship.shipId)"
                :contour-image="getShipInfo(ship.shipId)?.images?.contour" />
            </td>
            <td>{{ ship.battles }}</td>
            <td :style="{ color: ship.pr?.color }">
              {{ ship.pr?.value ?? 0 }}
            </td>
            <td :style="{ color: ship.winRate?.color }">{{ ship.winRate?.value ?? 0 }}%</td>
            <td :style="{ color: ship.avgDamage?.color }">
              {{ ship.avgDamage?.value ?? 0 }}
            </td>
            <td :style="{ color: ship.avgFrags?.color }">{{ ship.avgFrags?.value ?? 0 }}</td>
            <td :style="{ color: ship.avgExp?.color }">{{ ship.avgExp?.value ?? 0 }}</td>
          </tr>
          <tr v-if="!stats?.shipStats?.length">
            <td colspan="7">
              <n-text depth="3">暂无数据</n-text>
            </td>
          </tr>
        </tbody>
      </n-table>

      <!-- Footer -->
      <app-footer style="margin-top: 12px" />
    </n-card>
  </div>
</template>

<style scoped>
.ship-table :deep(th) {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.ship-table :deep(td) {
  font-size: 13px;
  text-align: center;
  font-weight: 600;
}
</style>
