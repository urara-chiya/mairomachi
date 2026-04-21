<script lang="ts" setup>
import type { ArenaPlayerStatItem } from '@shared/types'
import { computed } from 'vue'

const props = defineProps<{
  label: string
  stat: ArenaPlayerStatItem | undefined
  format?: (value: number) => string
}>()

// 计算显示值，优先使用传入的格式化函数，否则直接显示数值
const displayValue = computed(() => {
  if (!props.stat) {
    return '-'
  }
  if (props.format) {
    return props.format(props.stat.value)
  }
  return String(props.stat.value)
})
</script>

<template>
  <n-statistic :label="label" class="arena-player-stat">
    <n-text :style="stat ? { color: stat.color } : undefined">{{ displayValue }}</n-text>
  </n-statistic>
</template>

<style scoped>
.arena-player-stat {
  width: 48px;
}

.arena-player-stat :deep(.n-statistic__label) {
  text-align: center;
  font-size: 10px;
  height: 12px;
  line-height: 12px;
}

.arena-player-stat :deep(.n-statistic-value) {
  margin-top: 0;
  height: 16px;
  line-height: 16px;
  text-align: center;
}

.arena-player-stat :deep(.n-statistic-value__content) {
  font-size: 11px;
  font-weight: 600;
  height: 16px;
  line-height: 16px;
}
</style>
