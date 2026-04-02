# 🚀 部署指南 — 俯视角自动射击生存游戏

本指南帮助你将游戏部署到公网，让任何人通过链接即可游玩。

---

## 架构概览

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  前端（GitHub Pages）           后端（Render / 可选）     │
│  https://你.github.io/仓库名/   wss://xxx.onrender.com  │
│  ┌─────────────────────┐       ┌──────────────────────┐ │
│  │ index.html           │      │ Colyseus Server      │ │
│  │ src/*.js (ES Module) │─────▶│ WebSocket 通信       │ │
│  │ assets/*.json        │      │ /health 健康检查     │ │
│  └─────────────────────┘       └──────────────────────┘ │
│                                                          │
│  ⚡ 单人模式：无需后端           🎮 多人模式：需要后端   │
└──────────────────────────────────────────────────────────┘
```

---

## 第一步：前端部署（GitHub Pages）

### 1.1 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角 **+** → **New repository**
3. 填写仓库名（如 `survivor-game`），设为 **Public**
4. 不勾选 "Initialize this repository"，点击 **Create repository**

### 1.2 推送代码到 GitHub

在项目根目录打开终端：

```bash
# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: full game with multiplayer"

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/survivor-game.git

# 推送
git push -u origin main
```

### 1.3 开启 GitHub Pages

1. 进入仓库页面 → **Settings** → 左侧 **Pages**
2. **Source** 选择 `Deploy from a branch`
3. **Branch** 选择 `main`，文件夹选 `/ (root)`
4. 点击 **Save**
5. 等待 1-2 分钟，页面顶部会出现：`Your site is live at https://你的用户名.github.io/survivor-game/`

### 1.4 验证

打开链接，游戏应正常加载。**单人模式**此时已经可以正常游玩！

---

## 第二步：后端部署（Render — 可选，多人模式需要）

### 2.1 注册 Render

1. 打开 [render.com](https://render.com)
2. 使用 GitHub 账号注册/登录

### 2.2 创建 Web Service

1. 点击 **New** → **Web Service**
2. 连接你的 GitHub 仓库（`survivor-game`）
3. 配置：
   - **Name**: `survivor-game-server`（或自定义）
   - **Region**: `Singapore`（亚洲用户推荐）
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. 点击 **Create Web Service**

### 2.3 等待部署

Render 会自动拉取代码、安装依赖、编译 TypeScript 并启动服务。首次部署约需 2-3 分钟。

部署成功后，你会看到类似 `https://survivor-game-server.onrender.com` 的地址。

### 2.4 验证后端

访问 `https://你的服务名.onrender.com/health`，应返回：

```json
{ "status": "ok", "uptime": 123.456 }
```

---

## 第三步：前后端连接

### 3.1 配置前端的服务器地址

编辑 `index.html`，找到：

```html
<meta name="game-server" content="wss://YOUR_SERVER.onrender.com">
```

将 `YOUR_SERVER` 替换为你实际的 Render 服务名：

```html
<meta name="game-server" content="wss://survivor-game-server.onrender.com">
```

### 3.2 推送更新

```bash
git add index.html
git commit -m "Configure production game server URL"
git push
```

GitHub Pages 会在 1-2 分钟后自动更新。

### 3.3 验证多人模式

1. 打开游戏链接
2. 选择角色 → 进入大厅
3. 点击"创建房间" → 应成功创建并进入等待室
4. 用另一个浏览器窗口打开同一链接 → "加入房间" → 应看到两个玩家

---

## 常见问题

### Q: 多人模式点击"创建房间"后一直等待？

Render 免费版有 **15分钟无活动自动休眠** 机制。首次连接可能需要等待约 30 秒服务器唤醒。大厅会显示"⏳ 连接中..."。

### Q: 只想分享单人模式，不需要后端？

完全可以！跳过第二步和第三步，保留 `index.html` 中的默认 meta 标签（`YOUR_SERVER`）即可。单人模式完全在浏览器本地运行，不需要任何服务器。

### Q: 更新代码后怎么部署？

```bash
git add .
git commit -m "Update description"
git push
```

GitHub Pages 和 Render 都会自动拉取最新代码并重新部署。

### Q: 如何查看服务端日志？

在 Render Dashboard → 你的 Web Service → **Logs** 标签页。

### Q: 多人模式连接失败怎么办？

- 检查 `index.html` 中 meta 标签的服务器地址是否正确
- 确认 Render 服务状态为 "Live"
- 某些企业/学校网络可能屏蔽 WebSocket，尝试切换网络
- 大厅会自动显示错误提示，单人模式不受影响

---

## 进阶：自定义域名

如需自定义域名（如 `game.example.com`），请参考：
- [GitHub Pages 自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Render 自定义域名](https://render.com/docs/custom-domains)

---

*最后更新：2026-04-02*
