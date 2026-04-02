## Context

Phase 1 在 Phase 0 引擎骨架之上构建基础战斗系统。Phase 0 已提供：Entity/Component 框架、GameLoop、Canvas 2D 渲染、AABB/Circle 碰撞检测、InputManager、Scene/SceneManager。

本阶段核心目标：让游戏"可玩"——玩家自动射击怪物、怪物追踪玩家、击杀掉落经验球、受伤死亡。

关键约束（来自 rules.md）：
- 吸血鬼幸存者式：玩家只控制移动，自动攻击最近敌人
- 所有数值来自 JSON 配置，不硬编码
- 预留联网注释（`/* Network: ... */`）
- 组件模式，1:1 映射 Unity

## Goals / Non-Goals

**Goals:**
- 实现完整的伤害计算管线（攻击→投射物→碰撞→伤害→死亡→掉落）
- 实现怪物追踪 AI（朝玩家移动并近身攻击）
- 实现经验球掉落和磁吸拾取机制
- 实现基础 HUD（血条/经验条）和死亡界面
- 所有战斗数值通过 JSON 配置驱动
- 预留联网标注

**Non-Goals:**
- 不实现技能系统（P2）
- 不实现关卡波次系统（P3，但 BattleScene 会有简单的怪物定时生成）
- 不实现 Boss（P3）
- 不实现升级奖励（P2，P1 只做经验收集和升级事件触发）
- 不实现复杂怪物 AI（巡逻、走位、多阶段——P3）
- 不实现精英怪（P2/P3）

## Decisions

### D1: 战斗管线流程

```
┌─────────── 攻击流程 ────────────────────────────────────────────┐
│                                                                  │
│  AutoAttackComponent (每 attackInterval 秒)                      │
│       │                                                          │
│       ├─ 1. 扫描范围内敌人 (PhysicsSystem.overlapCircle)         │
│       ├─ 2. 选择最近目标                                         │
│       ├─ 3. 计算朝向角度                                         │
│       └─ 4. 调用 ProjectileFactory.create() 生成投射物           │
│              │                                                    │
│              ▼                                                    │
│  ProjectileComponent (子弹飞行)                                  │
│       │                                                          │
│       ├─ 每帧按方向 + 速度移动                                    │
│       ├─ ColliderComponent (isTrigger=true) 检测碰撞             │
│       └─ 碰撞到敌方 → 调用 CombatSystem.dealDamage()            │
│              │                                                    │
│              ▼                                                    │
│  CombatSystem.dealDamage(attacker, target, baseDamage)           │
│       │  /* Network: 伤害应由 Host/服务器计算 */                  │
│       │                                                          │
│       ├─ 1. 获取 attacker 的 CombatComponent                    │
│       ├─ 2. 计算暴击判定                                         │
│       ├─ 3. 计算最终伤害 (baseDmg × critMult - def × defRatio)  │
│       ├─ 4. 调用 target.HealthComponent.takeDamage(finalDmg)    │
│       └─ 5. 触发事件 EventSystem.emit('onDamage', {...})        │
│              │                                                    │
│              ▼                                                    │
│  HealthComponent.takeDamage(amount)                              │
│       │                                                          │
│       ├─ hp -= amount                                            │
│       ├─ 触发受击闪烁效果                                        │
│       └─ if hp <= 0 → die()                                     │
│              │                                                    │
│              ▼                                                    │
│  HealthComponent.die()                                           │
│       │  /* Network: 死亡判定应由服务器权威 */                    │
│       │                                                          │
│       ├─ 触发 EventSystem.emit('onDeath', entity)               │
│       ├─ 怪物：DropItemFactory.spawnDrops() → 经验球            │
│       ├─ 玩家：触发 GameOver 流程                                │
│       └─ EntityManager.remove(entity)                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### D2: 怪物 AI 设计

```
┌─────── ChaseAI 状态机 ────────┐
│                                │
│   ┌─────────┐                 │
│   │  IDLE   │ ← 距离 > 检测范围│
│   └────┬────┘                 │
│        │ 距离 < detectionRange │
│        ▼                      │
│   ┌─────────┐                 │
│   │  CHASE  │ ← 朝玩家移动    │
│   └────┬────┘                 │
│        │ 距离 < attackRange    │
│        ▼                      │
│   ┌─────────┐                 │
│   │ ATTACK  │ ← 近身攻击     │
│   └────┬────┘  (cooldown)     │
│        │ 距离 > attackRange    │
│        ▼                      │
│   回到 CHASE                   │
│                                │
└────────────────────────────────┘
```

**映射**: AI 状态机 → Unity 可用 Animator StateMachine 或自定义 FSM

怪物近身攻击采用**直接 OverlapCircle 伤害**（不生成投射物），与玩家的远程投射物攻击形成差异。

### D3: 经验球 & 磁吸拾取

```
怪物死亡 → 掉落 N 个经验球（数量=怪物经验值/单球经验）
       │
       ▼
经验球在地面静止
       │
       │ 玩家距离 < pickupRange (磁吸范围，约 80px)
       ▼
经验球朝玩家加速飞行 (磁吸效果)
       │
       │ 碰撞到玩家 (Trigger)
       ▼
ExperienceSystem 增加经验 → 检查升级
       │
       └─ 升级时触发 EventSystem.emit('onLevelUp', {level, ...})
          /* P2 在此挂载技能选择弹窗 */
```

### D4: 受击反馈 — 闪烁效果

当实体受到伤害时，SpriteRenderer 闪烁白色 0.1 秒（3 帧），通过修改 `color` 和 `opacity` 实现。

不新增组件，由 HealthComponent.takeDamage() 内部设置闪烁计时器，update 时恢复。

### D5: HUD 渲染方案

HUD 使用 **Canvas 叠加绘制**（非 DOM），保持与游戏渲染一致：

```
┌──────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐                │
│  │ ❤ ██████████████░░░░  85/100 HP     │  ← 血条(顶部) │
│  │ ★ ████████░░░░░░░░░░  120/300 EXP   │  ← 经验条     │
│  │ Lv.3   Kills: 42                    │  ← 等级/击杀   │
│  └──────────────────────────────────────┘                │
│                                                          │
│                    (游戏画面)                              │
│                                                          │
│                                                          │
│          [怪物头顶小血条]                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

怪物血条：跟随怪物 SpriteRenderer 上方绘制，由 HealthComponent 提供数据。

### D6: 配置数据结构

**player.json:**
```json
{
    "maxHp": 100,
    "attack": 10,
    "defense": 2,
    "critRate": 0.05,
    "critMultiplier": 1.5,
    "moveSpeed": 150,
    "attackSpeed": 1.5,
    "attackRange": 200,
    "projectileSpeed": 400,
    "pickupRange": 80
}
```

**monsters.json:**
```json
{
    "slime": {
        "name": "史莱姆",
        "maxHp": 30,
        "attack": 5,
        "defense": 0,
        "moveSpeed": 60,
        "detectionRange": 200,
        "attackRange": 30,
        "attackCooldown": 1.0,
        "expValue": 10,
        "color": "#44CC44",
        "size": 24,
        "shape": "circle"
    },
    "bat": {
        "name": "蝙蝠",
        "maxHp": 15,
        "attack": 8,
        "defense": 0,
        "moveSpeed": 100,
        "detectionRange": 250,
        "attackRange": 25,
        "attackCooldown": 0.8,
        "expValue": 15,
        "color": "#8844AA",
        "size": 20,
        "shape": "triangle"
    }
}
```

**formulas.json:**
```json
{
    "defenseRatio": 0.5,
    "baseCritMultiplier": 1.5,
    "levelScaling": 1.1,
    "expPerBall": 5,
    "baseExpToLevel": 50,
    "expLevelMultiplier": 1.3
}
```

### D7: 怪物生成策略（P1 简化版）

P1 不做完整波次系统（P3），采用简化的**持续生成策略**：
- BattleScene 维护 `maxMonsters` 上限（如 15）
- 每隔 `spawnInterval` 秒（如 3 秒），在玩家周围 `spawnRadius`（300-500px）随机位置生成怪物
- 当怪物数量达到上限时停止生成
- 随时间推移，可略微增加生成频率（简单难度曲线）

### D8: Entity 联网预留字段

```javascript
// Entity.js 新增字段
this.networkId = null;    /* Network: 联机时由服务器分配的全局唯一 ID */
this.ownerId = 'local';   /* Network: 'local' 表示本机拥有，联机时为玩家 ID */
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| 大量投射物+怪物导致帧率下降 | 碰撞检测 O(n²) | 投射物存活时间限制(2s)，怪物上限(15)，超出视口的投射物自动销毁 |
| 经验球太多遮挡画面 | 视觉混乱 | 限制最大经验球数量(50)，超出时合并或直接给经验 |
| 怪物 AI 追踪穿墙 | 体验差 | P1 简单处理（碰墙停下），P3 用 A* 寻路解决 |
| 受击闪烁效果全局修改颜色 | 恢复颜色可能出错 | 保存原始颜色，闪烁计时器结束后恢复 |

## Open Questions

- Q1: 投射物是否需要穿透（命中多个敌人）？→ **P1 默认不穿透，击中即销毁，穿透留给 P2 技能**
- Q2: 玩家死亡后是否自动重开？→ **显示死亡界面，点击重新开始按钮后 restart**
