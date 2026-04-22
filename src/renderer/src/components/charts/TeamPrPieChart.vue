<script lang="ts" setup>
import { computed } from 'vue'
import type { PlayerWithShipInfo } from '@shared/types'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent } from 'echarts/components'
import { TOOLTIP_DARK } from './shared'

use([CanvasRenderer, PieChart, TooltipComponent, TitleComponent])

const props = defineProps<{
  allies: PlayerWithShipInfo[]
  enemies: PlayerWithShipInfo[]
}>()

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

const option = computed(() => {
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
</script>

<template>
  <div class="pie-wrapper">
    <v-chart :option="option" autoresize class="chart" />
  </div>
</template>

<style scoped>
.pie-wrapper {
  min-height: 240px;
  width: 100%;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 240px;
}
</style>
