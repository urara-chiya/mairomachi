import { ref, type Ref } from 'vue'

/**
 * useSwitch 开关状态管理工厂函数
 *
 * 用于统一管理布尔开关状态及其生命周期
 *
 * @example
 * // 基础用法
 * const { isOpen, toggle, open, close } = useSwitch()
 *
 * // 带生命周期钩子
 * const { isOpen, toggle } = useSwitch({
 *   initialValue: true,
 *   onOpen: () => console.log('打开了'),
 *   onClose: () => console.log('关闭了'),
 *   onChange: (value) => console.log('变化:', value)
 * })
 *
 * // 使用外部 ref
 * const modalVisible = ref(false)
 * const { toggle } = useSwitch({
 *   value: modalVisible,
 *   onOpen: () => loadData()
 * })
 *
 * // 条件开关（如需要确认才能关闭）
 * const { isOpen, close } = useSwitch({
 *   onBeforeClose: async () => await confirm('确定关闭吗？')
 * })
 */

export interface UseSwitchOptions {
  /** 初始值 */
  initialValue?: boolean
  /** 外部 ref（提供时同步外部状态） */
  value?: Ref<boolean>
  /** 打开前钩子（返回 false 可阻止打开） */
  onBeforeOpen?: () => boolean | Promise<boolean>
  /** 关闭前钩子（返回 false 可阻止关闭） */
  onBeforeClose?: () => boolean | Promise<boolean>
  /** 打开后钩子 */
  onOpen?: () => void
  /** 关闭后钩子 */
  onClose?: () => void
  /** 状态变化钩子（无论打开关闭都会触发） */
  onChange?: (value: boolean) => void
}

export interface UseSwitchReturn {
  /** 开关状态 */
  isOpen: Ref<boolean>
  /** 切换开关状态 */
  toggle: () => Promise<void>
  /** 打开 */
  open: () => Promise<void>
  /** 关闭 */
  close: () => Promise<void>
  /** 设置指定值 */
  set: (value: boolean) => Promise<void>
  /** 重置为初始值 */
  reset: () => void
}

export function useSwitch(options: UseSwitchOptions = {}): UseSwitchReturn {
  const { initialValue = false, value: externalValue, onBeforeOpen, onBeforeClose, onOpen, onClose, onChange } = options

  // 内部状态
  const internalValue = ref(initialValue)

  // 使用外部 ref 或内部 ref
  const isOpen = externalValue ?? internalValue

  /**
   * 设置开关值（核心逻辑）
   */
  const set = async (value: boolean): Promise<void> => {
    // 值未变化，直接返回
    if (isOpen.value === value) return

    // 前置检查
    if (value) {
      // 尝试打开
      if (onBeforeOpen) {
        const canOpen = await onBeforeOpen()
        if (!canOpen) return
      }
    } else {
      // 尝试关闭
      if (onBeforeClose) {
        const canClose = await onBeforeClose()
        if (!canClose) return
      }
    }

    // 设置值
    isOpen.value = value

    // 触发钩子
    onChange?.(value)

    if (value) {
      onOpen?.()
    } else {
      onClose?.()
    }
  }

  /**
   * 切换开关状态
   */
  const toggle = async (): Promise<void> => {
    await set(!isOpen.value)
  }

  /**
   * 打开
   */
  const open = async (): Promise<void> => {
    await set(true)
  }

  /**
   * 关闭
   */
  const close = async (): Promise<void> => {
    await set(false)
  }

  /**
   * 重置为初始值
   */
  const reset = (): void => {
    isOpen.value = initialValue
  }

  return {
    isOpen,
    toggle,
    open,
    close,
    set,
    reset
  }
}

/**
 * 多开关管理器
 * 管理多个相关联的开关，确保只有一个可以同时打开
 *
 * @example
 * const switchManager = useSwitchGroup({
 *   items: ['panel1', 'panel2', 'panel3'],
 *   allowMultiple: false  // 只允许一个打开
 * })
 *
 * // 打开 panel1，其他会自动关闭
 * switchManager.open('panel1')
 * switchManager.isActive('panel1') // true
 */
export interface UseSwitchGroupOptions {
  /** 开关项列表 */
  items: string[]
  /** 是否允许多个同时打开 */
  allowMultiple?: boolean
  /** 默认打开的项 */
  defaultActive?: string[]
  /** 状态变化回调 */
  onChange?: (activeItems: string[]) => void
}

export interface UseSwitchGroupReturn {
  /** 当前活跃的项列表 */
  activeItems: Ref<string[]>
  /** 打开指定项 */
  open: (item: string) => void
  /** 关闭指定项 */
  close: (item: string) => void
  /** 切换指定项 */
  toggle: (item: string) => void
  /** 检查项是否活跃 */
  isActive: (item: string) => boolean
  /** 关闭所有 */
  closeAll: () => void
  /** 打开所有（仅在 allowMultiple 为 true 时有效） */
  openAll: () => void
}

export function useSwitchGroup(options: UseSwitchGroupOptions): UseSwitchGroupReturn {
  const { items, allowMultiple = false, defaultActive = [], onChange } = options

  const activeItems = ref<string[]>([...defaultActive])

  const isActive = (item: string): boolean => {
    return activeItems.value.includes(item)
  }

  const open = (item: string): void => {
    if (!items.includes(item)) return

    if (allowMultiple) {
      if (!isActive(item)) {
        activeItems.value.push(item)
        onChange?.([...activeItems.value])
      }
    } else {
      if (activeItems.value[0] !== item) {
        activeItems.value = [item]
        onChange?.([item])
      }
    }
  }

  const close = (item: string): void => {
    const index = activeItems.value.indexOf(item)
    if (index > -1) {
      activeItems.value.splice(index, 1)
      onChange?.([...activeItems.value])
    }
  }

  const toggle = (item: string): void => {
    if (isActive(item)) {
      close(item)
    } else {
      open(item)
    }
  }

  const closeAll = (): void => {
    activeItems.value = []
    onChange?.([])
  }

  const openAll = (): void => {
    if (allowMultiple) {
      activeItems.value = [...items]
      onChange?.([...items])
    }
  }

  return {
    activeItems,
    open,
    close,
    toggle,
    isActive,
    closeAll,
    openAll
  }
}

export default useSwitch
