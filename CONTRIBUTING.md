# 贡献指南

感谢您对迷路町（Mairomachi）项目的关注！以下是参与贡献的说明。

## 开发环境搭建

### 前置要求

- Node.js 22+
- pnpm 10+
- Java 21（如需运行后端）

### 安装依赖

```bash
cd mairomachi
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

## 代码风格

本项目使用以下工具保证代码质量：

- **ESLint 9** + **Prettier 3** 进行代码检查与格式化
- **TypeScript 严格模式**

请在提交前运行以下命令：

```bash
pnpm typecheck   # TypeScript 类型检查
pnpm lint        # ESLint 检查
pnpm format      # Prettier 格式化
```

## 提交规范

- 使用中文描述提交信息
- 提交信息格式：`[模块] 简要描述`，例如 `[main] 修复路径遍历漏洞`
- 单个提交尽量只包含一个逻辑变更

## PR 规范

1. Fork 本仓库并创建功能分支
2. 确保代码通过所有类型检查和 lint
3. 更新相关文档
4. 提交 PR 时描述变更动机和影响范围

## 问题反馈

如发现 Bug 或建议新功能，请通过 Issue 提交，并尽可能提供：

- 复现步骤
- 预期行为与实际行为
- 相关日志或截图
