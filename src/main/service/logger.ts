/**
 * 日志管理器
 * 统一管理主进程的日志打印，支持不同日志级别
 * 生产环境写入文件并按日期轮转，保留最近 7 天
 */

import { app } from 'electron'
import fs from 'node:fs'
import nodePath from 'node:path'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

const LOG_RETENTION_DAYS = 7

class Logger {
  private static instance: Logger
  private currentLevel: LogLevel = LogLevel.DEBUG
  private logDir: string | null = null

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /** 初始化日志目录（需在 Electron app ready 后调用） */
  initLogsDir(): void {
    this.logDir = app.getPath('logs')
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
    this.cleanOldLogs()
  }

  debug(category: string, message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', category, message), ...args)
    }
    this.writeToFile('DEBUG', category, message)
  }

  info(category: string, message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', category, message), ...args)
    }
    this.writeToFile('INFO', category, message)
  }

  warn(category: string, message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', category, message), ...args)
    }
    this.writeToFile('WARN', category, message)
  }

  error(category: string, message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', category, message), ...args)
    }
    this.writeToFile('ERROR', category, message)
  }

  private cleanOldLogs(): void {
    if (!this.logDir) return
    const files = fs.readdirSync(this.logDir)
    const now = Date.now()
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
    for (const file of files) {
      if (!file.startsWith('mairomachi-') || !file.endsWith('.log')) continue
      try {
        const filePath = nodePath.join(this.logDir, file)
        const stat = fs.statSync(filePath)
        if (now - stat.mtimeMs > maxAge) {
          fs.unlinkSync(filePath)
        }
      } catch {
        // 忽略清理失败的文件
      }
    }
  }

  private formatMessage(level: string, category: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level}] [${category}] ${message}`
  }

  private writeToFile(level: string, category: string, message: string): void {
    if (!this.logDir) return
    const dateStr = new Date().toISOString().split('T')[0]
    const logFile = nodePath.join(this.logDir, `mairomachi-${dateStr}.log`)
    const line = this.formatMessage(level, category, message) + '\r\n'
    try {
      fs.appendFileSync(logFile, line)
    } catch {
      // 忽略写入失败
    }
  }
}

export const logger = Logger.getInstance()
