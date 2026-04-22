<script lang="ts" setup>
import { computed } from 'vue'
import type { PlayerWithShipInfo, ShipLanguageKey } from '@shared/types'
import { getShipName } from '@renderer/utils/ship'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, MarkAreaComponent, TooltipComponent } from 'echarts/components'
import { COMMON_COLORS, LEGEND_BOTTOM, TOOLTIP_DARK } from './shared'

use([CanvasRenderer, LineChart, TooltipComponent, LegendComponent, GridComponent, MarkAreaComponent])

const props = defineProps<{
  allies: PlayerWithShipInfo[]
  enemies: PlayerWithShipInfo[]
  language: ShipLanguageKey
}>()

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const LINE_SHIP_TYPE_PRIORITY: Record<string, number> = {
  Submarine: 1,
  Destroyer: 2,
  Cruiser: 3,
  Battleship: 4,
  AirCarrier: 5,
  Unknown: 99
}

const SHIP_TYPE_LABEL: Record<string, string> = {
  Submarine: '潜艇',
  Destroyer: '驱逐',
  Cruiser: '巡洋',
  Battleship: '战列',
  AirCarrier: '航母',
  Unknown: '未知'
}

const sortForLine = (players: PlayerWithShipInfo[]): PlayerWithShipInfo[] => {
  return [...players].sort((a, b) => {
    const pA = LINE_SHIP_TYPE_PRIORITY[a.shipInfo?.type ?? 'Unknown'] ?? 99
    const pB = LINE_SHIP_TYPE_PRIORITY[b.shipInfo?.type ?? 'Unknown'] ?? 99
    if (pA !== pB) return pA - pB
    const tA = parseInt(a.shipInfo?.tier || '-1') || 0
    const tB = parseInt(b.shipInfo?.tier || '-1') || 0
    if (tA !== tB) return tA - tB
    return (a.ship?.pr?.value ?? 0) - (b.ship?.pr?.value ?? 0)
  })
}

function calcTypeAreas(players: PlayerWithShipInfo[]): {
  xAxis: string
  label?: { formatter: string; position: string; color: string; fontSize: number }
}[][] {
  const areas: {
    xAxis: string
    label?: { formatter: string; position: string; color: string; fontSize: number }
  }[][] = []
  if (players.length === 0) return areas

  let start = 0
  let currentType = players[0].shipInfo?.type ?? 'Unknown'

  for (let i = 1; i <= players.length; i++) {
    const type = players[i]?.shipInfo?.type ?? 'Unknown'
    if (type !== currentType || i === players.length) {
      areas.push([
        {
          xAxis: `${start + 1}`,
          label: {
            formatter: SHIP_TYPE_LABEL[currentType] ?? currentType,
            position: 'top',
            color: '#888',
            fontSize: 10
          }
        },
        { xAxis: `${i}` }
      ])
      currentType = type
      start = i
    }
  }
  return areas
}

const option = computed(() => {
  const maxLen = Math.max(props.allies.length, props.enemies.length)
  const allySorted = sortForLine(props.allies)
  const enemySorted = sortForLine(props.enemies)

  const xData = Array.from({ length: maxLen }, (_, i) => `${i + 1}`)
  const allyData: (number | null)[] = Array(maxLen).fill(null)
  const enemyData: (number | null)[] = Array(maxLen).fill(null)

  allySorted.forEach((p, i) => {
    allyData[i] = p.ship?.pr?.value ?? 0
  })
  enemySorted.forEach((p, i) => {
    enemyData[i] = p.ship?.pr?.value ?? 0
  })

  return {
    color: COMMON_COLORS,
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP_DARK,
      formatter: (
        params: {
          axisValue?: string | number
          seriesName?: string
          color?: string
        }[]
      ) => {
        const idx = Number(params[0]?.axisValue) - 1
        let html = `<div style="font-size:12px;margin-bottom:4px">位置 ${params[0]?.axisValue}</div>`
        params.forEach((param) => {
          const isAlly = param.seriesName === '我方'
          const list = isAlly ? allySorted : enemySorted
          const player = list[idx]
          if (player) {
            html += `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">`
            html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${param.color}"></span>`
            html += `<span style="font-size:11px">${escapeHtml(player.playerName)} - ${escapeHtml(getShipName(player.shipInfo, props.language))} - PR ${Math.round(player.ship?.pr?.value ?? 0)}</span>`
            html += `</div>`
          }
        })
        return html
      }
    },
    legend: LEGEND_BOTTOM,
    grid: {
      top: 24,
      left: 44,
      right: 12,
      bottom: 24
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { show: false },
      axisLine: { lineStyle: { color: '#555' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '舰船 PR',
      nameTextStyle: { color: '#aaa', fontSize: 10, padding: [0, 0, 0, -30] },
      splitLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#aaa', fontSize: 10 }
    },
    series: [
      {
        name: '我方',
        type: 'line',
        data: allyData,
        smooth: false,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        markArea: {
          itemStyle: {
            color: 'rgba(255,255,255,0.02)'
          },
          data: calcTypeAreas(allySorted)
        }
      },
      {
        name: '敌方',
        type: 'line',
        data: enemyData,
        smooth: false,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        markArea: {
          itemStyle: {
            color: 'rgba(255,255,255,0.02)'
          },
          data: calcTypeAreas(enemySorted)
        }
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
