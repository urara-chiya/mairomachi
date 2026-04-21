<script lang="ts" setup>
import { computed } from 'vue'
import type { PlayerWithShipInfo, ShipLanguageKey } from '@shared/types'
import { getShipName } from '@renderer/utils/ship'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, RadarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, RadarComponent, TitleComponent, TooltipComponent } from 'echarts/components'

use([
  CanvasRenderer,
  RadarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent
])

const props = defineProps<{
  allies: PlayerWithShipInfo[]
  enemies: PlayerWithShipInfo[]
  language: ShipLanguageKey
}>()

const isHiddenStats = (p: PlayerWithShipInfo): boolean => !p.total
const isZeroShipBattles = (p: PlayerWithShipInfo): boolean => !p.ship || p.ship.battles.value === 0

const avg = (arr: number[]): number => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ------------------------------------------------------------------------------
// 静态主题配置（不随数据变化，避免 computed 重复创建）
// ------------------------------------------------------------------------------

const COMMON_COLORS = ['#18a058', '#d03050']

const TOOLTIP_DARK = {
  backgroundColor: 'rgba(30,30,30,0.95)',
  borderColor: '#444',
  textStyle: { color: '#eee' }
}

const LEGEND_BOTTOM = {
  data: ['我方', '敌方'],
  bottom: 0,
  textStyle: { color: '#ccc' }
}

// ==================== 雷达图 ====================
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

const radarOption = computed(() => {
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

// ==================== 饼图 ====================
const buildPieData = (
  players: PlayerWithShipInfo[]
): {
  name: string
  value: number
  itemStyle: {
    color: string
    opacity: number
    borderColor: string
    borderWidth: number
  }
}[] => {
  const map = new Map<string, { value: number; color: string }>()
  for (const p of players) {
    const tag = p.ship?.pr.tag
    const color = p.ship?.pr.color
    if (!tag || !color) continue
    const existing = map.get(tag)
    if (existing) {
      existing.value++
    } else {
      map.set(tag, { value: 1, color })
    }
  }
  return Array.from(map.entries()).map(([name, item]) => ({
    name,
    value: item.value,
    itemStyle: {
      color: item.color,
      opacity: 0.7,
      borderColor: item.color,
      borderWidth: 2
    }
  }))
}

const pieOption = computed(() => {
  const allyData = buildPieData(props.allies)
  const enemyData = buildPieData(props.enemies)
  return {
    tooltip: {
      trigger: 'item',
      ...TOOLTIP_DARK
    },
    title: [
      {
        text: '我方',
        left: '25%',
        top: '78%',
        textAlign: 'center',
        textStyle: { color: '#aaa', fontSize: 11 }
      },
      {
        text: '敌方',
        left: '75%',
        top: '78%',
        textAlign: 'center',
        textStyle: { color: '#aaa', fontSize: 11 }
      }
    ],
    series: [
      {
        name: '我方',
        type: 'pie',
        radius: '55%',
        center: ['25%', '45%'],
        label: { show: false },
        data: allyData,
        tooltip: { formatter: '{b}: {c} ({d}%)' }
      },
      {
        name: '敌方',
        type: 'pie',
        radius: '55%',
        center: ['75%', '45%'],
        label: { show: false },
        data: enemyData,
        tooltip: { formatter: '{b}: {c} ({d}%)' }
      }
    ]
  }
})

// ==================== 折线图 ====================
const LINE_SHIP_TYPE_PRIORITY: Record<string, number> = {
  Submarine: 1,
  Destroyer: 2,
  Cruiser: 3,
  Battleship: 4,
  AirCarrier: 5,
  Unknown: 99
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

const lineOption = computed(() => {
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
        lineStyle: { width: 2 }
      },
      {
        name: '敌方',
        type: 'line',
        data: enemyData,
        smooth: false,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 }
      }
    ]
  }
})
</script>

<template>
  <n-flex :size="12" class="arena-charts-panel" vertical>
    <div class="chart-wrapper">
      <v-chart :option="radarOption" autoresize class="chart" />
    </div>
    <div class="chart-wrapper">
      <v-chart :option="lineOption" autoresize class="chart" />
    </div>
    <div class="pie-wrapper">
      <v-chart :option="pieOption" autoresize class="chart" />
    </div>
  </n-flex>
</template>

<style scoped>
.arena-charts-panel {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
.chart-wrapper {
  flex: 1;
  min-height: 240px;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.pie-wrapper {
  height: 240px;
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 240px;
}
</style>
