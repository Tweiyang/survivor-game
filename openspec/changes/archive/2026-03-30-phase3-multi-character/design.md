## Context

当前系统（P0-P2）的玩家实体由 `PlayerFactory` 基于 `player.json` 创建，所有玩家使用相同的属性和初始武器。P2 建立的 `SkillComponent`（被动+武器管理）和 `CombatComponent`（getFinal*() 加成查询）为多角色提供了良好的扩展基础。

**现有架构关键点：**
- `PlayerFactory.create(options)` → 创建 Entity，挂载 CombatComponent、HealthComponent、AutoAttackComponent、PlayerController、SkillComponent
- `BattleScene.init()` → 调用 PlayerFactory.create()，读取 player.json
- `SceneManager.loadScene(sceneName)` → 创建场景实例并调用 init()
- `main.js` → 直接 loadScene('battle')

**P3 需要在此基础上扩展：** 角色选择流程 → 差异化角色数据 → 绑定主动技能。

## Goals / Non-Goals

**Goals:**
- ≥3 个可选角色，各有差异化基础属性、外观颜色、初始武器、绑定主动技能
- 选角场景，玩家在进入战斗前选择角色
- 主动技能系统，按键触发，有冷却时间
- 保持向下兼容：不修改 P2 被动/武器系统的核心逻辑
- 数据驱动：所有角色配置在 `characters.json`，不硬编码

**Non-Goals:**
- 角色解锁/购买系统（P3 全部角色直接可用）
- 角色专属被动天赋树
- 角色切换（选定后不可更换）
- 动画/精灵替换（使用颜色 + 形状 + 文字图标区分）

## Decisions

### Decision 1: 角色数据模型 — `characters.json`

**选择**：独立 `characters.json`，每个角色包含完整属性覆盖。

```jsonc
{
  "vanguard": {
    "name": "先锋-泰坦",
    "icon": "🛡️",
    "description": "高防高血量的前线坦克",
    "color": "#4488FF",       // 角色外观颜色
    "shape": "square",        // 角色形状
    "size": 28,
    "stats": {
      "maxHp": 150, "attack": 8, "defense": 5,
      "moveSpeed": 120, "attackSpeed": 0.6, ...
    },
    "initialWeapon": "energy_pistol",  // 初始武器 → SkillComponent 自动添加
    "activeSkill": "shield_bash"       // 绑定的主动技能 ID
  }
}
```

Unity 映射：`CharacterScriptableObject`

**理由**：与 `player.json` 平行结构，PlayerFactory 只需读 characterId 对应的配置即可，最小改动。

### Decision 2: PlayerFactory 改造方式

**选择**：`PlayerFactory.create({ characterId, position })` — 新增 characterId 参数。

流程：
1. 从 `characters.json` 读取对应角色配置
2. 用角色 stats 覆盖 CombatComponent 属性
3. 用角色 color/shape/size 配置 SpriteComponent
4. 初始武器通过 `SkillComponent.addSkill(initialWeapon)` 添加
5. 主动技能通过 `ActiveSkillComponent` 挂载

**替代方案**：为每个角色创建独立的 Factory → 过度设计，违反 DRY。

### Decision 3: 主动技能架构 — 策略模式

**选择**：`ActiveSkillComponent`（MonoBehaviour）+ `IActiveSkill`（策略接口）

```
ActiveSkillComponent
├── cooldownTimer: number
├── cooldownDuration: number
├── strategy: IActiveSkill        ← 策略模式
└── tryActivate(deltaTime): void

IActiveSkill (interface)
├── execute(owner, systems): void
└── getDescription(): string
```

策略注册表：
```javascript
const ACTIVE_SKILL_MAP = {
    'shield_bash':   () => new ShieldBashSkill(),   // 先锋：冲撞+护盾
    'overcharge':    () => new OverchargeSkill(),    // 游侠：短时攻速暴增
    'nano_heal':     () => new NanoHealSkill()       // 医疗兵：AOE治疗
};
```

Unity 映射：`ActiveSkillComponent : MonoBehaviour`，`IActiveSkill` 接口

**理由**：与 P2 的 `IFireStrategy` 保持一致的策略模式架构，便于扩展新角色。

### Decision 4: 场景间数据传递

**选择**：`SceneManager.sceneData` — 简单的共享数据对象。

```javascript
// 选角场景
sceneManager.sceneData.characterId = 'vanguard';
sceneManager.loadScene('battle');

// 战斗场景
const charId = sceneManager.sceneData.characterId || 'ranger';
```

Unity 映射：`DontDestroyOnLoad` 单例 或 `ScriptableObject` 数据容器。

**替代方案**：事件系统传递 → 增加事件绑定/解绑复杂度，不值得。

### Decision 5: 角色设定（3 个初始角色）

| 角色 | 定位 | 特色 | 主动技能 |
|------|------|------|----------|
| 🔫 **游侠-脉冲** | 攻速型 | 高攻速低防御，初始能量手枪 | **超频弹幕** — 3 秒内攻速翻倍 |
| 🛡️ **先锋-泰坦** | 坦克型 | 高血量高防御，初始散弹枪 | **能量护盾** — 3 秒无敌 + 周围击退 |
| 💊 **医疗-纳米** | 辅助型 | 均衡属性，初始机关枪 | **纳米修复** — 即时恢复 30% 最大生命值 |

### Decision 6: 选角 UI 布局

Canvas 2D 绘制，3 个角色卡片横向排列，每张卡片显示：
- 角色图标 + 名称
- 关键属性条（HP / ATK / SPD 横条对比）
- 主动技能名称 + 描述
- 点击选中 → 高亮边框 → 确认按钮开始战斗

Unity 映射：`Canvas (Overlay)` + `UI Button` + `CharacterCard Prefab`

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| **角色平衡**：3 个角色强度差异大 | MVP 阶段不追求完美平衡，通过 JSON 配置快速调参 |
| **主动技能复杂度**：每个技能实现都是独立逻辑 | 用策略模式隔离，每个技能独立文件，互不影响 |
| **选角流程**：增加了进入游戏的步骤 | 选角场景保持简洁，3 选 1 点击即开 |
| **AutoAttackComponent 和初始武器重复**：当前 AutoAttack 是默认手枪 | P3 中 AutoAttackComponent 的角色由 initialWeapon 完全替代：移除 AutoAttack，统一用 SkillComponent 管理所有武器 |
