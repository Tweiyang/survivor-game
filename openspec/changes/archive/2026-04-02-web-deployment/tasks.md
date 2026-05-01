## 1. 服务端部署准备

- [x] 1.1 在 `server/src/index.ts` 中添加 `GET /health` 健康检查端点，返回 `{ "status": "ok" }`。验证：`curl http://localhost:2567/health` 返回 200
- [x] 1.2 在 `server/src/index.ts` 中配置 CORS，允许所有 `*.github.io` 域名的跨域请求。验证：响应头包含正确的 `Access-Control-Allow-Origin`
- [x] 1.3 将服务端监听端口改为从环境变量 `PORT` 读取（Render 会自动分配），默认 `2567`。验证：`PORT=3000 node dist/index.js` 可在 3000 端口启动
- [x] 1.4 在 `server/` 目录下创建 `render.yaml` 配置文件，定义 Web Service 类型、构建命令、启动命令。验证：文件结构符合 Render Blueprint 规范

## 2. 客户端环境自适应

- [x] 2.1 在 `NetworkManager.js` 中实现 `_resolveServerUrl()` 方法，根据 `window.location.hostname` 自动切换开发/生产地址。验证：本地访问使用 `ws://localhost:2567`，非本地域名使用 `wss://` 地址
- [x] 2.2 在 `index.html` 中添加 `<meta name="game-server" content="wss://YOUR_SERVER.onrender.com">` 占位标签（部署时替换）。验证：meta 标签存在且可被 JS 读取
- [x] 2.3 更新 `LobbyScene.js` 中硬编码的 `ws://localhost:2567`，改为调用 `NetworkManager` 的动态地址解析。验证：`LobbyScene` 不再包含硬编码地址

## 3. 连接失败降级

- [x] 3.1 在 `NetworkManager.connect()` 中添加5秒超时保护，超时后 reject。验证：关闭服务端后，`connect()` 在5秒内返回错误
- [x] 3.2 在 `LobbyScene` 的"创建房间"和"加入房间"逻辑中添加 try/catch，连接失败时在界面显示红色错误提示。验证：服务器不可用时点击按钮显示 `⚠ 服务器不可用` 提示
- [x] 3.3 确保"单人游戏"按钮不触发任何网络连接，始终可用。验证：关闭服务端后，单人游戏正常进入战斗

## 4. 部署文档与规范

- [x] 4.1 创建 `DEPLOY.md` 部署教程，包含 GitHub Pages 前端部署步骤（创建仓库、推送代码、开启 Pages）。验证：按文档步骤可在15分钟内完成前端部署
- [x] 4.2 在 `DEPLOY.md` 中补充 Render 后端部署步骤（创建 Web Service、连接仓库、配置环境变量）。验证：按文档步骤可完成后端部署
- [x] 4.3 在 `DEPLOY.md` 中补充"部署后配置"章节：如何修改 `index.html` 中的 meta 标签指向实际 Render 地址。验证：文档包含完整的端到端配置流程
- [x] 4.4 更新 `rules.md` 新增 Section 9（部署规范），记录托管方案、环境配置约定、URL 管理规则。验证：`rules.md` 包含完整的部署架构说明

## 5. 集成测试

- [ ] 5.1 本地测试：启动前端 + 后端，确认单人和多人模式均正常。验证：单人通关 + 多人联机均可运行
- [ ] 5.2 模拟生产测试：关闭后端，仅前端运行，确认单人模式正常 + 多人模式显示降级提示。验证：无后端时单人可玩，多人显示错误提示
