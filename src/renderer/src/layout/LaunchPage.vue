<script lang="ts" setup>
defineProps<{
  statusText: string
  percentage: number
  error?: boolean
}>()

import type { PageChannelEmits } from '@renderer/composables/usePageChannel'

const emit = defineEmits<PageChannelEmits>()
</script>

<template>
  <n-flex align="center" class="launch-page" justify="center" vertical>
    <template v-if="!error">
      <n-spin size="large" />
      <n-text style="margin-top: 24px; font-size: 16px">
        {{ statusText }}
      </n-text>
      <n-progress
        :border-radius="4"
        :fill-border-radius="4"
        :height="8"
        :percentage="percentage"
        :show-indicator="false"
        style="width: 320px; margin-top: 12px"
        type="line" />
    </template>

    <template v-else>
      <n-icon color="#d03050" size="48">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </n-icon>
      <n-text style="margin-top: 16px; font-size: 16px; color: #d03050">
        {{ statusText }}
      </n-text>
      <n-button ghost style="margin-top: 24px; width: 120px" type="primary" @click="emit('channel', { type: 'retry' })">
        重新连接
      </n-button>
    </template>
  </n-flex>
</template>

<style scoped>
.launch-page {
  width: 100%;
  height: 100%;
}
</style>
