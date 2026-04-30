<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GraphicComponent, TitleComponent } from 'echarts/components'

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent, GraphicComponent, TitleComponent])

const props = defineProps<{
  data: { name: string; value: number; itemStyle?: { color: string } }[]
  title?: string
  limit?: number
}>()

const displayData = computed(() => {
  if (!props.limit || props.data.length <= props.limit) return props.data
  const top = props.data.slice(0, props.limit).map((d) => ({ ...d }))
  const others = props.data.slice(props.limit)
  const otherValue = others.reduce((sum, d) => sum + d.value, 0)
  return [...top, { name: '其他', value: otherValue }]
})

const total = computed(() => displayData.value.reduce((sum, d) => sum + d.value, 0))
const centerText = ref(String(total.value))

watch(total, (val) => {
  centerText.value = String(val)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onMouseOver(params: any): void {
  centerText.value = String(params.data?.value ?? 0)
}

function onMouseOut(): void {
  centerText.value = String(total.value)
}

const option = computed(() => ({
  title: {
    text: props.title ?? '',
    left: '24%',
    top: 4,
    textStyle: { color: '#aaa', fontSize: 12 }
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderColor: '#444',
    textStyle: { color: '#eee' },
    formatter: (params: { name: string; value: number; percent: number }) => {
      return `<div style="font-size:11px">${params.name}: ${params.value}场 (${params.percent}%)</div>`
    }
  },
  graphic: [
    {
      type: 'text',
      left: '32%',
      top: '46%',
      style: {
        text: centerText.value,
        textAlign: 'center',
        textVerticalAlign: 'middle',
        fill: '#eee',
        fontSize: 16,
        fontWeight: 'bold'
      }
    }
  ],
  legend: {
    type: 'scroll',
    orient: 'vertical',
    left: '70%',
    top: 'middle',
    textStyle: { color: '#aaa', fontSize: 12 },
    itemWidth: 11,
    itemHeight: 11,
    pageIconColor: '#aaa',
    pageTextStyle: { color: '#aaa' }
  },
  series: [
    {
      type: 'pie',
      radius: ['32%', '72%'],
      center: ['34%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4
      },
      label: {
        show: false
      },
      data: displayData.value
    }
  ]
}))
</script>

<template>
  <div class="pie-chart-wrapper">
    <v-chart :option="option" autoresize class="pie-chart" @mouseover="onMouseOver" @mouseout="onMouseOut" />
  </div>
</template>

<style scoped>
.pie-chart-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  width: 100%;
}
.pie-chart {
  width: 100%;
  flex: 1;
  min-height: 180px;
}
</style>
