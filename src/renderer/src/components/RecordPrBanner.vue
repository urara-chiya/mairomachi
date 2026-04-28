<script lang="ts" setup>
import { computed } from 'vue'
import { darken, lighten } from '@renderer/utils/color'

const props = defineProps<{
  prTag?: string
  prValue?: number
  prColor?: string
}>()

const gradientStyle = computed(() => {
  const base = props.prColor || '#888888'
  const left = darken(base, 0.5)
  const mid = base
  const right = lighten(base, 1)
  return {
    background: `linear-gradient(to right, ${left}, ${mid}, ${right})`,
    padding: '4px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
})
</script>

<template>
  <div :style="gradientStyle">
    <n-text class="record-pr-banner-font" style="font-size: 18px">{{ prTag || '未知' }}</n-text>
    <n-text class="record-pr-banner-font" style="font-size: 24px"> PR: {{ prValue ?? 0 }} </n-text>
  </div>
</template>

<style scoped>
.record-pr-banner-font {
  font-weight: 700;
  color: #fff;
}
</style>
