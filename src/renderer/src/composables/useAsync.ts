import { computed, type ComputedRef, ref, type Ref } from 'vue'

/**
 * useAsync 异步操作工厂函数
 *
 * 用于统一管理异步操作的状态（loading、error、data）和生命周期钩子
 *
 * @example
 * // 基础用法
 * const { execute, loading, error } = useAsync({
 *   fn: async () => {
 *     const result = await window.ipc.settings.load()
 *     return result
 *   }
 * })
 *
 * // 带初始状态和钩子
 * const { execute, loading } = useAsync({
 *   fn: fetchData,
 *   initialLoading: true,
 *   onSuccess: (data) => console.log('成功:', data),
 *   onError: (err) => console.error('失败:', err),
 *   onFinally: () => console.log('结束')
 * })
 *
 * // 立即执行
 * const { data, loading } = useAsync({
 *   fn: fetchData,
 *   immediate: true
 * })
 *
 * // 使用外部 ref
 * const myLoading = ref(false)
 * const { execute } = useAsync({
 *   fn: fetchData,
 *   loading: myLoading
 * })
 */

export interface UseAsyncOptions<T, P extends unknown[]> {
  /** 异步操作函数 */
  fn: (...args: P) => Promise<T>
  /** 外部 loading ref（可选，提供时可与外部状态同步） */
  loading?: Ref<boolean>
  /** 初始 loading 状态 */
  initialLoading?: boolean
  /** 是否立即执行 */
  immediate?: boolean
  /** 立即执行的参数 */
  immediateArgs?: P
  /** 成功回调 */
  onSuccess?: (data: T, ...args: P) => void
  /** 失败回调 */
  onError?: (error: unknown, ...args: P) => void
  /** 最终回调（无论成功失败都会执行） */
  onFinally?: (...args: P) => void
  /** 开始回调（执行前调用） */
  onBefore?: (...args: P) => void
}

export interface UseAsyncReturn<T, P extends unknown[]> {
  /** 执行异步操作 */
  execute: (...args: P) => Promise<T | undefined>
  /** 是否加载中 */
  loading: Ref<boolean>
  /** 错误信息（原始值） */
  error: Ref<unknown>
  /** 错误信息（已格式化为可读字符串） */
  errorMessage: ComputedRef<string>
  /** 返回数据 */
  data: Ref<T | undefined>
  /** 重置状态 */
  reset: () => void
}

export function useAsync<T, P extends unknown[] = []>(options: UseAsyncOptions<T, P>): UseAsyncReturn<T, P> {
  const {
    fn,
    loading: externalLoading,
    initialLoading = false,
    immediate = false,
    immediateArgs = [] as unknown[] as P,
    onSuccess,
    onError,
    onFinally,
    onBefore
  } = options

  // 内部状态
  const internalLoading = ref(initialLoading)
  const error = ref<unknown>(undefined)
  const data = ref<T | undefined>(undefined) as Ref<T | undefined>

  // 使用外部 loading 或内部 loading
  const loading = externalLoading ?? internalLoading

  /** 将错误标准化为可读字符串 */
  const errorMessage = computed<string>(() => {
    const err = error.value
    if (err === undefined || err === null) return ''
    if (typeof err === 'string') return err
    if (err instanceof Error) return err.message
    if (typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
      return (err as Record<string, unknown>).message as string
    }
    return String(err)
  })

  /**
   * 执行异步操作
   */
  const execute = async (...args: P): Promise<T | undefined> => {
    // 开始回调
    onBefore?.(...args)

    // 设置 loading 状态
    loading.value = true
    error.value = undefined

    try {
      const result = await fn(...args)
      data.value = result

      // 成功回调
      onSuccess?.(result, ...args)

      return result
    } catch (err) {
      error.value = err

      // 失败回调
      onError?.(err, ...args)

      // 不抛出错误，让调用方通过 error 状态判断
      return undefined
    } finally {
      // 结束 loading
      loading.value = false

      // 最终回调
      onFinally?.(...args)
    }
  }

  /**
   * 重置状态
   */
  const reset = (): void => {
    internalLoading.value = false
    error.value = undefined
    data.value = undefined
  }

  // 立即执行
  if (immediate) {
    execute(...immediateArgs).then()
  }

  return {
    execute,
    loading,
    error,
    errorMessage,
    data,
    reset
  }
}

export default useAsync
