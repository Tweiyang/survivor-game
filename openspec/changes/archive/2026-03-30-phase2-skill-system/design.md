## Context

Phase 2 基于 P1 已完成的基础战斗系统（移动、自动射击、怪物追踪、经验掉落、升级触发）之上，添加技能系统。当前 `ExperienceSystem` 在升级时触发 `onLevelUp` 事件但无后续处理。`AutoAttackComponent` 硬编码了单一攻击方式（朝最近敌人发射单颗投射物）。`CombatComponent` 存储静态属性值（attack/defense/critRate 等），无法被动态修改。

本设计将引入 SkillComponent 统管技能，通过 modifier 系统影响战斗属性，通过 WeaponSkill + IFireStrategy 策略模式支持多种自动武器。

## Goals / Non-Goals

**Goals:**
- G1: 实现升级三选一技能选择弹窗（暂停→选择→恢复）
- G2: 被动属性技能能实时影响角色的攻击/防御/移速等属性
- G3: 武器技能通过策略模式支持多种自动开火方式（投射物型 + 特殊型）
- G4: 同一技能重复获取可升级（Lv.1→Lv.5），效果按配置递增
- G5: 武器上限 4 把，满载后新武器不出现在选择池
- G6: 所有技能数据驱动（skills.json），便于 Unity 迁移为 ScriptableObject

**Non-Goals:**
- 主动技能实现（P3 随多角色系统）
- 技能组合/进化系统（未来 Phase）
- 视觉特效/粒子（P4）
- 技能地面掉落拾取（P2 只做升级选择获取）

## Decisions

### D1: 技能管理架构 — SkillComponent 统管模式

```
Player Entity
  └─ SkillComponent (new)
       ├─ weapons: WeaponSkill[] (max 4)
       ├─ passives: PassiveEffect[]
       ├─ getStatModifier(statName) → {flatAdd, percentAdd}
       ├─ addSkill(skillId) → 自动判断类型、新增或升级
       └─ getAvailableSkills(pool) → 过滤已满级/满载技能
```

**Unity 映射**：`SkillComponent` → `MonoBehaviour`，skills.json → `SkillScriptableObject[]`

**替代方案**：每个技能作为独立 Component 挂载到 Entity → 否决，因为需要统一管理武器上限和技能池过滤逻辑。

### D2: 属性 Modifier 系统 — 查询式加成

```
CombatComponent.getFinalAttack():
  base = this.attack
  modifier = skillComponent.getStatModifier('attack')
  return base * (1 + modifier.percentAdd) + modifier.flatAdd
```

每个 PassiveEffect 声明影响哪些属性及加成值（flatAdd 或 percentAdd），SkillComponent.getStatModifier() 汇总所有被动的加成。CombatComponent / PlayerController 等在需要时调用 getFinal*() 方法。

**Unity 映射**：类似 Unity 中 `StatModifier` 设计模式。

**替代方案**：直接修改 base 值 → 否决，因为无法追踪/撤销加成来源，且联网同步困难。

### D3: 武器策略模式 — IFireStrategy

```
IFireStrategy (接口/基类)
  └─ tryFire(dt, owner, config, systems) → boolean

ProjectileFire (投射物型)
  └─ 调用 ProjectileFactory.create()，支持参数：
     count(弹幕量), spread(散射角度), piercing(穿透次数)

ConeFire (扇形型，如喷火枪)
  └─ 用 overlapCircle + 角度过滤实现扇形伤害区域
```

P2 先实现 `ProjectileFire`（覆盖机关枪、散弹枪），`ConeFire` 等特殊策略按需添加。

**Unity 映射**：`IFireStrategy` → C# 接口 `IFireStrategy`，每种实现作为 ScriptableObject 配置。

### D4: 技能数据结构 — skills.json

```jsonc
{
  "machineGun": {
    "id": "machineGun",
    "name": "机关枪",
    "type": "weapon",
    "description": "高射速单发投射物",
    "icon": "🔫",              // Canvas 文字图标
    "maxLevel": 5,
    "selectWeight": 10,
    "fireStrategy": "projectile",
    "levels": [
      { "fireRate": 0.2, "damage": 5,  "count": 1, "spread": 0,  "speed": 500, "color": "#FFAA00", "size": 4 },
      { "fireRate": 0.18, "damage": 7, "count": 1, "spread": 0,  "speed": 520 },
      { "fireRate": 0.15, "damage": 9, "count": 2, "spread": 10, "speed": 540 },
      { "fireRate": 0.12, "damage": 12,"count": 2, "spread": 15, "speed": 560 },
      { "fireRate": 0.10, "damage": 15,"count": 3, "spread": 20, "speed": 600 }
    ]
  },
  "attackSpeedUp": {
    "id": "attackSpeedUp",
    "name": "超频芯片",
    "type": "passive",
    "description": "提升所有武器攻速",
    "icon": "⚡",
    "maxLevel": 5,
    "selectWeight": 8,
    "stat": "attackSpeed",
    "modType": "percentAdd",
    "levels": [
      { "value": 0.10 },
      { "value": 0.20 },
      { "value": 0.30 },
      { "value": 0.40 },
      { "value": 0.50 }
    ]
  }
}
```

### D5: 升级选择流程

```
onLevelUp 事件
    │
    ▼
BattleScene 接收
    │
    ▼
GameLoop.pause()
    │
    ▼
SkillSelectUI.show(candidates)
  └─ candidates = SkillComponent.getAvailableSkills(skillPool, 3)
      └─ 过滤已满级、武器满载时过滤新武器
      └─ 按 selectWeight 加权随机抽取 3 个
    │
    ▼ (玩家点击)
SkillComponent.addSkill(selectedId)
    │
    ▼
GameLoop.resume()
```

### D6: 改造现有组件清单

| 现有组件 | 改造内容 |
|---------|---------|
| `CombatComponent` | 新增 `getFinalAttack()` / `getFinalDefense()` / `getFinalCritRate()` 等方法，查询 SkillComponent modifier |
| `AutoAttackComponent` | 改为"默认武器"角色，初始化时通过 SkillComponent 注册为武器之一，或被 WeaponSkill 替代 |
| `PlayerFactory` | 初始化时挂载 SkillComponent，加载 skills.json，注册默认武器 |
| `BattleScene` | 监听 onLevelUp → 暂停 → 弹出 SkillSelectUI → 恢复 |
| `HUD` | 底部/侧边新增技能图标区：武器槽(4格) + 被动列表 |
| `PlayerController` | `moveSpeed` 改为读取 `getFinalMoveSpeed()` |

### D7: AutoAttack → 默认武器转换策略

P1 的 `AutoAttackComponent` 将改造为 SkillComponent 管理的第一把"默认手枪"武器。
- `AutoAttackComponent` 保留为初始武器的实现载体
- 在 SkillComponent 中将其包装为 weaponSlot[0]
- 后续获得新武器时，新武器作为额外的 WeaponSkill 挂载
- 所有武器共享攻速 modifier 加成

## Risks / Trade-offs

- **[R1] Modifier 计算性能** → 每帧多次调用 getStatModifier 可能有开销。缓解：缓存 modifier 结果，仅在技能变化时重新计算（dirty flag）。
- **[R2] 多武器同时开火的视觉混乱** → 4 把武器同时射击可能弹幕过密。缓解：合理配置 fireRate，必要时错开开火时机。
- **[R3] AutoAttack 改造的兼容性** → P1 的 AutoAttackComponent 被多处引用。缓解：渐进式改造，保留 AutoAttackComponent 作为默认武器，新增 WeaponSkill 不影响原有逻辑。

## Open Questions

- Q1: P2 初始内容包含多少种武器和被动？→ 建议 3 武器（手枪/机关枪/散弹枪）+ 4 被动（攻速/暴击/血量/移速）作为 MVP。
