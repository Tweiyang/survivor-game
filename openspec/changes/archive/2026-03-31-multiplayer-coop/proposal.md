## Why

当前游戏仅支持单人模式，Phase 5（P5）的核心目标是实现 **多人在线合作 PvE**，让最多 4 名玩家在同一关卡中协作战斗。这是吸血鬼幸存者类游戏的高价值玩法模式，能显著提升游戏粘性和社交体验。联网能力也是 Unity 迁移后上线运营的前提条件。

## What Changes

- **新增 Colyseus 服务端项目**：在 `server/` 目录下搭建 Node.js + Colyseus 权威服务器，负责怪物 AI、伤害计算、关卡进度等核心逻辑
- **新增客户端 NetworkManager 抽象层**：封装 Colyseus SDK 连接、消息收发，支持单机/联机模式无缝切换
- **新增客户端预测 + 服务器校正系统**：本地玩家输入立即生效（预测），服务器确认后校正偏差（Reconciliation），保证操作流畅性
- **新增实体插值系统**：远程玩家和怪物通过位置插值平滑显示，消除网络抖动
- **新增大厅/房间场景 (LobbyScene)**：创建/加入房间 → 等待玩家 → 全员准备 → 开始战斗
- **新增多人难度缩放**：怪物血量/数量随玩家人数线性缩放，公式数据驱动可配置
- **修改现有战斗系统**：伤害计算、死亡判定、经验分配改为服务器权威
- **修改现有场景流程**：角色选择 → 大厅 → 战斗的完整联机流程
- **经验系统**：谁击杀的怪物谁获得经验，各玩家独立升级选技能

## Capabilities

### New Capabilities
- `network-manager`: 网络管理抽象层，封装 Colyseus Client SDK，管理连接/断线/重连，提供单机/联机模式切换
- `network-sync`: 状态同步系统，包含客户端预测（Client Prediction）、服务器校正（Server Reconciliation）和远程实体插值（Entity Interpolation）
- `colyseus-server`: Colyseus 服务端项目，包含 BattleRoom 房间逻辑、Schema 状态定义、服务端游戏系统（AI/战斗/生成）
- `lobby`: 大厅/房间场景，创建房间、加入房间、玩家列表、准备状态、开始游戏的完整流程
- `difficulty-scaling`: 多人难度缩放系统，根据房间玩家数量动态调整怪物属性和数量

### Modified Capabilities
- `combat`: CombatSystem 需支持服务器权威模式，客户端不再直接调用 dealDamage，改为发送攻击意图
- `monsters`: 怪物生成和 AI 逻辑需迁移到服务端执行，客户端仅接收状态做插值表现
- `physics`: PhysicsSystem 需在服务端也能运行，碰撞检测由服务器权威
- `scene-management`: SceneManager 需支持联机场景流程（选角 → 大厅 → 战斗）
- `level-manager`: 关卡进度（击杀计数、Boss 门、通关）改为服务端权威判定
- `hud`: HUD 需显示多玩家信息（队友血条、联机状态指示器）
- `drops`: 经验球拾取改为服务器权威判定，谁拾取谁得经验

## Impact

- **新增依赖**：`colyseus.js`（客户端 SDK）、`@colyseus/core` + `@colyseus/ws-transport`（服务端）
- **新增服务端项目**：`server/` 目录，Node.js + TypeScript
- **代码改动范围**：`BattleScene`、`CombatSystem`、`EntityManager`、`PhysicsSystem`、`ExperienceSystem`、`LevelManager`、`MonsterFactory`、`ProjectileFactory`、`HUD`、`PlayerFactory`
- **预留接口激活**：Entity.networkId、Entity.ownerId 将被正式使用
- **开发/测试需要**：至少两个浏览器窗口 + 本地 Colyseus Server 同时运行
