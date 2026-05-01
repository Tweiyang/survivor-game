## Context

当前游戏为纯单机架构，所有游戏逻辑（物理、战斗、AI、关卡进度）在单个浏览器中运行。代码已在关键位置预留了 `[Network]` 注释标记（Entity.networkId/ownerId、CombatSystem、ExperienceSystem、MonsterFactory 等），为联网改造做了接口准备。

Phase 5 需要在不破坏单机体验的前提下，引入 Colyseus 权威服务器实现最多 4 人合作 PvE。采用客户端预测 + 服务器校正方案保证操作流畅性。

**约束条件**：
- JS→Unity 双轨策略：所有网络抽象层须标注 Unity 等价（Netcode for GameObjects / Mirror）
- 服务端使用 TypeScript 以最大化与客户端 JS 的代码复用
- 先 localhost 开发验证，暂不考虑云部署

## Goals / Non-Goals

**Goals:**
- G1: 最多 4 人在线合作 PvE，同一关卡内协作战斗
- G2: 客户端预测 + 服务器校正，本地操作零延迟感知
- G3: 远程实体平滑插值，无视觉跳变
- G4: 单机/联机模式无缝切换（NetworkManager 抽象层）
- G5: 服务器权威的伤害计算、经验分配、关卡进度
- G6: 数据驱动的多人难度缩放

**Non-Goals:**
- NG1: PvP 对抗模式（仅 PvE）
- NG2: 跨局域网/公网部署（先 localhost）
- NG3: 断线重连（首版不做，后续迭代）
- NG4: 观战模式
- NG5: 服务端反作弊（信任客户端输入的合法性，仅验证格式）

## Decisions

### D1: 网络框架 — Colyseus

**选择**: Colyseus (Node.js)
**替代方案**: Socket.IO / 自研 WebSocket / Photon
**理由**: Colyseus 专为实时多人游戏设计，内建 Schema-based 自动增量状态同步、房间管理、客户端 SDK。开箱即用的 matchmaking 和 state patching 大幅降低开发量。TypeScript 服务端与客户端 JS 代码复用方便。

**Unity 映射**: Colyseus → Netcode for GameObjects / Mirror Networking

### D2: 网络拓扑 — 权威服务器

**选择**: 专用权威服务器（Dedicated Authoritative Server）
**替代方案**: Host-Client（一个玩家做 Host）/ P2P
**理由**: 权威服务器防作弊、状态一致性最好。Colyseus 天然支持此模式。Host-Client 有"房主退出全崩"问题。

### D3: 同步策略 — 客户端预测 + 服务器校正 + 实体插值

```
┌─────────────────────────────────────────────────────────────┐
│                    同步策略分层                               │
│                                                              │
│  本地玩家:   Client-Side Prediction + Reconciliation        │
│             输入立即生效 → 收到 Server 确认 → 偏差校正       │
│                                                              │
│  远程玩家:   Entity Interpolation (100ms 缓冲)              │
│             Server 状态包之间做线性插值                       │
│                                                              │
│  怪物:      Entity Interpolation (同远程玩家)               │
│             Server 20Hz 广播位置                             │
│                                                              │
│  投射物:    本地预测生成 + Server 确认命中                    │
│             远程投射物收到即创建                               │
│                                                              │
│  掉落物:    Server 广播生成 → Client 创建表现                │
│             拾取由 Server 判定                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Unity 映射**: NetworkTransform (Interpolation) + ClientNetworkTransform (Prediction)

### D4: 服务器 Tick Rate — 20Hz

**选择**: Server 以 20Hz（50ms）运行游戏逻辑
**替代方案**: 30Hz / 60Hz
**理由**: 20Hz 对 PvE 合作足够，CPU 和带宽开销低。客户端 60fps 渲染通过插值填补帧间隙。

### D5: Colyseus Schema 状态设计

```
BattleRoomState (Schema)
  ├── players: MapSchema<PlayerState>
  │     ├── sessionId: string
  │     ├── characterId: string     // warrior/mage/ranger
  │     ├── x, y: number            // 位置（服务器权威）
  │     ├── hp, maxHp: number
  │     ├── level, exp: number
  │     ├── kills: number           // 个人击杀
  │     ├── alive: boolean
  │     ├── inputSeq: number        // 最后处理的输入序号（用于 reconciliation）
  │     └── skills: ArraySchema<SkillEntry>
  │
  ├── monsters: MapSchema<MonsterState>
  │     ├── id, type: string
  │     ├── x, y: number
  │     ├── hp, maxHp: number
  │     └── alive: boolean
  │
  ├── projectiles: MapSchema<ProjectileState>
  │     ├── id, ownerId: string
  │     ├── x, y, dx, dy: number
  │     ├── speed, damage: number
  │     └── alive: boolean
  │
  ├── drops: MapSchema<DropState>
  │     ├── id, type: string
  │     ├── x, y: number
  │     └── collected: boolean
  │
  ├── levelState: LevelStateSchema
  │     ├── currentLevel: number
  │     ├── totalKills: number       // 全队击杀总数（开门用）
  │     ├── bossGateOpen: boolean
  │     ├── bossAlive: boolean
  │     └── phase: string            // "waiting" | "battle" | "boss" | "complete"
  │
  └── config: ConfigSchema
        ├── maxPlayers: number (4)
        ├── tickRate: number (20)
        └── difficultyScale: number
```

### D6: 消息协议 (Client → Server)

```
"input"         { seq, dx, dy, dt }         // 每帧移动意图
"selectChar"    { characterId }              // 选择角色
"ready"         { }                          // 准备开始
"skillChoice"   { skillId }                  // 升级选技能
"useSkill"      { }                          // 释放主动技能
```

客户端只发送**意图**（输入方向），不发送**结果**（新位置、伤害值）。服务器计算一切。

### D7: 消息协议 (Server → Client)

除了 Colyseus 自动的 Schema State Patch 外，还需要自定义消息用于一次性事件：

```
"damageEvent"   { targetId, damage, isCrit, killerId }   // 伤害飘字
"sfxEvent"      { soundId, x, y }                         // 远程音效
"levelUp"       { playerId, newLevel, skillOptions[] }    // 升级选项
"notification"  { text, type }                            // 系统消息
```

### D8: NetworkManager 单机/联机模式切换

```
┌────────────────────────────────────┐
│         NetworkManager             │
│  (Unity: NetworkManager 单例)      │
│                                    │
│  mode: 'offline' | 'online'       │
│                                    │
│  offline 模式:                     │
│    所有逻辑在本地运行（现状不变）    │
│    不连接 Server                   │
│                                    │
│  online 模式:                      │
│    连接 Colyseus Server            │
│    输入发送到 Server               │
│    状态从 Server State 同步        │
│                                    │
│  切换点: LobbyScene                │
│    选择"单人游戏" → offline        │
│    选择"创建/加入房间" → online     │
│                                    │
└────────────────────────────────────┘
```

### D9: 经验分配 — 击杀者独享

**选择**: 谁的投射物最终击杀怪物，经验归谁
**替代方案**: 全队共享 / 按伤害分配
**理由**: 最简单直接，与现有 ExperienceSystem 改动最小。各玩家独立升级、独立选技能。

### D10: 难度缩放公式

```json
// difficulty.json (数据驱动)
{
    "scalingFormula": "linear",
    "baseMultiplier": 1.0,
    "perPlayerAdd": 0.5,
    "fields": {
        "monsterHp": true,
        "monsterCount": true,
        "monsterDamage": false,
        "bossHp": true
    }
}
```

`multiplier = baseMultiplier + (playerCount - 1) * perPlayerAdd`

| 人数 | 倍率 | 效果 |
|------|------|------|
| 1人 | 1.0x | 基础难度 |
| 2人 | 1.5x | 怪物血量/数量 ×1.5 |
| 3人 | 2.0x | 怪物血量/数量 ×2.0 |
| 4人 | 2.5x | 怪物血量/数量 ×2.5 |

### D11: 项目结构

```
f:\AITestYCWJ\
  ├── server/                        # 新增: Colyseus 服务端
  │   ├── package.json
  │   ├── tsconfig.json
  │   ├── src/
  │   │   ├── index.ts               # 入口 (express + Colyseus)
  │   │   ├── rooms/
  │   │   │   └── BattleRoom.ts      # 战斗房间核心逻辑
  │   │   ├── schema/
  │   │   │   ├── BattleState.ts     # 房间状态 Schema
  │   │   │   ├── PlayerState.ts
  │   │   │   ├── MonsterState.ts
  │   │   │   ├── ProjectileState.ts
  │   │   │   ├── DropState.ts
  │   │   │   └── LevelState.ts
  │   │   ├── systems/               # 服务端游戏逻辑
  │   │   │   ├── ServerPhysics.ts   # 碰撞检测 (复用算法)
  │   │   │   ├── ServerCombat.ts    # 伤害计算
  │   │   │   ├── ServerAI.ts        # 怪物寻路
  │   │   │   └── ServerSpawner.ts   # 波次生成器
  │   │   └── config/
  │   │       └── difficulty.json    # 难度缩放配置
  │   └── assets/data/               # 符号链接 → 根目录 assets/data (共享配置)
  │
  ├── src/                           # 客户端 (修改)
  │   ├── systems/
  │   │   ├── NetworkManager.js      # 新增
  │   │   ├── PredictionSystem.js    # 新增: 本地预测 + 回滚
  │   │   └── InterpolationSystem.js # 新增: 远程实体插值
  │   ├── scenes/
  │   │   └── LobbyScene.js          # 新增: 大厅
  │   └── ...
  └── assets/data/
      ├── difficulty.json            # 新增: 难度缩放配置
      └── ... (现有)
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **代码复用困难** — 服务端 TS 和客户端 JS 的游戏逻辑需要双写 | 高 | 服务端以简化逻辑为主（只做判定不做渲染），共享 JSON 配置文件 |
| **投射物同步带宽** — 4 人同时射击，投射物数量爆炸 | 中 | 投射物不通过 Schema 同步，改用消息事件（创建/销毁），客户端本地模拟飞行 |
| **客户端预测复杂度** — Reconciliation 回滚逻辑容易出 bug | 高 | 先实现简单预测（只预测移动），复杂系统（战斗/技能）不做预测 |
| **单机模式回退** — 需要保证 offline 模式不受联网代码影响 | 中 | NetworkManager 提供 isOnline 判断，所有联网逻辑用 if 分支隔离 |
| **Colyseus 版本兼容** — SDK 版本不匹配导致连接失败 | 低 | 锁定 Colyseus 0.15.x 版本，客户端/服务端统一 |

## Open Questions

- Q1: 投射物是否需要通过 Schema 同步？还是用消息事件（轻量但不自动 delta）？→ 暂定消息事件
- Q2: 玩家掉线后怪物是否停止攻击该玩家的残留实体？→ 暂定直接移除
- Q3: 是否需要房间密码/私人房间？→ 首版不做
