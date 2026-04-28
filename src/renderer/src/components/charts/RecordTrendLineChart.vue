<script lang="ts" setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, TooltipComponent, GridComponent])

const props = defineProps<{
  title: string
  data: { date: string; value: number }[]
  color: string
  unit?: string
}>()

const option = computed(() => ({
  color: [props.color],
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderColor: '#444',
    textStyle: { color: '#eee' },
    formatter: (params: Array<{ axisValue: string; value: number; color: string }>) => {
      const p = params[0]
      const valueText = props.unit ? `${p.value}${props.unit}` : String(p.value)
      return (
        `<div style="font-size:12px;font-weight:600;margin-bottom:4px">${p.axisValue}</div>` +
        `<div style="display:flex;align-items:center;gap:6px">` +
        `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>` +
        `<span style="font-size:11px">${props.title}: ${valueText}</span>` +
        `</div>`
      )
    }
  },
  grid: {
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: props.data.map((d) => d.date),
    axisLine: { lineStyle: { color: '#555' } },
    axisLabel: { color: '#aaa', fontSize: 10 },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#333' } },
    axisLabel: { color: '#aaa', fontSize: 10 }
  },
  series: [
    {
      name: props.title,
      type: 'line',
      data: props.data.map((d) => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: props.color + '33' },
            { offset: 1, color: props.color + '05' }
          ]
        }
      }
    }
  ]
}))
</script>

<template>
  <div class="chart-wrapper">
    <div class="chart-title">
      <n-text depth="3">{{ title }}</n-text>
    </div>
    <v-chart :option="option" autoresize class="chart" />
  </div>
</template>

<style scoped>
.chart-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 200px;
  width: 100%;
}
.chart-title {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  flex-shrink: 0;
}
.chart {
  width: 100%;
  flex: 1;
  min-height: 200px;
}
</style>
