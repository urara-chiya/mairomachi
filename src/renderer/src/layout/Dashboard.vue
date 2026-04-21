<script setup lang="ts">
import type { PageChannelEmits } from '@renderer/composables/usePageChannel'
import AppFooter from '@renderer/components/AppFooter.vue'

const emit = defineEmits<PageChannelEmits>()

const handleExit = (): void => {
  window.ipc.window.close()
}
</script>

<template>
  <n-flex class="dashboard-page" justify="center" align="center" :size="36" vertical>
    <n-flex style="flex: 1" justify="center" align="end">
      <n-gradient-text strong style="font-size: 64px" type="warning"> 欢迎来到迷路町 </n-gradient-text>
    </n-flex>
    <n-flex style="flex: 2" justify="start" align="center" vertical wrap size="large">
      <n-button
        class="nav-btn"
        type="tertiary"
        ghost
        @click="() => emit('channel', { type: 'navigate', payload: 'arena-monitor' })">
        对局查看
      </n-button>
      <n-button
        class="nav-btn"
        type="tertiary"
        ghost
        @click="() => emit('channel', { type: 'navigate', payload: 'record' })">
        对局记录
      </n-button>
      <n-button
        class="nav-btn"
        type="tertiary"
        ghost
        @click="() => emit('channel', { type: 'navigate', payload: 'help' })">
        查看帮助
      </n-button>
      <n-button class="nav-btn" type="tertiary" ghost @click="handleExit"> 退出 </n-button>
    </n-flex>
    <app-footer />
  </n-flex>
</template>

<style scoped>
.dashboard-page {
  width: 100%;
  height: 100%;
}

.nav-btn {
  width: 480px;
  height: 48px;
  font-size: 18px;
  font-weight: 600;
}
</style>
