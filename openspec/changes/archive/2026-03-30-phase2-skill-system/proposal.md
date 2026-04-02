## Why

Phase 2 — 技能系统。P1 已完成基础战斗流程（移动、自动射击、怪物AI、掉落经验、升级），但升级后没有任何效果。技能系统是吸血鬼幸存者类游戏的核心 build-crafting 体验：玩家通过升级获得被动属性增强和新武器，不断变强对抗越来越多的怪物。没有技能系统，游戏循环缺失最关键的正反馈环。

## What Changes

- 新增 `skills.json` — 所有可选技能的配置表（被动属性技能 + 武器技能）
- 新增 `SkillComponent` — 挂载在玩家实体上，管理已获得的技能列表（武器≤4把 + 被动无上限）
- 新增 `WeaponSkill` 组件 — 武器技能基类，通过 `IFireStrategy` 策略模式实现不同开火行为
- 新增 `ProjectileFire` 策略 — 标准投射物型武器（机关枪、散弹枪）
- 新增 `PassiveEffect` — 被动属性技能，通过 modifier 系统实时影响角色属性
- 新增 `SkillSelectUI` — 升级时弹出三选一弹窗，暂停游戏，选择后恢复
- 改造 `AutoAttackComponent` — 由 SkillComponent 管理的武器替代，原默认攻击变为初始武器
- 改造 `CombatComponent` — 属性查询支持 modifier 加成（getFinalAttack() 等）
- 改造 `BattleScene` — 集成技能选择流程，连接 onLevelUp → SkillSelectUI
- 改造 `HUD` — 显示当前武器图标和被动技能列表

## Capabilities

### New Capabilities
- `skill-framework`: 技能系统核心框架——SkillComponent、WeaponSkill、PassiveEffect、IFireStrategy 策略模式、modifier 属性加成系统
- `skill-ui`: 技能选择 UI——升级三选一弹窗、HUD 技能图标显示

### Modified Capabilities
- `combat`: CombatComponent 属性查询改为支持 modifier 加成；AutoAttackComponent 改为由武器系统驱动
- `hud`: HUD 新增武器槽位图标和被动技能列表显示

## Impact

- **配置文件**：新增 `assets/data/skills.json`
- **组件改造**：`CombatComponent`、`AutoAttackComponent` 需要适配 modifier 系统
- **场景改造**：`BattleScene` 集成技能选择流程
- **UI 改造**：`HUD` 新增技能展示区域
- **工厂改造**：`PlayerFactory` 初始化时挂载 SkillComponent 和默认武器
- **Phase 标注**：本 change 属于 **Phase 2 (P2)**
