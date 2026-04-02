## Why

**Phase: P7 — Web 部署与在线分享**

游戏所有核心功能（P0-P6）已开发完毕，但目前只能在本地运行。为了让其他人能通过一个链接直接在浏览器中游玩，需要将前端静态资源部署到公网，并将 Colyseus 游戏服务器部署到免费云平台。核心原则：**前端可独立运行单人模式**，后端（多人模式）为可选增强。

## What Changes

- **新增部署配置**：添加 GitHub Pages 部署所需的配置（无需构建工具，原生 ES Module 直推）
- **新增服务器地址动态配置**：`NetworkManager` 和 `LobbyScene` 中的 WebSocket 地址从硬编码 `localhost:2567` 改为根据当前环境自动切换（开发/生产）
- **新增 Render 部署配置**：服务端添加 `render.yaml`，配置健康检查端点和环境变量
- **新增连接失败降级**：多人大厅连接 Colyseus 失败时，显示友好提示而非白屏，单人模式仍可正常游玩
- **更新 `rules.md`**：新增部署规范章节，记录托管方案、环境配置、URL 约定
- **新增部署文档**：`DEPLOY.md` 包含完整的一键部署教程

## Capabilities

### New Capabilities
- `deployment`: Web 部署配置与环境管理——动态服务器地址、GitHub Pages 前端托管、Render 后端托管、连接失败降级策略

### Modified Capabilities
- `network-manager`: 服务器地址从硬编码改为环境自适应（开发 `ws://localhost:2567`，生产 `wss://xxx.onrender.com`）
- `lobby`: 大厅场景增加连接失败的错误提示和降级处理（连接失败时仍可选择单人模式）

## Impact

- **新增文件**：`DEPLOY.md`（部署教程）、`render.yaml`（Render 配置）、`.github/` 相关配置（如需 CI/CD）
- **修改文件**：`NetworkManager.js`（动态地址）、`LobbyScene.js`（降级处理）、`rules.md`（新增部署章节）、`server/src/index.ts`（健康检查 + CORS）
- **依赖**：无新增客户端依赖，服务端可能新增 `cors` 中间件
- **Unity 迁移影响**：零影响。所有改动都是 JS 部署层面的，不涉及游戏逻辑或架构变化
