import { h, ref } from 'vue'
import type { MessageApi, NotificationApi } from 'naive-ui'
import { NButton } from 'naive-ui'

export interface LaunchFlowDeps {
  changePage: (key: string) => void
  setNavDisabled: (disabled: boolean) => void
  openSettings: () => void
  message: MessageApi
  notification: NotificationApi
}

export function useLaunchFlow(deps: LaunchFlowDeps): {
  launchStatusText: import('vue').Ref<string>
  launchPercentage: import('vue').Ref<number>
  launchError: import('vue').Ref<boolean>
  handleLaunch: () => Promise<void>
  processNeedActivate: () => void
} {
  const launchStatusText = ref('正在初始化...')
  const launchPercentage = ref(10)
  const launchError = ref(false)

  const processNeedActivate = (): void => {
    deps.setNavDisabled(true)
    deps.changePage('activate')
  }

  async function checkUpdateOnLaunch(): Promise<void> {
    try {
      const result = await window.ipc.update.check()
      if (result.hasUpdate) {
        const n = deps.notification.info({
          title: '发现新版本',
          content: `当前版本 ${result.currentVersion}，最新版本 ${result.latestVersion}。`,
          action: () =>
            h(
              NButton,
              {
                text: true,
                type: 'primary',
                onClick: () => {
                  deps.openSettings()
                  n.destroy()
                }
              },
              { default: () => '前往设置' }
            ),
          duration: 0,
          meta: new Date().toLocaleString()
        })
      }
    } catch {
      // 静默忽略更新检查失败，不影响启动体验
    }
  }

  async function handleLaunch(): Promise<void> {
    launchError.value = false
    launchPercentage.value = 30
    launchStatusText.value = '正在检查激活状态...'
    const isActivated = await window.ipc.auth.check()

    if (!isActivated) {
      processNeedActivate()
      return
    }

    launchPercentage.value = 60
    launchStatusText.value = '正在连接服务器并同步数据...'
    const loginResult = await window.ipc.auth.login()

    if (loginResult.success) {
      launchPercentage.value = 100
      launchStatusText.value = '准备就绪'
      setTimeout(() => {
        deps.changePage('dashboard')
        checkUpdateOnLaunch()
      }, 300)
      return
    }

    if (loginResult.needReactivate) {
      await window.ipc.auth.logout()
      processNeedActivate()
      deps.message.error(loginResult.message || '激活已过期，请重新激活>_<')
      return
    }

    // 网络/服务器错误：停留在启动页，显示重试
    launchError.value = true
    launchStatusText.value = loginResult.message || '连接服务器失败，请检查网络或稍后重试'
  }

  return {
    launchStatusText,
    launchPercentage,
    launchError,
    handleLaunch,
    processNeedActivate
  }
}
