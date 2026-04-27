# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

## [1.4.1] - 2026-04-27

### Fixed

- **筛选 PR 不一致**：修复对局记录筛选时，卡片显示的 PR 与统计栏整体 PR 不一致的问题（前端 `wins` 推导逻辑与后端不对齐）。
- **日期快捷筛选**：修复"今天"等日期快捷设置的范围未对齐到整天边界，导致筛选结果不正确的问题。

## [1.4.0] - 2026-04-26

### Added

- **对局记录筛选**：支持按船只和日期区间筛选历史战绩，筛选后顶部统计栏联动更新。
- **手动导入 Replay**：支持通过文件对话框手动选择 `.wowsreplay` 文件导入对局记录，自动检测重复文件并提示。
- **战绩统计等级颜色**：历史统计中的胜率、场均伤害、整体 PR 均附带颜色等级标识。
- **RecordController（后端）**：新开面向业务的对局记录控制器，提供 `/record/battle/enrich` 一站式 enrich 接口（PR 等级 + 公会信息）。

### Changed

- **对局记录数据模型重构**：`BattleRecord.players` 成为唯一真相源，废弃 `enrichedPlayers` / `enrichedClanInfos` 冗余层。
- **删除 `loadBatchPr`**：对局记录列表页不再重复向后端请求 PR 数据，直接从已持久化的记录中读取。
- **后端限流优化**：`SmoothRateLimiter` QPS 从 19 下调至 15，降低 WG API 限流触发概率。

### Fixed

- **重复保存修复**：`ArenaMonitor.handleNewReplay` 新增 `processingPaths` 并发标记，防止 `add` + `change` 事件并发导致同一文件重复解析保存。
- **整体 PR 计算修正**：严格按 wows-numbers 标准实现"先求和，后求比"算法，删除冗余的 `BatchAccumulator`。

## [1.3.0] - 2026-04-24

### Added

- 对局记录详情页预计算：replay 解析完成后立即调用后端 enrich，将 PR、伤害等级、公会信息随记录持久化到本地。

### Changed

- **数据不兼容**：此版本重构了对局记录的存储结构，此前版本保存的历史记录不再兼容。

## [1.2.1] - 2026-04-23

### Fixed

- 修复对局监控页面玩家列表在特定分辨率下错位的问题。
- 优化多处 UI 细节。

## [1.2.0] - 2026-04-23

### Added

- 新增"隐藏玩家ID"设置，开启后战绩详情页不展示玩家名称。

## [1.1.0] - 2026-04-22

### Changed

- replay 解析算法优化，提升解析速度和稳定性。
- 对局胜负判定逻辑优化，更准确识别平局和提前退出。

### Fixed

- 对局监控、对局记录页面 UI 细节优化。

## [1.0.0] - 2026-04-20

### Added

- 初始版本发布，包含对局监控、战绩记录、自动更新等核心功能。
