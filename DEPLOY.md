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

> 💡 **图形化工具**：如果不习惯命令行，可以安装 [TortoiseGit](https://tortoisegit.org/download/)，之后在文件夹空白处右键 → `Git Commit -> "main"` → 写提交说明 → `Commit & Push` 即可（操作方式和 TortoiseSVN 基本一致）。

### 1.3 开启 GitHub Pages

1. 进入仓库页面 → **Settings** → 左侧 **Pages**
2. **Source** 选择 `Deploy from a branch`
3. **Branch** 选择 `main`，文件夹选 `/ (root)`
4. 点击 **Save**
5. **Custom domain** 和 **Enforce HTTPS** 保持默认（不需要填域名，HTTPS 保持勾选）
6. 等待 1-2 分钟，页面顶部会出现：`Your site is live at https://你的用户名.github.io/survivor-game/`

> ⚠️ **关键步骤**：确认项目根目录存在 `.nojekyll` 空文件（仓库中已包含）。该文件告诉 GitHub Pages **不要用 Jekyll 构建**，否则会导致 JS/CSS 文件 404。如果缺失，手动创建即可：
> ```bash
> # 项目根目录创建空文件
> echo. > .nojekyll
> git add .nojekyll && git commit -m "add .nojekyll" && git push
> ```

### 1.4 验证

1. 打开 `https://你的用户名.github.io/survivor-game/`
2. 如果白屏，按 F12 查看 Console 是否有 404 错误
3. 如果有 404，检查：
   - `.nojekyll` 文件是否在仓库根目录
   - Actions 页面（仓库 → Actions 标签）是否部署成功
   - 等 2-3 分钟后再次刷新
4. **单人模式**此时已经可以正常游玩（PC 和手机均支持触屏操作）！

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

### Q: 部署后打开是白屏 / 404？

**最常见原因**：缺少 `.nojekyll` 文件。GitHub Pages 默认使用 Jekyll 构建，会跳过 JS 等静态文件。
1. 进入仓库 → Actions 标签页，查看是否有 Jekyll 构建失败日志
2. 确认根目录存在 `.nojekyll` 文件
3. 强制刷新（Ctrl+Shift+R）或等 2-3 分钟

### Q: Console 显示某个 .js 文件 404？

检查代码中是否有引用不存在的文件。常见于被删除的模块但 import 语句遗留。删掉无效 import 后重新 push。

### Q: 多人模式点击"创建房间"后一直等待？

Render 免费版有 **15分钟无活动自动休眠** 机制。首次连接可能需要等待约 30 秒服务器唤醒。大厅会显示"⏳ 连接中..."。

### Q: 只想分享单人模式，不需要后端？

完全可以！跳过第二步和第三步，保留 `index.html` 中的默认 meta 标签（`YOUR_SERVER`）即可。单人模式完全在浏览器本地运行，不需要任何服务器。

### Q: 手机上打不开 / 按钮点不了？

游戏已支持触屏操作：
- 虚拟摇杆（左下角）控制移动
- 所有 UI 按钮支持触屏点击
- 确保 `index.html` 中 canvas 有 `touch-action: none` CSS 属性
- 如仍有问题，检查 `src/utils/addClickOrTouch.js` 是否存在

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
