<script lang="ts" setup>
import { darkTheme, dateZhCN, lightTheme, zhCN } from 'naive-ui'
import MrWindow from '@renderer/components/MrWindow.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import type { AppConfig } from '@shared/types'

const theme = ref(darkTheme)

let unsubscribeSettings: (() => void) | null = null

onMounted(async () => {
  const config = await window.ipc.settings.load()
  theme.value = config.ui.theme === 'light' ? lightTheme : darkTheme

  unsubscribeSettings = window.ipc.settings.onChanged((config: AppConfig) => {
    theme.value = config.ui.theme === 'light' ? lightTheme : darkTheme
  })
})

onUnmounted(() => {
  unsubscribeSettings?.()
})
</script>

<template>
  <n-config-provider :date-locale="dateZhCN" :locale="zhCN" :theme="theme">
    <n-message-provider>
      <n-notification-provider>
        <mr-window />
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>
