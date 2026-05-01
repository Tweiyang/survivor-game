## ADDED Requirements

### Requirement: SkillComponent manages player skills
系统 SHALL 提供 `SkillComponent`（Unity: `MonoBehaviour`），挂载在玩家 Entity 上，统一管理已获得的技能。
SkillComponent SHALL 维护：
- `weapons: WeaponSkill[]` — 武器技能列表，最多 4 把
- `passives: PassiveEffect[]` — 被动技能列表，无数量上限
- `skillPool: object` — 从 skills.json 加载的全部技能配置
SkillComponent SHALL 提供：
- `addSkill(skillId)` — 添加技能：判断类型，已有则升级（level++），未有则新增。武器满 4 把时拒绝新武器
- `getStatModifier(statName)` — 汇总所有被动技能对指定属性的加成，返回 `{flatAdd, percentAdd}`
- `getAvailableSkills(count)` — 从技能池中按 selectWeight 加权随机抽取 count 个候选，过滤已满级技能和武器满载时的新武器
/* Network: 技能选择结果需广播给其他客户端 */

#### Scenario: Add new weapon skill
- **WHEN** 玩家当前持有 2 把武器，选择了新武器"机关枪"
- **THEN** weapons 列表增加到 3 把，机关枪 Level=1

#### Scenario: Upgrade existing weapon
- **WHEN** 玩家已持有 Lv.1 机关枪，再次选择"机关枪"
- **THEN** 机关枪升级为 Lv.2，武器数量不变

#### Scenario: Weapon limit reached
- **WHEN** 玩家已持有 4 把武器
- **THEN** getAvailableSkills 返回的候选中不包含任何新武器，只有被动技能和已有武器的升级

#### Scenario: Get stat modifier
- **WHEN** 玩家持有 Lv.2 "超频芯片"（attackSpeed percentAdd=0.20）和 Lv.1 "强化弹药"（attack flatAdd=3）
- **THEN** getStatModifier('attackSpeed') 返回 {flatAdd:0, percentAdd:0.20}；getStatModifier('attack') 返回 {flatAdd:3, percentAdd:0}

### Requirement: WeaponSkill provides auto-fire capability
系统 SHALL 提供 `WeaponSkill`（Unity: `MonoBehaviour`），代表一把自动武器。
WeaponSkill SHALL 包含：
- `weaponId: string` — 武器标识
- `level: number` — 当前等级（1~maxLevel）
- `config: object` — 当前等级的配置数据（从 skills.json levels[level-1] 读取）
- `fireStrategy: IFireStrategy` — 开火策略实例
- `cooldownTimer: number` — 冷却计时器
WeaponSkill.update(dt) SHALL：
1. 累加冷却计时器
2. 当计时器 >= fireRate（受攻速 modifier 影响）时，调用 fireStrategy.tryFire()
3. 自动锁定最近敌人作为目标（复用 PhysicsSystem.overlapCircle）

#### Scenario: Weapon auto fires
- **WHEN** 冷却结束且攻击范围内有敌人
- **THEN** 调用 fireStrategy.tryFire() 发射投射物/执行攻击

#### Scenario: Attack speed modifier affects fire rate
- **WHEN** 武器 fireRate=0.2s，攻速 modifier percentAdd=0.5（+50%）
- **THEN** 实际 fireRate = 0.2 / (1 + 0.5) ≈ 0.133s

#### Scenario: Weapon level up
- **WHEN** 武器从 Lv.1 升级到 Lv.2
- **THEN** config 切换为 levels[1] 的数据，伤害/射速/弹幕量等属性更新

### Requirement: IFireStrategy defines weapon firing behavior
系统 SHALL 提供 `IFireStrategy` 接口（Unity: C# `interface IFireStrategy`），定义武器开火行为。
IFireStrategy SHALL 声明：
- `tryFire(owner, target, config, systems)` — 执行一次开火，返回 boolean 表示是否成功

#### Scenario: Strategy pattern usage
- **WHEN** WeaponSkill 需要开火
- **THEN** 调用其绑定的 IFireStrategy.tryFire()，不同策略产生不同攻击方式

### Requirement: ProjectileFire strategy for standard weapons
系统 SHALL 提供 `ProjectileFire`（implements IFireStrategy），用于标准投射物型武器。
ProjectileFire.tryFire() SHALL：
1. 计算朝向目标的方向向量
2. 根据 config.count 和 config.spread 计算每颗子弹的散射角度
3. 调用 ProjectileFactory.create() 生成每颗子弹
4. 子弹伤害 = config.damage × 攻击力 modifier 加成

#### Scenario: Single shot weapon
- **WHEN** config = {count:1, spread:0, damage:10}
- **THEN** 发射 1 颗直线投射物

#### Scenario: Spread shot weapon
- **WHEN** config = {count:5, spread:30, damage:5}
- **THEN** 发射 5 颗投射物，扇形分布在 ±15° 范围内

### Requirement: PassiveEffect applies stat modifiers
系统 SHALL 提供 `PassiveEffect` 类，代表一个被动属性技能。
PassiveEffect SHALL 包含：
- `skillId: string` — 技能标识
- `level: number` — 当前等级
- `stat: string` — 影响的属性名（如 'attack', 'moveSpeed', 'critRate', 'maxHp', 'attackSpeed'）
- `modType: string` — 加成类型（'flatAdd' 或 'percentAdd'）
- `value: number` — 当前等级的加成值（从 skills.json levels[level-1].value 读取）
PassiveEffect SHALL 在升级时更新 value 为新等级的配置值。

#### Scenario: Percent add passive
- **WHEN** 被动 "超频芯片" Lv.2，stat='attackSpeed', modType='percentAdd', value=0.20
- **THEN** SkillComponent.getStatModifier('attackSpeed') 包含 percentAdd += 0.20

#### Scenario: Flat add passive
- **WHEN** 被动 "强化装甲" Lv.1，stat='defense', modType='flatAdd', value=5
- **THEN** SkillComponent.getStatModifier('defense') 包含 flatAdd += 5

#### Scenario: Passive level up
- **WHEN** "超频芯片" 从 Lv.1(value=0.10) 升级到 Lv.2(value=0.20)
- **THEN** value 更新为 0.20

### Requirement: skills.json configures all available skills
系统 SHALL 从 `assets/data/skills.json`（Unity: `SkillScriptableObject[]`）加载所有技能配置。
每个技能配置 SHALL 包含：
- `id` — 唯一标识
- `name` — 显示名称
- `type` — 'weapon' 或 'passive'
- `description` — 技能描述
- `icon` — 文字图标（Canvas 绘制用）
- `maxLevel` — 最大等级
- `selectWeight` — 三选一权重
- `levels[]` — 每级的属性配置数组
武器类型额外包含 `fireStrategy`（策略标识）。
被动类型额外包含 `stat`（属性名）和 `modType`（加成类型）。

#### Scenario: Load skill pool
- **WHEN** BattleScene 初始化时加载 skills.json
- **THEN** SkillComponent 获得完整的技能池，可用于 getAvailableSkills

### Requirement: Modifier system provides real-time stat bonuses
CombatComponent SHALL 提供 `getFinal*()` 系列方法（Unity: property getters），在计算时实时查询 SkillComponent 的 modifier 加成。
公式为：`finalValue = baseValue × (1 + percentAdd) + flatAdd`
PlayerController SHALL 使用 `getFinalMoveSpeed()` 替代直接读取 moveSpeed。
CombatSystem.dealDamage() SHALL 使用 `getFinalAttack()` 替代直接读取 attack。

#### Scenario: Damage with modifier
- **WHEN** 基础 attack=10，被动加成 percentAdd=0.20, flatAdd=3
- **THEN** getFinalAttack() = 10 × 1.20 + 3 = 15

#### Scenario: Move speed with modifier
- **WHEN** 基础 moveSpeed=150，被动加成 percentAdd=0.15
- **THEN** getFinalMoveSpeed() = 150 × 1.15 = 172.5
