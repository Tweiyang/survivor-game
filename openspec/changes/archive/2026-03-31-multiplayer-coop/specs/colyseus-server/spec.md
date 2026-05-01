## Purpose
Colyseus 服务端项目，包含 BattleRoom 房间逻辑、Schema 状态定义、服务端游戏系统。服务器为一切游戏逻辑的权威方。

## ADDED Requirements

### Requirement: Server project bootstraps Colyseus with BattleRoom
服务端 SHALL 提供 Node.js + TypeScript 项目，入口文件启动 express + Colyseus（Unity: Dedicated Server Build）。
服务端 SHALL 注册 `BattleRoom` 房间类型，支持最多 4 人加入。
服务端 SHALL 在端口 2567 启动 WebSocket 监听。

#### Scenario: Server starts
- **WHEN** 执行 `npm run dev`
- **THEN** Colyseus 服务器在 `ws://localhost:2567` 启动，控制台输出 "Colyseus server listening on 2567"

#### Scenario: Room created
- **WHEN** 第一个客户端调用 `joinOrCreate('battle')`
- **THEN** Server 创建 BattleRoom 实例，分配 roomId

### Requirement: BattleRoom manages game lifecycle
BattleRoom SHALL 管理以下生命周期阶段（Unity: GameManager 状态机）：
- `waiting` — 等待玩家加入和准备
- `battle` — 战斗进行中
- `boss` — Boss 阶段
- `complete` — 关卡通关
- `gameover` — 全员死亡

BattleRoom SHALL：
- `onCreate()` 中初始化 BattleRoomState Schema
- `onJoin(client, options)` 中创建 PlayerState，读取 `options.characterId` 设置角色
- `onLeave(client)` 中移除 PlayerState 和对应实体
- 当所有玩家 ready 时启动 `setSimulationInterval(callback, 50)` 以 20Hz tick
- 每个 tick 中调用 ServerPhysics、ServerCombat、ServerAI、ServerSpawner

#### Scenario: All players ready
- **WHEN** 房间内所有玩家发送 `"ready"` 消息
- **THEN** `levelState.phase` 变为 `"battle"`，启动游戏循环

#### Scenario: Player leaves mid-game
- **WHEN** 一个玩家断开连接
- **THEN** 其 PlayerState 被移除，难度缩放动态调整

#### Scenario: All players dead
- **WHEN** 所有 PlayerState.alive 均为 false
- **THEN** `levelState.phase` 变为 `"gameover"`

### Requirement: Schema defines authoritative game state
BattleRoomState Schema SHALL 包含以下字段（全部由服务器计算和修改）：
- `players: MapSchema<PlayerState>` — 以 sessionId 为 key
- `monsters: MapSchema<MonsterState>` — 以自增 ID 为 key
- `projectiles: MapSchema<ProjectileState>` — 以自增 ID 为 key（或用消息事件替代）
- `drops: MapSchema<DropState>` — 掉落物
- `levelState: LevelStateSchema` — 关卡进度

PlayerState SHALL 包含 `inputSeq: number`，每次处理玩家输入后更新为该输入的 seq，客户端据此做 Reconciliation。

#### Scenario: State auto-syncs to clients
- **WHEN** Server 修改 `monsters["m1"].x = 100`
- **THEN** Colyseus 自动将 delta patch 发送到所有客户端

### Requirement: Server processes player input
BattleRoom SHALL 监听 `"input"` 消息，提取 `{ seq, dx, dy, dt }`。
Server SHALL 按以下步骤处理：
1. 从 `players` 中查找对应 PlayerState
2. 读取角色 moveSpeed（从 characters.json 配置）
3. 计算新位置：`x += dx * moveSpeed * dt`, `y += dy * moveSpeed * dt`
4. 碰撞检测：调用 ServerPhysics 检查墙壁碰撞，阻止穿墙
5. 更新 PlayerState.x, PlayerState.y
6. 更新 PlayerState.inputSeq = seq

#### Scenario: Move with wall collision
- **WHEN** 玩家输入 `{ dx: 1, dy: 0 }` 但右侧是墙壁
- **THEN** Server 阻止移动，PlayerState 位置不变，inputSeq 仍更新

### Requirement: Server runs monster AI and spawner
BattleRoom SHALL 在每个 tick 中运行 ServerAI（Unity: NavMeshAgent 服务端模拟）：
- 遍历所有存活怪物，执行追击 AI 逻辑（向最近玩家移动）
- 怪物碰到玩家时造成接触伤害
- ServerSpawner SHALL 按 levels.json 配置生成波次怪物
- 怪物数量 SHALL 乘以难度缩放倍率

#### Scenario: Monster chases nearest player
- **WHEN** 房间有 2 个玩家，怪物距玩家 A 100px、距玩家 B 200px
- **THEN** 怪物向玩家 A 移动

### Requirement: Server handles combat and drops
BattleRoom SHALL 在每个 tick 中运行 ServerCombat（Unity: 服务端伤害计算）：
- 检测投射物与怪物/Boss 的碰撞
- 命中时计算伤害（使用 formulas.json 公式）
- 发送 `"damageEvent"` 消息给所有客户端（用于伤害飘字和音效）
- 怪物死亡时：
  - 更新 `levelState.totalKills`
  - 给击杀者 PlayerState 增加 `kills` 和 `exp`
  - 在 `drops` 中新增掉落物
  - 检查是否触发 Boss 门开启
- 经验达到升级阈值时，发送 `"levelUp"` 消息给对应客户端

#### Scenario: Kill enemy awards exp to killer
- **WHEN** 玩家 A 的投射物击杀怪物
- **THEN** 玩家 A 的 PlayerState.exp 增加，其他玩家不受影响

#### Scenario: Boss gate opens
- **WHEN** totalKills 达到 levels.json 中配置的阈值
- **THEN** `levelState.bossGateOpen` 变为 true
