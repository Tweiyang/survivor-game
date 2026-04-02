## 1. 服务端项目搭建

- [x] 1.1 初始化 `server/` 目录：`package.json`（colyseus + express + ts-node）、`tsconfig.json`。验证：`npm install` 成功
- [x] 1.2 创建入口文件 `server/src/index.ts`：启动 express + Colyseus，端口 2567，注册 BattleRoom。验证：`npm run dev` 后控制台输出 "Colyseus server listening on 2567"
- [x] 1.3 创建 Schema 文件：`PlayerState.ts`、`MonsterState.ts`、`ProjectileState.ts`、`DropState.ts`、`LevelState.ts`、`BattleState.ts`。验证：TypeScript 编译无错误

## 2. BattleRoom 核心逻辑

- [x] 2.1 实现 `BattleRoom.onCreate()` — 初始化 BattleRoomState，设置 maxClients=4。验证：客户端 joinOrCreate 成功创建房间
- [x] 2.2 实现 `BattleRoom.onJoin(client, options)` — 创建 PlayerState（读取 characterId），广播玩家加入。验证：加入后 state.players 新增一条
- [x] 2.3 实现 `BattleRoom.onLeave(client)` — 移除 PlayerState，重算难度缩放。验证：断开后 state.players 移除对应条目
- [x] 2.4 实现 ready/start 流程 — 监听 `"ready"` 消息，全员 ready 后启动 `setSimulationInterval(50)`。验证：所有玩家发送 ready 后游戏循环开始
- [x] 2.5 实现 `"input"` 消息处理 — 解析 `{ seq, dx, dy, dt }`，计算新位置，更新 PlayerState.x/y/inputSeq。验证：发送 input 后 PlayerState 位置更新

## 3. 服务端游戏系统

- [x] 3.1 实现 `ServerPhysics.ts` — 加载 levels.json 地图数据，提供墙壁碰撞检测（复用客户端 AABB 算法）。验证：玩家无法穿墙
- [x] 3.2 实现 `ServerSpawner.ts` — 按 levels.json 配置生成波次怪物，应用难度缩放倍率。验证：多人房间怪物数量 = 基础数量 × 倍率
- [x] 3.3 实现 `ServerAI.ts` — 怪物追击最近玩家逻辑，接触伤害检测。验证：怪物向最近玩家移动
- [x] 3.4 实现 `ServerCombat.ts` — 投射物碰撞检测 + 伤害计算 + 经验分配。验证：击杀怪物后击杀者 exp 增加
- [x] 3.5 实现关卡进度判定 — totalKills 计数、Boss 门开启、通关/全灭判定。验证：击杀数达标后 bossGateOpen=true

## 4. 难度缩放系统

- [x] 4.1 创建 `assets/data/difficulty.json` 配置文件。验证：文件存在且 JSON 格式正确
- [x] 4.2 实现 `DifficultyScaler` 模块 — 从配置读取公式，根据玩家数计算倍率。验证：4 人时倍率 = 2.5
- [x] 4.3 在 ServerSpawner 和 ServerCombat 中集成 DifficultyScaler。验证：2 人房间怪物血量 = 基础 × 1.5

## 5. 客户端 NetworkManager

- [x] 5.1 创建 `src/systems/NetworkManager.js` — 单例，封装 Colyseus Client SDK，管理 mode/sessionId/room/isConnected。验证：import 无报错
- [x] 5.2 实现 connect/disconnect/createRoom/joinRoom/joinOrCreate/getAvailableRooms API。验证：能连接本地 Colyseus 服务器
- [x] 5.3 实现 send/onStateChange/onMessage 消息收发 API。验证：客户端发送 input 消息，服务端收到
- [x] 5.4 实现 offline/online 模式切换逻辑 + EventSystem 网络事件（onNetConnected 等）。验证：offline 模式下 send() 静默忽略

## 6. 客户端预测系统

- [x] 6.1 创建 `src/systems/PredictionSystem.js` — 输入缓冲区（环形数组 128 帧），seq 序列号管理。验证：缓冲区正确存储输入
- [x] 6.2 实现本地预测：每帧立即应用输入到本地玩家位置 + 同时 send 给 Server。验证：按 WASD 立即移动，无延迟感
- [x] 6.3 实现 Server Reconciliation：收到 confirmedSeq 后丢弃旧输入、比对偏差、回滚+重放。验证：Server 校正后玩家位置平滑过渡

## 7. 客户端插值系统

- [x] 7.1 创建 `src/systems/InterpolationSystem.js` — 为远程实体维护状态缓冲区（3 快照）。验证：缓冲区正确存储 Server 位置
- [x] 7.2 实现线性插值：渲染时在两个快照间以 100ms 延迟做插值。验证：远程玩家移动平滑无跳变
- [x] 7.3 实现 buffer underrun 处理：缓冲不足时 snap 到最新位置。验证：新实体首帧不闪烁

## 8. 状态同步器

- [x] 8.1 创建 `StateSynchronizer` 类 — 监听 room.state.players.onAdd/onRemove，创建/销毁远程玩家实体。验证：另一窗口加入后本地出现远程玩家
- [x] 8.2 监听 room.state.monsters.onAdd/onRemove — 创建/销毁同步怪物实体（无 AI 组件）。验证：Server 生成怪物后客户端出现对应表现
- [x] 8.3 监听 room.state.drops — 创建/销毁掉落物表现。验证：怪物死亡后掉落物出现
- [x] 8.4 监听 room.state.levelState 变化 — 触发 Boss 门动画、通关/游戏结束 UI。验证：全队击杀数达标后 Boss 门开启动画播放
- [x] 8.5 监听 Server 自定义消息 damageEvent/sfxEvent/levelUp — 触发伤害飘字、音效、升级 UI。验证：命中怪物时看到伤害数字

## 9. 大厅场景

- [x] 9.1 创建 `src/scenes/LobbyScene.js` — Canvas 绘制大厅 UI（单人按钮、创建房间、加入房间、服务器地址输入）。验证：角色选择后进入大厅界面
- [x] 9.2 实现房间列表面板 — 调用 getAvailableRooms 展示可加入房间。验证：创建房间后其他客户端能看到
- [x] 9.3 实现等待室 UI — 玩家列表 + ready 状态 + 倒计时。验证：全员 ready 后 3 秒倒计时开始
- [x] 9.4 实现 LobbyScene → BattleScene 过渡 — 倒计时结束后切换场景并传递 room 引用。验证：过渡后 BattleScene 使用 online 模式

## 10. 现有系统联网改造

- [x] 10.1 改造 `BattleScene` — 根据 NetworkManager.isOnline 切换本地/联机逻辑。验证：offline 模式行为与改造前完全一致
- [x] 10.2 改造 `CombatSystem` — online 模式不直接 dealDamage，监听 damageEvent 做表现。验证：联机模式伤害由 Server 判定（StateSynchronizer 处理）
- [x] 10.3 改造 `MonsterFactory` — 支持创建同步怪物（无 AI 组件）。验证：联机怪物无本地 AI（StateSynchronizer 移除 ChaseAI）
- [x] 10.4 改造 `PlayerFactory` — 支持创建远程玩家实体（无 InputManager 绑定）。验证：远程玩家显示对应角色外观（StateSynchronizer 移除 PlayerController）
- [x] 10.5 改造 `LevelManager` — online 模式从 room.state.levelState 读取进度。验证：Boss 门由 Server 控制（StateSynchronizer 监听 levelState.bossGateOpen）
- [x] 10.6 改造 `ExperienceSystem` — online 模式从 PlayerState.exp/level 读取。验证：击杀者获得经验，其他玩家不受影响（StateSynchronizer 监听 levelUp 消息）

## 11. HUD 多人信息

- [x] 11.1 在 HUD 中添加队友状态栏（右上角，角色图标 + 名称 + 小血条）。验证：联机时看到队友血量
- [x] 11.2 在 HUD 中添加连接状态指示器和延迟显示（右下角）。验证：联机时显示 ping 和连接状态
- [x] 11.3 offline 模式下隐藏多人 UI 元素。验证：单人模式界面与改造前一致

## 12. 客户端依赖与集成

- [x] 12.1 在客户端 HTML 中引入 Colyseus JS SDK（CDN 或本地 bundle）。验证：`import { Client } from 'colyseus.js'` 无报错
- [x] 12.2 更新 `CharacterSelectScene` — 选角确认后跳转 LobbyScene 而非直接进 BattleScene。验证：选角后进入大厅
- [x] 12.3 更新 `main.js` — 初始化 NetworkManager 单例并挂到 systems。验证：`systems.networkManager` 可用

## 13. 收尾与文档

- [x] 13.1 更新 `rules.md` — 新增 Phase 5 联网系统规范（NetworkManager API、Schema 定义、消息协议、Unity 映射）。验证：rules.md 有完整的联网文档
- [x] 13.2 在 `server/` 目录创建 README.md — 说明启动方式、环境要求、开发调试流程。验证：按 README 能成功启动服务器
- [x] 13.3 端到端验证：单人创建房间可移动，服务端权威物理修复完毕，基础联网链路跑通。验证：Phase 5 基础框架达成
