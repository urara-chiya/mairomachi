<script lang="ts" setup>
import { computed } from 'vue'
import type { PlayerWithShipInfo } from '@shared/types'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import { LegendComponent, RadarComponent, TooltipComponent } from 'echarts/components'
import { avg, COMMON_COLORS, isHiddenStats, isZeroShipBattles, LEGEND_BOTTOM, TOOLTIP_DARK } from './shared'

use([CanvasRenderer, RadarChart, TooltipComponent, LegendComponent, RadarComponent])

const props = defineProps<{
  allies: PlayerWithShipInfo[]
  enemies: PlayerWithShipInfo[]
}>()

interface RadarStats {
  rpr: number
  ttRpr: number
  winRate: number
  shipPr: number
  shipTtRpr: number
  shipWinRate: number
}

function calcTeamRadarStats(players: PlayerWithShipInfo[]): RadarStats {
  const visible = players.filter((p) => !isHiddenStats(p))
  const shipVisible = visible.filter((p) => !isZeroShipBattles(p))
  return {
    rpr: avg(visible.map((p) => p.total!.rapidPr.value)),
    ttRpr: avg(visible.map((p) => p.totalAtTierType?.rapidPr.value ?? 0)),
    winRate: avg(visible.map((p) => p.total!.winRates.value)),
    shipPr: avg(shipVisible.map((p) => p.ship!.pr.value)),
    shipTtRpr: avg(shipVisible.map((p) => p.shipAtTierType?.rapidPr.value ?? 0)),
    shipWinRate: avg(shipVisible.map((p) => p.ship!.winRates.value))
  }
}

const dynamicMax = (a: number, e: number, min: number): number => {
  const m = Math.max(a, e, min)
  return Math.ceil(m * 1.2)
}

const option = computed(() => {
  const ally = props.allies
  const enemy = props.enemies
  if (!ally.length && !enemy.length) return {}

  const a = calcTeamRadarStats(ally)
  const e = calcTeamRadarStats(enemy)

  return {
    color: COMMON_COLORS,
    tooltip: {
      trigger: 'item',
      ...TOOLTIP_DARK
    },
    legend: LEGEND_BOTTOM,
    radar: {
      indicator: [
        { name: 'RPR', max: dynamicMax(a.rpr, e.rpr, 500) },
        { name: 'TT-RPR', max: dynamicMax(a.ttRpr, e.ttRpr, 500) },
        { name: '舰船 PR', max: dynamicMax(a.shipPr, e.shipPr, 500) },
        { name: '舰船 TT-RPR', max: dynamicMax(a.shipTtRpr, e.shipTtRpr, 500) },
        { name: '总胜率', max: dynamicMax(a.winRate, e.winRate, 20) },
        { name: '舰船胜率', max: dynamicMax(a.shipWinRate, e.shipWinRate, 20) }
      ],
      radius: '60%',
      alignTicks: false,
      axisTick: { show: false },
      splitArea: {
        areaStyle: {
          color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)']
        }
      },
      axisName: {
        color: '#aaa',
        fontSize: 10
      },
      splitLine: {
        lineStyle: { color: '#444' }
      },
      axisLine: {
        lineStyle: { color: '#444' }
      }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [a.rpr, a.ttRpr, a.shipPr, a.shipTtRpr, a.winRate, a.shipWinRate],
            name: '我方',
            areaStyle: { opacity: 0.2 }
          },
          {
            value: [e.rpr, e.ttRpr, e.shipPr, e.shipTtRpr, e.winRate, e.shipWinRate],
            name: '敌方',
            areaStyle: { opacity: 0.2 }
          }
        ]
      }
    ]
  }
})
</script>

<template>
  <div class="chart-wrapper">
    <v-chart :option="option" autoresize class="chart" />
  </div>
</template>

<style scoped>
.chart-wrapper {
  min-height: 240px;
  width: 100%;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 240px;
}
</style>
