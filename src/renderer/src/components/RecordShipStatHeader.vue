<script lang="ts" setup>
defineProps<{
  filterInfo: string
}>()
</script>

<template>
  <n-flex justify="space-between" align="center" :size="0">
    <div class="record-ship-stat-header-content" style="flex: 1">
      <n-divider title-placement="left" style="margin: 0">
        <n-text strong>单船数据</n-text>
      </n-divider>
    </div>
    <div class="record-ship-stat-header-content" style="flex: 2">
      <n-divider title-placement="right" style="margin: 0">
        <n-text depth="3" style="font-size: 12px">{{ filterInfo }}</n-text>
      </n-divider>
    </div>
  </n-flex>
</template>

<style scoped>
.record-ship-stat-header-content {
  display: flex;
}
</style>
