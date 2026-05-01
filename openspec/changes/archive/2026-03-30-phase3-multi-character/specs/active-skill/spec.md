## ADDED Requirements

### Requirement: ActiveSkillComponent manages active skill lifecycle
系统 SHALL 提供 `ActiveSkillComponent`（Unity: `MonoBehaviour`），挂载在玩家 Entity 上管理主动技能。
ActiveSkillComponent SHALL 包含：
- `skillId: string` — 技能标识
- `name: string` — 技能名称
- `icon: string` — 技能图标
- `cooldownDuration: number` — 冷却总时长（秒）
- `cooldownTimer: number` — 当前冷却剩余（秒），0 表示可用
- `strategy: IActiveSkill` — 技能策略实例
ActiveSkillComponent SHALL 提供：
- `tryActivate()` — 尝试释放技能：冷却完成时调用 strategy.execute()，并重置 cooldownTimer
- `isReady()` — 返回 cooldownTimer <= 0
- `getCooldownPercent()` — 返回冷却进度百分比（0=就绪, 1=刚释放）
ActiveSkillComponent.update(dt) SHALL 每帧递减 cooldownTimer。

#### Scenario: Activate skill when ready
- **WHEN** cooldownTimer <= 0 且玩家按下技能键
- **THEN** 调用 strategy.execute()，cooldownTimer 重置为 cooldownDuration

#### Scenario: Skill on cooldown
- **WHEN** cooldownTimer > 0 且玩家按下技能键
- **THEN** 不执行技能，返回 false

#### Scenario: Cooldown progress
- **WHEN** cooldownDuration=10s，已过 3 秒
- **THEN** getCooldownPercent() 返回 0.7（剩余 70%）

### Requirement: IActiveSkill defines active skill behavior
系统 SHALL 提供 `IActiveSkill` 接口（Unity: C# `interface IActiveSkill`），定义主动技能行为。
IActiveSkill SHALL 声明：
- `execute(owner, systems, config)` — 执行技能效果，owner 为玩家 Entity
- `getDescription()` — 返回技能描述字符串

#### Scenario: Strategy pattern usage
- **WHEN** ActiveSkillComponent 需要释放技能
- **THEN** 调用其绑定的 IActiveSkill.execute()，不同策略产生不同效果

### Requirement: OverchargeSkill — 超频弹幕（游侠绑定）
系统 SHALL 提供 `OverchargeSkill`（implements IActiveSkill）。
OverchargeSkill.execute() SHALL：
1. 在 duration 时间内（默认 3 秒），将玩家的攻速 modifier 临时增加 percentAdd（默认 +100%）
2. 持续时间结束后自动移除攻速加成
3. 通过临时修改 SkillComponent 的 modifier 实现（添加一个临时 PassiveEffect，到期移除）

#### Scenario: Overcharge activates
- **WHEN** 游侠玩家释放超频弹幕，duration=3s
- **THEN** 3 秒内所有武器的攻速翻倍，3 秒后恢复正常

### Requirement: ShieldBashSkill — 能量护盾（先锋绑定）
系统 SHALL 提供 `ShieldBashSkill`（implements IActiveSkill）。
ShieldBashSkill.execute() SHALL：
1. 给玩家施加无敌状态 duration 秒（默认 3 秒），期间 HealthComponent.takeDamage() 无效
2. 同时对周围 range 范围内的敌人施加击退效果（推开 pushForce 像素）
3. 无敌状态结束后自动恢复

#### Scenario: Shield activates
- **WHEN** 先锋玩家释放能量护盾
- **THEN** 3 秒内受到的伤害为 0，周围敌人被推开

### Requirement: NanoHealSkill — 纳米修复（医疗绑定）
系统 SHALL 提供 `NanoHealSkill`（implements IActiveSkill）。
NanoHealSkill.execute() SHALL：
1. 立即恢复玩家 healPercent（默认 30%）的最大生命值
2. 恢复量 = `Math.floor(maxHp * healPercent)`
3. 恢复后不超过 maxHp

#### Scenario: Nano heal activates
- **WHEN** 医疗玩家释放纳米修复，maxHp=100，currentHp=40，healPercent=0.3
- **THEN** currentHp 变为 70（40 + 30）

#### Scenario: Heal does not exceed max
- **WHEN** currentHp=90，maxHp=100，healPercent=0.3
- **THEN** currentHp 变为 100（不超过 maxHp）

### Requirement: Input binding for active skill
系统 SHALL 在 `InputManager`（Unity: Input System）中注册主动技能按键。
默认按键为 **空格键** (`Space`)。
PlayerController 或 ActiveSkillComponent SHALL 在检测到按键按下时调用 `tryActivate()`。

#### Scenario: Press space to activate
- **WHEN** 玩家按下空格键且技能就绪
- **THEN** 主动技能被释放

#### Scenario: Press space during cooldown
- **WHEN** 玩家按下空格键但技能冷却中
- **THEN** 无效果
