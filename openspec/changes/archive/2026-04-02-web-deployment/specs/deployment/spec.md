## ADDED Requirements

### Requirement: GitHub Pages 前端部署
前端静态资源（`index.html`、`src/`、`assets/`）SHALL 可通过 GitHub Pages 直接托管，无需任何构建步骤。所有资源路径 SHALL 使用相对路径。

#### Scenario: GitHub Pages 访问
- **WHEN** 用户通过 `https://<username>.github.io/<repo>/` 访问
- **THEN** 游戏正常加载并进入角色选择界面，单人模式可正常游玩

#### Scenario: 本地开发兼容
- **WHEN** 开发者通过 `http://localhost:8080/` 访问
- **THEN** 游戏行为与 GitHub Pages 部署完全一致

### Requirement: Render 后端部署
Colyseus 游戏服务端 SHALL 可部署到 Render Web Service。服务端 MUST 提供 `/health` HTTP 健康检查端点。服务端 MUST 配置 CORS 允许 GitHub Pages 域名的跨域 WebSocket 连接。

#### Scenario: 健康检查
- **WHEN** Render 平台对 `GET /health` 发起请求
- **THEN** 服务端返回 HTTP 200 和 `{ "status": "ok" }` JSON 响应

#### Scenario: 跨域 WebSocket 连接
- **WHEN** 从 `https://<username>.github.io` 域名发起 WebSocket 连接
- **THEN** 服务端允许该连接（CORS headers 正确配置）

### Requirement: 环境自适应服务器地址
`NetworkManager` SHALL 根据当前页面域名自动选择 Colyseus 服务器地址。本地开发环境（`localhost` / `127.0.0.1`）SHALL 使用 `ws://localhost:2567`。生产环境 SHALL 使用 `wss://` 安全连接。服务器地址 SHALL 可通过 `<meta name="game-server">` 标签覆盖。

<!-- Unity 映射：等价于 Unity ScriptableObject 的环境配置 + BuildSettings -->

#### Scenario: 本地开发自动检测
- **WHEN** 页面在 `localhost` 或 `127.0.0.1` 运行
- **THEN** `NetworkManager` 使用 `ws://localhost:2567`

#### Scenario: 生产环境自动检测
- **WHEN** 页面在非本地域名运行（如 `xxx.github.io`）
- **THEN** `NetworkManager` 使用 meta 标签指定的地址或默认生产地址

#### Scenario: Meta 标签覆盖
- **WHEN** HTML 中存在 `<meta name="game-server" content="wss://custom.example.com">`
- **THEN** `NetworkManager` 使用该自定义地址，忽略默认规则

### Requirement: 连接失败降级
大厅场景 SHALL 在 Colyseus 服务器不可用时优雅降级。"单人游戏"按钮 MUST 始终可用，不依赖服务器连接状态。连接失败时 SHALL 显示友好的错误提示。

#### Scenario: 服务器不可用时创建房间
- **WHEN** 用户点击"创建房间"但 Colyseus 服务器无响应（超时5秒）
- **THEN** 显示红色提示"⚠ 服务器不可用，请稍后重试或选择单人游戏"

#### Scenario: 服务器不可用时单人游戏
- **WHEN** Colyseus 服务器不可用
- **THEN** "单人游戏"按钮正常工作，点击后直接进入战斗

#### Scenario: 服务器冷启动等待
- **WHEN** 用户点击"创建房间"且服务器正在从休眠中唤醒
- **THEN** 显示"正在连接服务器..."加载提示，连接成功后自动进入大厅

### Requirement: 部署文档
项目根目录 SHALL 包含 `DEPLOY.md` 部署教程，覆盖 GitHub Pages 前端部署和 Render 后端部署的完整步骤。

#### Scenario: 首次部署
- **WHEN** 开发者按照 `DEPLOY.md` 步骤操作
- **THEN** 前端和后端均可在15分钟内完成部署并上线运行

### Requirement: 规范文档同步
`rules.md` SHALL 新增部署规范章节（Section 9），记录托管方案选择、环境配置约定、URL 管理规则。

#### Scenario: 规范完整性
- **WHEN** 新开发者阅读 `rules.md`
- **THEN** 能了解部署架构、环境区分方式、服务器地址配置方法
