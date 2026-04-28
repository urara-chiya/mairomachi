<script lang="ts" setup>
defineProps<{
  playerName: string
  clanTag?: string
  clanTagColor?: string
  realm?: string
  accountId?: number
}>()
</script>

<template>
  <n-flex justify="space-between" align="center" :size="0">
    <div class="record-player-header-content" style="flex: 3">
      <n-divider title-placement="left" style="margin: 0">
        <n-text>
          <n-text v-if="clanTag" class="record-player-header-name" :style="{ color: clanTagColor }">
            [{{ clanTag }}]
          </n-text>
          <n-text class="record-player-header-name">{{ playerName }}</n-text>
        </n-text>
      </n-divider>
    </div>
    <div class="record-player-header-content" style="flex: 1">
      <n-divider title-placement="right" style="margin: 0">
        <n-text depth="3" style="font-size: 13px">
          <n-text v-if="realm" depth="3">{{ realm }}</n-text>
          <n-text v-if="accountId" depth="3"> · {{ accountId }}</n-text>
        </n-text>
      </n-divider>
    </div>
  </n-flex>
</template>

<style scoped>
.record-player-header-content {
  display: flex;
}

.record-player-header-name {
  font-size: 22px;
  font-weight: 700;
}
</style>
