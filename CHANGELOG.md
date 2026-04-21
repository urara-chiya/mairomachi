# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

## [Unreleased]

### Security

- 开启渲染进程 Chromium 沙箱（移除 `sandbox: false`）
- 删除 Preload `contextIsolation` 降级分支，未启用时直接崩溃
- 增加外部链接 URL 白名单校验，仅允许 `wows-numbers.com` 和 `developers.wargaming.net`
- 修复 ECharts tooltip HTML 拼接导致的潜在 XSS 漏洞
- 恢复 Windows 安装包签名验证（`verifyUpdateCodeSignature: true`）
- 自动更新下载增加 SHA-256 哈希校验

### Changed

- 移除 `electron-builder` 内置自动更新配置（项目使用独立更新服务）
- 窗口关闭时清理全局 `mainWindow` 引用

## [1.0.0] - 2026-04-20

### Added

- 初始版本发布
- 对局实时监控与战绩查询
- 本地 Replay 解析
- 战后数据记录与统计
- Ed25519 + JWT 双因素认证
