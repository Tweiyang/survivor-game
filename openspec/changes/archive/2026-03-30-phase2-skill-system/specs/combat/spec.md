## MODIFIED Requirements

### Requirement: CombatComponent holds combat stats
系统 SHALL 提供 `CombatComponent`，管理实体的战斗属性（Unity: 自定义 CombatStats 脚本）。
CombatComponent SHALL 包含：
- `attack` — 基础攻击力
- `defense` — 基础防御力
- `critRate` — 基础暴击率（0~1）
- `critMultiplier` — 暴击倍率
- `attackSpeed` — 基础攻击间隔（秒）
- `attackRange` — 攻击范围（像素）
- `projectileSpeed` — 投射物速度（像素/秒）
- `faction` — 阵营标识（'player' / 'enemy'），用于判断敌我
CombatComponent SHALL 新增 `getFinal*()` 系列方法，查询 SkillComponent 的 modifier 加成：
- `getFinalAttack()` — `attack × (1 + percentAdd) + flatAdd`
- `getFinalDefense()` — `defense × (1 + percentAdd) + flatAdd`
- `getFinalCritRate()` — `critRate + flatAdd`（暴击率用 flatAdd）
- `getFinalAttackSpeed()` — `attackSpeed / (1 + percentAdd)`（攻速越高间隔越短）
CombatComponent SHALL 在 `start()` 时缓存对 SkillComponent 的引用。
不持有 SkillComponent 时（如怪物），getFinal*() SHALL 返回 base 值。

#### Scenario: Load stats from config
- **WHEN** 从 player.json 加载 {attack: 10, defense: 2, critRate: 0.05}
- **THEN** CombatComponent 各属性与配置一致

#### Scenario: Get final attack with modifier
- **WHEN** base attack=10, SkillComponent modifier attack={flatAdd:3, percentAdd:0.2}
- **THEN** getFinalAttack() = 10 × 1.2 + 3 = 15

#### Scenario: No SkillComponent (monster)
- **WHEN** 怪物实体没有 SkillComponent
- **THEN** getFinalAttack() = base attack 值

### Requirement: CombatSystem calculates damage
系统 SHALL 提供 `CombatSystem`，负责伤害计算（Unity: 战斗管理脚本）。
CombatSystem SHALL 提供 `dealDamage(attackerEntity, targetEntity, baseDamage, skillMultiplier?)` 方法。
/* Network: 伤害应由 Host/服务器计算 */
伤害公式（更新为使用 getFinal*）：
1. `baseDmg = baseDamage × (skillMultiplier || 1)`
2. 暴击判定：`random() < attacker.CombatComponent.getFinalCritRate()` → `baseDmg *= critMultiplier`
3. 防御减伤：`finalDmg = max(1, baseDmg - target.CombatComponent.getFinalDefense() × defenseRatio)`
4. 调用 `target.HealthComponent.takeDamage(finalDmg)`
5. 触发 `EventSystem.emit('onDamage', {attacker, target, damage: finalDmg, isCrit})`
`defenseRatio` 从 `formulas.json` 加载。

#### Scenario: Normal damage with modifiers
- **WHEN** 攻击者 getFinalAttack()=15, 目标 getFinalDefense()=4, defenseRatio=0.5, 无暴击
- **THEN** 最终伤害 = max(1, baseDmg - 4×0.5)

#### Scenario: Critical hit with modifier
- **WHEN** getFinalCritRate()=0.15 且暴击判定成功
- **THEN** baseDmg *= critMultiplier

## ADDED Requirements

### Requirement: AutoAttackComponent serves as default weapon
`AutoAttackComponent` SHALL 作为玩家的"初始默认手枪"武器。
在 SkillComponent 初始化时，SHALL 将 AutoAttackComponent 注册为 weapons[0]。
AutoAttackComponent SHALL 受 SkillComponent 的攻速 modifier 影响（通过 CombatComponent.getFinalAttackSpeed() 获取实际攻击间隔）。

#### Scenario: Default weapon registered
- **WHEN** 玩家实体初始化完成
- **THEN** SkillComponent.weapons[0] 为 AutoAttackComponent（默认手枪）

#### Scenario: Attack speed modifier applies to default weapon
- **WHEN** 获得攻速被动 percentAdd=0.2
- **THEN** AutoAttackComponent 的实际攻击间隔缩短 16.7%
