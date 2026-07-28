# 伪集赞

一个以 Web 优先、同时编译微信小程序的纯前端朋友圈截图创作工具。它提供完整的朋友圈手机模拟器、可编辑状态栏、精确点赞与评论、原截图叠加、可选的自带密钥 AI 文案辅助和当前手机视口截图。

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
- 匿名本机草稿与多套本机 AI 配置；密钥由用户自行配置且仅存于当前设备
- 默认显示“模拟生成 · 伪集赞”标识，关闭前提供用途警告

## 本地开发

```bash
pnpm install
pnpm dev:h5
```

默认 H5 开发地址为 `http://localhost:10086`。不需要 `.env`、访问口令或项目提供的 AI 服务。

## 构建

```bash
pnpm build:h5
pnpm build:weapp
```

微信开发者工具请导入 `apps/client`，项目配置会指向编译后的 `dist` 目录。

## AI 配置

在编辑器的「AI」页签添加一套 OpenAI 兼容配置，填写名称、API 地址、API Key 与模型名后即可使用。密钥和配置保存在当前浏览器或小程序的本机存储中，不会被写入项目草稿或发送到本项目服务器。

H5 中，AI 服务必须允许浏览器跨域请求（CORS）；微信小程序中，还需要在微信开发者后台将该服务添加为请求合法域名。未配置或不兼容的服务不会影响编辑和导出功能。

## GitHub Actions

- `CI`：在 Pull Request 和 `main` 推送时执行类型检查、测试、H5/微信小程序构建，并上传双端前端产物。
- `部署 GitHub Pages`：每次推送 `main`（或手动触发）时，构建 H5 并部署到 GitHub Pages。首次使用时，请在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。

AI 直连兼容 OpenAI 风格的 `POST /v1/chat/completions` 服务。

生成内容默认带有“模拟生成 · 伪集赞”标识，仅应用于娱乐、教学和界面原型。
