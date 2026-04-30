# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

## [1.6.1] - 2026-04-30

### Added

- **侧栏双轴趋势图**：将三个独立折线图重构为两个双轴图——场次+胜率、PR+场均；胜率轴固定 0-100 范围；新增近一周场次统计曲线。
- **舰种/舰船占比饼图**：战绩记录页侧栏新增两个环形饼图，本地计算筛选后数据的舰种分布和舰船分布；舰船占比图例限制为场次最多的 5 条船+其他。
- **饼图中心数字交互**：环形中心显示总场次，hover 到扇区时切换为该分类场次，移出恢复总计。
- **清空筛选**：筛选栏新增"重置"按钮，一键清空船只和日期筛选条件。

### Changed

- **筛选栏信息提示**：列表页的 info alert 移至筛选栏右侧，改为 `InfoCircle` tooltip，节省列表纵向空间。
- **空列表提示**：筛选结果为空时，列表区由 warning alert 改为 `n-empty` 空状态组件。
- **趋势图数据源**：`dailyStats` 新增 `battles`（场次）数据，与胜率/场均/PR同步按游戏日（04:00）分组。

### Fixed

- **对局记录详情舰种 icon**：`ShipNameCard` 新增 `watch(props.type)`，修复 `shipInfoMap` 异步加载完成后 type 变化不触发 icon 加载的问题。
- **轮廓图透明度**：`tintContourImage` 强制所有非背景像素 `alpha=255`，去除 WG 轮廓图本身可能存在的预设透明度。
- **导出页图片加载**：`RecordExportPage` 单船表格添加 `n-spin` loading 状态；`ShipNameCard` 处理完成后 emit ready 事件统计加载进度。

## [1.6.0] - 2026-04-29

### Added

- **地图名多语言显示**：后端新增地图信息维护体系（`mapInfo.json`），`MapInfoFileService` + `MapInfoCache` + `MapInfoUpdateTask` 定期从 WG API 更新多语言地图名称；`InfoController` 新增 `/maps` 系列接口。前端 `BattleRecord` 扩展 `mapId` 字段，`replay-parser.ts` 解析时提取 `mapId`；渲染时优先通过 `mapId` 查询多语言地图名，旧数据 fallback 到 `mapName`；新增 `map-info-service.ts` 和 `useMapInfo` composable。
- **舰种图标**：后端 `ShipInfoDetail` 扩展 `images` 字段（轮廓图/舰船图 URL），`FileShipInfo` 扩展 `shipTypeImages`（舰种图标资源）；前端 `ship-info-service.ts` 初始化时下载 icon 到本地缓存。`ShipNameCard` 标准模式新增舰种 icon，通过 IPC Data URL 加载避免 `file://` 权限问题。
- **轮廓图模式**：`ShipNameCard` 新增 `contour` 模式，上方显示舰船轮廓图，下方显示舰种 icon + 等级 + 船名。导出页单船统计表格使用 `contour` 模式替代直接文本船名。
- **敌我颜色区分**：`ShipNameCard` 新增 `isAlly` 属性，对局监控页和记录详情页按敌我关系显示不同颜色（`success`/`error`）。
- **轮廓图 tint 处理**：`utils/image.ts` 新增 `tintContourImage`，通过 Canvas 逐像素处理：纯白背景→透明、灰色填充→舰种目标色、黑色轮廓保持原色；采样图片中心偏底部像素作为填充参考色，自适应不同图片的灰度差异。
- **舰种填充色常量**：`shared/constants/ships.ts` 新增 `SHIP_TYPE_FILL_COLOR`（SS `#ADC9CC` / DD `#D9E7DC` / CA `#BFC7E6` / BB `#AEB1AF` / CV `#C8C8C8`）。

### Changed

- **轮廓图显示尺寸**：统一高度 20px，宽度按原始比例自适应；Canvas 处理时水平拉伸 1.5 倍，使整体更扁长且保持船与船之间的大小关系。
- **CSP 策略**：`img-src` 从 `'self' data:` 放宽为 `'self' data: https:`，允许加载 WG CDN 的外部 HTTPS 图片。

### Fixed

- **启动缓存同步**：修复 `StartupInitializationTask` 中 `shipInfo`/`mapInfo` 版本缓存未调用 `reload()` 的问题，确保文件更新后内存缓存同步刷新。
- **IPC 文件权限**：修复渲染进程无法通过 `file://` 加载本地舰种 icon 的问题，IPC `ship:getTypeIcon` 改为返回 Data URL。
- **env 配置**：补充 `.env` / `.env.development` / `.env.example` 中的 `VITE_API_ENDPOINT_INFO_MAPS` 和 `VITE_API_ENDPOINT_INFO_MAPS_VERSION` 端点配置。

## [1.5.0] - 2026-04-28

### Added

- **战绩统计导出页**：新增独立的战绩导出页面，支持一键截图复制到剪切板，包含 PR 横幅、玩家信息头、统计卡片和单船数据表格。
- **侧栏趋势图**：战绩统计页新增右侧侧栏，展示最近 7 天的胜率、场均伤害、PR 三条独立折线图。
- **单船颜色等级**：导出页和统计页的单船数据表格中，击杀（avgFrags）和经验（avgExp）均显示对应的颜色等级。
- **筛选条件提示**：导出页固定显示当前筛选状态，包括时间区间和是否启用了船只筛选。

### Changed

- **每日统计分割点**：趋势图和批量统计的每日分割点从 00:00 调整为凌晨 04:00，更符合实际游戏日概念。
- **截图方案**：导出页截图从 `html-to-image` 改为 Electron 原生 `webContents.capturePage()`，解决字体加载失败导致的截图失败问题，且自动适配设备 DPI。

### Fixed

- **胜率计算错误**：修复战绩统计中胜率恒为 100% 的问题。`matchResult.result` 在 replay 解析时已以用户视角处理，前端不再错误地通过 `teamId` 二次判断胜负。
- **IPC 主窗口警告**：修复应用启动后未启动对局监控前，保存设置时出现的 `Main window not available` 警告。

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
