## Context

游戏已完成全部 P0-P6 开发阶段，包含完整的单人和多人联机体验。当前只能通过本地 HTTP 服务器 + 本地 Colyseus 服务端运行。目标是让任何人通过一个 URL 链接即可在浏览器中直接游玩，且单人模式不依赖后端服务。

当前技术栈：
- 前端：纯 HTML + ES Module（原生 `import/export`）+ Canvas 2D，无打包工具
- 后端：Node.js + TypeScript + Colyseus v0.15，端口 2567
- 外部依赖：Colyseus JS SDK 通过 unpkg CDN 加载，无其他第三方库

## Goals / Non-Goals

**Goals:**
- 任何人通过链接即可打开游戏，在浏览器中游玩单人模式
- 多人模式在后端可用时正常运行，后端不可用时优雅降级
- 部署流程尽可能简单（git push 即部署）
- 零影响 Unity 迁移路线

**Non-Goals:**
- 不引入 Webpack/Vite 等构建工具（保持原生 ES Module）
- 不做用户账号系统
- 不做自动扩容/负载均衡
- 不做自定义域名配置（使用平台默认域名）

## Decisions

### 1. 前端托管：GitHub Pages

**选择**：GitHub Pages（`username.github.io/repo-name/`）

**替代方案**：Vercel、Netlify、Cloudflare Pages

**理由**：
- 项目使用原生 ES Module，无需构建步骤，GitHub Pages 直接托管静态文件最为简单
- `git push` 即部署，零配置
- 免费无限带宽
- 其他平台功能更强但对此项目过剩

**注意**：GitHub Pages 默认部署在子路径 `/<repo-name>/`，所有资源引用需使用相对路径（当前已是）。

### 2. 后端托管：Render Web Service

**选择**：Render（免费 Web Service）

**替代方案**：Railway、Fly.io

**理由**：
- 免费额度（750小时/月）足够小规模使用
- 原生支持 WebSocket（Colyseus 依赖）
- 支持从 GitHub 自动部署
- 配置简单：只需 `render.yaml` + 环境变量

**限制**：
- 15分钟无活动自动休眠，首次访问冷启动约30秒
- 免费版 512MB RAM，同时支持约 10-20 个玩家

### 3. 服务器地址策略：环境自适应

**方案**：在 `NetworkManager.js` 中根据 `window.location.hostname` 自动判断环境：

```javascript
_resolveServerUrl() {
    // 显式指定的 URL 优先
    if (this._explicitServerUrl) return this._explicitServerUrl;
    
    const host = window.location.hostname;
    
    // 本地开发
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'ws://localhost:2567';
    }
    
    // 生产环境：从 meta 标签或配置文件读取
    const meta = document.querySelector('meta[name="game-server"]');
    if (meta) return meta.content;
    
    // 默认生产地址（部署时配置）
    return 'wss://your-game-server.onrender.com';
}
```

**Unity 映射**：此逻辑等价于 Unity 的 `ScriptableObject` 配置或 `BuildSettings` 环境区分，迁移时替换为 Unity 的配置系统。

### 4. 连接失败降级：单人模式始终可用

**策略**：
- `LobbyScene` 的"创建房间/加入房间"按钮点击时尝试连接
- 连接失败（超时/拒绝）时显示红色提示："⚠ 服务器不可用，仅单人模式可用"
- "单人游戏"按钮始终可点击，不依赖服务器连接
- `NetworkManager.connect()` 添加超时保护（5秒）

### 5. 服务端跨域与健康检查

Render 需要 HTTP 健康检查端点来确认服务存活。当前 `server/src/index.ts` 使用 Express，需新增：
- `GET /health` → 返回 `200 OK`
- CORS headers 允许 GitHub Pages 域名跨域 WebSocket

### 6. 仓库结构：单仓库，前端子路径部署

**方案**：GitHub Pages 从 `main` 分支的根目录部署（包含 `index.html`）。`server/` 和 `openspec/` 目录虽然也会被推送，但不影响前端运行。

排除方案：`server/` 拆分为独立仓库 — 增加维护复杂度，且 `server/` 需要读取 `assets/data/` 中的共享 JSON 配置。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Render 免费版15分钟休眠 | 多人模式首次连接等30秒 | 大厅显示"正在唤醒服务器..."加载提示 |
| Render 免费版 RAM 限制 | 超过10-20人可能 OOM | 当前游戏最多4人一个房间，够用 |
| GitHub Pages 缓存 | 更新后用户看到旧版 | 资源 URL 加 `?v=hash` 版本号 |
| WebSocket 被某些防火墙阻断 | 部分网络环境无法多人游戏 | 已有降级：单人模式不受影响 |
| `server/` 暴露在 GitHub Pages 中 | 无安全风险（TypeScript 源码不含密钥） | 环境变量通过 Render 后台配置，不入仓库 |
