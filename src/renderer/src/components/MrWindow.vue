<script lang="ts" setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { BorderOutlined, CloseOutlined, MinusOutlined, SettingOutlined } from '@vicons/antd'
import { useMessage, useNotification } from 'naive-ui'
import { ToastInfo } from '@shared/types'
import { useSwitch } from '@renderer/composables/useSwitch'
import { usePageRouter } from '@renderer/composables/usePageRouter'
import { useLaunchFlow } from '@renderer/composables/useLaunchFlow'
import { usePageChannel } from '@renderer/composables/usePageChannel'
import SettingsPage from '@renderer/layout/SettingsPage.vue'

const message = useMessage()
const notification = useNotification()

const { currentPage, navigatorItems, activeMenuKey, extraMenuItems, activeExtraMenuKey, changePage, setNavDisabled } =
  usePageRouter()

const { isOpen: settingsModalShow, open: handleSettingsOpen, close: handleSettingsClose } = useSwitch()

const { launchStatusText, launchPercentage, launchError, handleLaunch, processNeedActivate } = useLaunchFlow({
  changePage,
  setNavDisabled,
  openSettings: handleSettingsOpen,
  message,
  notification
})

const { pageProps, handleChannel } = usePageChannel({
  currentPageName: computed(() => currentPage.value.name),
  launchStatusText,
  launchPercentage,
  launchError,
  handleLaunch,
  changePage,
  setNavDisabled
})

const handleMinimize = (): Promise<void> => window.ipc.window.minimize()
const handleMaximize = (): Promise<boolean> => window.ipc.window.maximize()
const handleClose = (): Promise<void> => window.ipc.window.close()

let unsubscribeToast: (() => void) | null = null
let unsubscribeAuthExpired: (() => void) | null = null

onMounted(async () => {
  unsubscribeToast = window.ipc.notify.onToast((info: ToastInfo) => {
    message.create(info.content, { type: info.type })
  })

  unsubscribeAuthExpired = window.ipc.auth.onExpired((info) => {
    message.error(info.message || '登录状态已失效，请重新激活>_<')
    processNeedActivate()
  })

  await handleLaunch()
})

onUnmounted(() => {
  unsubscribeToast?.()
  unsubscribeAuthExpired?.()
})
</script>

<template>
  <n-layout class="mr-window">
    <n-layout-header class="header-bar">
      <n-flex align="center" class="header-bar-wrapper" justify="space-between">
        <n-space align="center" class="nav-space" justify="space-between">
          <n-menu
            v-model:value="activeMenuKey"
            :options="navigatorItems"
            class="header-menu"
            mode="horizontal"
            responsive
            @update:value="(key: string) => changePage(key)" />
        </n-space>
        <n-space class="window-btn-space">
          <n-menu
            v-model:value="activeExtraMenuKey"
            :options="extraMenuItems"
            class="extra-menu"
            mode="horizontal"
            responsive
            @update:value="(key: string) => changePage(key)" />
          <n-flex align="center" style="height: 100%">
            <n-button secondary size="small" strong type="tertiary" @click="handleSettingsOpen" @mousedown.prevent>
              <template #icon>
                <setting-outlined />
              </template>
            </n-button>
            <n-button secondary size="small" strong type="tertiary" @click="handleMinimize" @mousedown.prevent>
              <template #icon>
                <minus-outlined />
              </template>
            </n-button>
            <n-button secondary size="small" strong type="tertiary" @click="handleMaximize" @mousedown.prevent>
              <template #icon>
                <border-outlined />
              </template>
            </n-button>
            <n-button secondary size="small" strong type="tertiary" @click="handleClose" @mousedown.prevent>
              <template #icon>
                <close-outlined />
              </template>
            </n-button>
          </n-flex>
        </n-space>
      </n-flex>
    </n-layout-header>
    <n-layout-content class="main" :content-style="{ padding: '12px' }">
      <Transition mode="out-in" name="page-fade">
        <component :is="currentPage.component" :key="currentPage.name" v-bind="pageProps" @channel="handleChannel" />
      </Transition>
    </n-layout-content>
  </n-layout>
  <n-modal v-model:show="settingsModalShow" :mask-closable="false" draggable>
    <n-card class="settings-content" size="medium" title="设置">
      <template #header-extra>
        <n-button secondary size="small" type="tertiary" @click="handleSettingsClose">
          <template #icon>
            <close-outlined />
          </template>
        </n-button>
      </template>
      <settings-page @close="handleSettingsClose" />
    </n-card>
  </n-modal>
</template>

<style scoped>
.mr-window {
  height: 100vh;
  width: 100vw;
}
.header-bar {
  height: 48px;
  padding-inline: 24px;
  -webkit-app-region: drag;
}
.header-bar-wrapper {
  height: 100%;
  width: 100%;
}
.nav-space {
  -webkit-app-region: no-drag;
}

.header-menu {
  -webkit-app-region: no-drag;
}
.window-btn-space {
  -webkit-app-region: no-drag;
}

.extra-menu {
  -webkit-app-region: no-drag;
}
.main {
  height: calc(100% - 48px);
  width: 100%;
}

.settings-content {
  height: 720px;
  width: 640px;
}

/* 页面切换过渡动画 */
.page-fade-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.page-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
