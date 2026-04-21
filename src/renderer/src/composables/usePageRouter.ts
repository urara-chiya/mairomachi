import type { Component } from 'vue'
import { reactive, ref, shallowRef } from 'vue'
import type { MenuOption } from 'naive-ui'
import Dashboard from '@renderer/layout/Dashboard.vue'
import ActivatePage from '@renderer/layout/ActivatePage.vue'
import LaunchPage from '@renderer/layout/LaunchPage.vue'
import EmptyPage from '@renderer/layout/EmptyPage.vue'
import ArenaMonitorPage from '@renderer/layout/ArenaMonitorPage.vue'
import HelpPage from '@renderer/layout/HelpPage.vue'
import RecordPage from '@renderer/layout/RecordPage.vue'

export interface PageConfig {
  name: string
  component: Component
}

const pages: Record<string, PageConfig> = {
  dashboard: { name: 'dashboard', component: Dashboard },
  activate: { name: 'activate', component: ActivatePage },
  'arena-monitor': { name: 'arena-monitor', component: ArenaMonitorPage },
  empty: { name: 'empty', component: EmptyPage },
  help: { name: 'help', component: HelpPage },
  launch: { name: 'launch', component: LaunchPage },
  record: { name: 'record', component: RecordPage }
}

export function usePageRouter(): {
  pages: Record<string, PageConfig>
  currentPage: import('vue').ShallowRef<PageConfig>
  navigatorItems: unknown[]
  activeMenuKey: import('vue').Ref<string | null>
  extraMenuItems: unknown[]
  activeExtraMenuKey: import('vue').Ref<string | null>
  changePage: (key: string) => void
  setNavDisabled: (disabled: boolean) => void
  handleEmptyToDashboard: () => void
  handleDashboardToPage: (key: string) => void
} {
  const currentPage = shallowRef<PageConfig>(pages['launch'])

  const navigatorItems = reactive<MenuOption[]>([
    { label: '主页', key: 'dashboard' },
    { label: '对局', key: 'arena-monitor' },
    { label: '记录', key: 'record' }
  ])
  const activeMenuKey = ref<string | null>(null)

  const extraMenuItems = reactive<MenuOption[]>([
    { label: '帮助', key: 'help' },
    { label: '激活', key: 'activate' }
  ])
  const activeExtraMenuKey = ref<string | null>(null)

  const changePage = (key: string): void => {
    const page = pages[key]
    if (!page) {
      currentPage.value = pages['empty']
      activeMenuKey.value = null
      activeExtraMenuKey.value = null
      return
    }
    currentPage.value = page
    if (navigatorItems.some((i) => i.key === key)) {
      activeMenuKey.value = key
      activeExtraMenuKey.value = null
    } else if (extraMenuItems.some((i) => i.key === key)) {
      activeExtraMenuKey.value = key
      activeMenuKey.value = null
    }
  }

  const setNavDisabled = (disabled: boolean): void => {
    navigatorItems.forEach((i) => (i.disabled = disabled))
  }

  const handleEmptyToDashboard = (): void => {
    changePage('dashboard')
    activeMenuKey.value = 'dashboard'
  }

  const handleDashboardToPage = (key: string): void => {
    changePage(key)
  }

  return {
    pages,
    currentPage,
    navigatorItems,
    activeMenuKey,
    extraMenuItems,
    activeExtraMenuKey,
    changePage,
    setNavDisabled,
    handleEmptyToDashboard,
    handleDashboardToPage
  }
}
