<script lang="ts" setup>
import type { RecordStatsResponse } from '@shared/types'

defineProps<{
  stats: RecordStatsResponse | null
}>()
</script>

<template>
  <n-flex align="center" class="stat-wrapper" justify="space-between" :size="8">
    <n-card class="stat-card" size="small" title="总场次">
      <n-text class="stat-font" type="info">{{ stats?.totalBattles ?? 0 }}</n-text>
    </n-card>
    <n-card class="stat-card" size="small" title="胜率">
      <n-text :style="{ color: stats?.winRate?.color }" class="stat-font"> {{ stats?.winRate?.value ?? 0 }}% </n-text>
    </n-card>
    <n-card class="stat-card" size="small" title="场均">
      <n-text :style="{ color: stats?.avgDamage?.color }" class="stat-font">
        {{ stats?.avgDamage?.value ?? 0 }}
      </n-text>
    </n-card>
    <n-card class="stat-card" size="small" title="击杀">
      <n-text :style="{ color: stats?.avgFrags?.color }" class="stat-font">{{ stats?.avgFrags?.value ?? 0 }}</n-text>
    </n-card>
    <n-card class="stat-card" size="small" title="经验">
      <n-text :style="{ color: stats?.avgExp?.color }" class="stat-font">{{ stats?.avgExp?.value ?? 0 }}</n-text>
    </n-card>
    <n-card class="stat-card" size="small" title="PR">
      <n-text :style="{ color: stats?.overallPr?.color }" class="stat-font">
        {{ stats?.overallPr?.value ?? 0 }}
      </n-text>
    </n-card>
  </n-flex>
</template>

<style scoped>
.stat-wrapper {
  width: 100%;
  height: var(--mr-record-stat-height);
  margin-bottom: var(--mr-sub-padding);
}

.stat-card {
  height: 100%;
  display: flex;
  flex: 1;
}

.stat-font {
  font-size: 24px;
  font-weight: 600;
}
</style>
