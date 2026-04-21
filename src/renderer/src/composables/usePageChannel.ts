import { computed, type Ref } from 'vue'

/**
 * PageChannel — 页面与 MrWindow 之间的统一事件通道
 *
 * 所有 page component 都通过同一个 `channel` emit 与外壳通信，
 * 避免在 `<component :is="...">` 上堆积大量 `@xxx` 绑定。
 *
 * @example
 * // 在任意页面组件内
 * const emit = defineEmits<{ channel: [PageChannelEvent] }>()
 * emit('channel', { type: 'navigate', payload: 'arena-monitor' })
 */

/** 页面可发送的事件类型 */
export type PageChannelType = 'retry' | 'navigate' | 'activated'

/** 统一事件载荷 */
export interface PageChannelEvent<T extends PageChannelType = PageChannelType> {
  type: T
  payload?: T extends 'navigate' ? string : undefined
}

/** 页面组件统一 emits 签名 */
export interface PageChannelEmits {
  channel: [event: PageChannelEvent]
}

export interface PageChannelDeps {
  currentPageName: Ref<string>
  launchStatusText: Ref<string>
  launchPercentage: Ref<number>
  launchError: Ref<boolean>
  handleLaunch: () => Promise<void>
  changePage: (key: string) => void
  setNavDisabled: (disabled: boolean) => void
}

export function usePageChannel(deps: PageChannelDeps): {
  pageProps: import('vue').ComputedRef<Record<string, unknown>>
  handleChannel: (event: PageChannelEvent) => void
} {
  /**
   * 根据当前页面动态生成 props，避免把 launch 状态传给所有页面
   */
  const pageProps = computed(() => {
    if (deps.currentPageName.value === 'launch') {
      return {
        statusText: deps.launchStatusText.value,
        percentage: deps.launchPercentage.value,
        error: deps.launchError.value
      }
    }
    return {}
  })

  /**
   * 统一事件分发器
   */
  const handleChannel = (event: PageChannelEvent): void => {
    switch (event.type) {
      case 'retry':
        deps.handleLaunch().then()
        break
      case 'navigate':
        if (event.payload) {
          deps.changePage(event.payload)
        }
        break
      case 'activated':
        deps.setNavDisabled(false)
        deps.changePage('dashboard')
        break
    }
  }

  return { pageProps, handleChannel }
}
