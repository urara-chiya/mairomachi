<script lang="ts" setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, TooltipComponent, LegendComponent, GridComponent])

interface SeriesData {
  name: string
  color: string
  data: { date: string; value: number }[]
  unit?: string
  min?: number
  max?: number
}

const props = defineProps<{
  leftSeries: SeriesData
  rightSeries: SeriesData
}>()

const dates = computed(() => props.leftSeries.data.map((d) => d.date))

const option = computed(() => ({
  color: [props.leftSeries.color, props.rightSeries.color],
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderColor: '#444',
    textStyle: { color: '#eee' },
    formatter: (params: Array<{ axisValue: string; seriesName: string; value: number; color: string }>) => {
      let html = `<div style="font-size:12px;font-weight:600;margin-bottom:4px">${params[0]?.axisValue ?? ''}</div>`
      for (const p of params) {
        const isRight = p.seriesName === props.rightSeries.name
        const unit = isRight ? (props.rightSeries.unit ?? '') : (props.leftSeries.unit ?? '')
        html += `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">`
        html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>`
        html += `<span style="font-size:11px">${p.seriesName}: ${p.value}${unit}</span>`
        html += `</div>`
      }
      return html
    }
  },
  legend: {
    data: [props.leftSeries.name, props.rightSeries.name],
    textStyle: { color: '#aaa', fontSize: 10 },
    itemWidth: 12,
    itemHeight: 8,
    top: 4
  },
  grid: {
    top: 32,
    left: 8,
    right: 8,
    bottom: 8,
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: dates.value,
    axisLine: { lineStyle: { color: '#555' } },
    axisLabel: { color: '#aaa', fontSize: 10 },
    axisTick: { show: false }
  },
  yAxis: [
    {
      type: 'value',
      name: props.leftSeries.name,
      position: 'left',
      min: props.leftSeries.min,
      max: props.leftSeries.max,
      nameTextStyle: { color: props.leftSeries.color, fontSize: 10, padding: [0, 0, 0, -24] },
      axisLabel: { color: props.leftSeries.color, fontSize: 9 },
      splitLine: { lineStyle: { color: '#333' } }
    },
    {
      type: 'value',
      name: props.rightSeries.name,
      position: 'right',
      min: props.rightSeries.min,
      max: props.rightSeries.max,
      nameTextStyle: { color: props.rightSeries.color, fontSize: 10, padding: [0, -24, 0, 0] },
      axisLabel: { color: props.rightSeries.color, fontSize: 9 },
      splitLine: { show: false }
    }
  ],
  series: [
    {
      name: props.leftSeries.name,
      type: 'line',
      yAxisIndex: 0,
      data: props.leftSeries.data.map((d) => d.value),
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
            { offset: 0, color: props.leftSeries.color + '33' },
            { offset: 1, color: props.leftSeries.color + '05' }
          ]
        }
      }
    },
    {
      name: props.rightSeries.name,
      type: 'line',
      yAxisIndex: 1,
      data: props.rightSeries.data.map((d) => d.value),
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
            { offset: 0, color: props.rightSeries.color + '33' },
            { offset: 1, color: props.rightSeries.color + '05' }
          ]
        }
      }
    }
  ]
}))
</script>

<template>
  <div class="chart-wrapper">
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
.chart {
  width: 100%;
  flex: 1;
  min-height: 200px;
}
</style>
