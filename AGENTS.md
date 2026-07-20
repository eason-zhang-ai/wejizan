# 伪集赞仓库工作指南

本文件是后续 Codex session 的首要仓库级上下文。开始工作前依次阅读：

1. `README.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/HANDOFF.md`

## 项目目标

“伪集赞”是一个 Web 优先、可编译为微信小程序的朋友圈截图创作工具。它提供两种工作流：从产品图片与文案生成完整朋友圈画面，或在用户上传的朋友圈截图上叠加点赞和评论。

生成内容默认带“模拟生成 · 伪集赞”标识。不得在没有明确产品决策的情况下取消默认水印、关闭用途警告，或加入用于冒充、欺骗、虚假交易的功能。

## 仓库结构

- `apps/client`：Taro 4 + React 18 + TypeScript 前端，同时输出 H5 与微信小程序。
- `apps/server`：Fastify API、访问口令、短期令牌、AI 适配器和静态文件托管。
- `packages/contracts`：前后端共享的 Zod schema 与 TypeScript 类型，是数据模型的唯一事实来源。
- `packages/editor-core`：无 UI 的随机内容、身份、评论、状态栏和项目生成逻辑。
- `.github/workflows`：CI 与 GHCR 多架构镜像发布。
- `Dockerfile`、`docker-compose.yml`：H5 与 API 的单镜像部署。

## 环境与常用命令

要求 Node.js 24–26、pnpm 11.15.1。

```bash
pnpm install
pnpm dev:h5
pnpm dev:server
pnpm dev:weapp

pnpm typecheck
pnpm test
pnpm build:h5
pnpm build:weapp
pnpm build:server
```

H5 开发服务器默认端口为 `10086`，并把 `/api` 代理到 `http://localhost:3000`。微信开发者工具导入 `apps/client`。

注意：H5 与微信小程序共用 `apps/client/dist`，后一次构建会覆盖前一次产物。不要并发执行 `build:h5` 和 `build:weapp`。CI 已通过移动目录分别保存两份产物。

## 实现规则

- 任何持久化数据结构修改先更新 `packages/contracts`，再更新生成逻辑、客户端和服务端；需要兼容旧草稿时提升 `schemaVersion` 并提供迁移。
- 可复用、可测试的随机生成和数据变换放入 `packages/editor-core`，不要埋在页面组件中。
- Taro 代码优先使用 `@tarojs/components` 和 `@tarojs/taro`。必须使用 DOM API 时，用运行环境判断隔离在 H5 路径中。
- 保持 H5 与微信小程序都能编译。改动截图、媒体、触摸事件或存储时，必须同时检查两个平台。
- 不要随意升级 Taro、Webpack 或 Babel。当前 Webpack 固定为 `5.91.0`；共享 workspace TypeScript 源码依赖 `apps/client/config/index.ts` 中的 `compile.include` 和显式 Babel 配置。
- `apps/client/src/index.html` 是 H5 入口模板，删除会导致构建成功但部署根路径没有页面。
- 前端不得包含 AI API Key。服务端生产环境必须提供 `ACCESS_PASSWORD` 和 `SESSION_SECRET`。
- 日志继续脱敏 authorization、password 和图片 data URL。新增敏感字段时同步更新 Fastify redact 配置。

## 设计与交互

- Apple Design 原则只用于编辑器外壳和编辑交互；导出的朋友圈画面必须保持微信视觉，不要做成 Apple 风格。
- 拖动操作需要 1:1 跟手、按下即时反馈、拖动期间不使用延迟过渡，并允许用户随时中断。
- 保留 `prefers-reduced-motion`、`prefers-reduced-transparency` 和高对比度适配。
- 截图只包含手机当前视口，不包含设备边框、编辑器面板、选中框或拖动提示。
- 交互面板可以使用克制的半透明和阴影；截图画面应优先还原微信层级、字号和间距。

## 验证要求

每次代码变更至少运行与改动相关的检查。跨层或发布前改动应运行完整矩阵：

```bash
pnpm typecheck
pnpm test
pnpm build:h5
pnpm build:weapp
pnpm build:server
ACCESS_PASSWORD=test SESSION_SECRET=01234567890123456789012345678901 docker compose config --quiet
```

UI、截图或拖拽改动还要进行真实浏览器和微信开发者工具视觉检查。不能完成的检查必须在交接中明确说明，不能用“编译通过”替代视觉验收。

## 工作树安全

截至 `docs/HANDOFF.md` 的交接时间，本仓库的 MVP 文件尚未形成首个 Git 提交，绝大多数文件都是未跟踪状态。除非用户明确授权，不要运行 `git clean`、`git reset --hard`、递归删除或任何会清除未跟踪文件的命令。先查看 `git status --short --untracked-files=all`。

不要覆盖用户的无关改动。开始新的大阶段前，建议先让用户确认并提交当前基线。

## 完成定义

只有在以下条件同时满足时才可称为完成：需求行为已实现；共享 schema 与 UI/API 一致；相关测试和双端构建通过；截图/交互经过适当视觉验证；部署或环境限制被如实记录；文档与实际命令保持一致。
