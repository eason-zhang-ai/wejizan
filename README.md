# 伪集赞

一个以 Web 优先、同时编译微信小程序的朋友圈截图创作工具。它提供完整的朋友圈手机模拟器、可编辑状态栏、精确点赞与评论、原截图叠加、AI 文案辅助和当前手机视口截图。

## 项目文档

- [`AGENTS.md`](AGENTS.md)：Codex 与贡献者的仓库工作规则
- [`docs/PRODUCT.md`](docs/PRODUCT.md)：产品需求、状态与路线优先级
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：系统结构、数据流、构建与技术不变量
- [`docs/HANDOFF.md`](docs/HANDOFF.md)：当前基线、未验证项和新 session 启动提示

## 已实现

- iOS / Android 朋友圈界面：状态栏、导航、封面、主人信息、信息流和微信式互动区
- 生成模式：1–9 张产品图片、最多 100 个点赞昵称、最多 8 条可编辑评论
- 截图叠加模式：上传原朋友圈截图，1:1 拖动点赞/评论块，调整宽度并可替换状态栏
- 4 条随机陪衬朋友圈，可重抽、隐藏和调整顺序
- 状态栏组件拖放、显示值与缩放编辑
- 作者和朋友圈主人昵称/头像替换
- H5 当前手机视口 3× PNG 导出；微信小程序保存到相册
- 匿名本机草稿、私用访问口令、AI 调用限流与敏感日志脱敏
- 默认显示“模拟生成 · 伪集赞”标识，关闭前提供用途警告

## 本地开发

```bash
pnpm install
pnpm dev:h5
pnpm dev:server
```

默认 H5 开发地址由 Taro 输出，API 默认监听 `http://localhost:3000`。复制 `.env.example` 为 `.env` 后配置私用访问口令和可选 AI 服务。

## 构建

```bash
pnpm build:h5
pnpm build:weapp
pnpm build:server
docker build -t wejizan .
```

微信开发者工具请导入 `apps/client`，项目配置会指向编译后的 `dist` 目录。

## Docker 部署

```bash
cp .env.example .env
# 修改 ACCESS_PASSWORD、SESSION_SECRET 以及可选 AI 配置
docker compose up -d --build
```

访问 `http://localhost:3000`。单个镜像同时托管 H5 静态文件和 `/api`；存活检查为 `/api/health/live`。

## GitHub Actions

- `CI`：在 Pull Request 和 `main` 推送时执行类型检查、测试、H5/微信小程序/服务端构建，并上传双端前端产物。
- `Docker image`：在 `main`、`v*` 标签或手动触发时构建 `linux/amd64` 与 `linux/arm64`，推送至 `ghcr.io/<owner>/<repo>`。

AI 后端兼容 OpenAI 风格的 `POST /chat/completions` 服务，通过 `AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL` 配置。

生成内容默认带有“模拟生成 · 伪集赞”标识，仅应用于娱乐、教学和界面原型。
