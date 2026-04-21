/**
 * 主进程类型定义聚合出口
 *
 * 所有主进程与渲染进程共享的数据类型在此统一导出，
 * 渲染进程应通过 `shared/types` 间接引用，禁止直接导入本模块。
 */
export * from './app-config'
export * from './http'
export * from './file'
export * from './replay'
export * from './record'
export * from './update'
export * from './player'
