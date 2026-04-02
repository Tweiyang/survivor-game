## ADDED Requirements

### Requirement: HealthComponent manages hit points
系统 SHALL 提供 `HealthComponent`，管理实体的生命值（Unity: 自定义 Health 脚本）。
HealthComponent SHALL 包含：
- `maxHp` — 最大生命值（来自配置）
- `currentHp` — 当前生命值
- `isDead` — 是否已死亡
- `takeDamage(amount)` — 扣减生命值，触发受击闪烁，hp≤0 时调用 die()
- `heal(amount)` — 恢复生命值，不超过 maxHp
- `die()` — 死亡处理：触发 `onDeath` 事件，标记实体销毁
- `getHpRatio()` — 返回 0~1 血量比例，用于血条 UI
HealthComponent SHALL 在 `takeDamage` 时实现受击闪烁效果（白色闪烁 0.1 秒后恢复原色）。

#### Scenario: Take damage and die
- **WHEN** 实体 maxHp=30, currentHp=30, 调用 takeDamage(35)
- **THEN** currentHp=0, isDead=true, EventSystem 触发 'onDeath' 事件

#### Scenario: Hit flash effect
- **WHEN** 调用 takeDamage(10)
- **THEN** SpriteRenderer.color 短暂变白，0.1 秒后恢复原色

### Requirement: CombatComponent holds combat stats
系统 SHALL 提供 `CombatComponent`，管理实体的战斗属性（Unity: 自定义 CombatStats 脚本）。
CombatComponent SHALL 包含：
- `attack` — 攻击力
- `defense` — 防御力
- `critRate` — 暴击率（0~1）
- `critMultiplier` — 暴击倍率
- `attackSpeed` — 攻击间隔（秒）
- `attackRange` — 攻击范围（像素）
- `projectileSpeed` — 投射物速度（像素/秒）
- `faction` — 阵营标识（'player' / 'enemy'），用于判断敌我

#### Scenario: Load stats from config
- **WHEN** 从 player.json 加载 {attack: 10, defense: 2, critRate: 0.05}
- **THEN** CombatComponent 各属性与配置一致

### Requirement: CombatSystem calculates damage
系统 SHALL 提供 `CombatSystem`，负责伤害计算（Unity: 战斗管理脚本）。
CombatSystem SHALL 提供 `dealDamage(attackerEntity, targetEntity, baseDamage, skillMultiplier?)` 方法。
/* Network: 伤害应由 Host/服务器计算 */
伤害公式：
1. `baseDmg = baseDamage × (skillMultiplier || 1)`
2. 暴击判定：`random() < attacker.critRate` → `baseDmg *= attacker.critMultiplier`
3. 防御减伤：`finalDmg = max(1, baseDmg - target.defense × defenseRatio)`
4. 调用 `target.HealthComponent.takeDamage(finalDmg)`
5. 触发 `EventSystem.emit('onDamage', {attacker, target, damage: finalDmg, isCrit})`
`defenseRatio` 从 `formulas.json` 加载。

#### Scenario: Normal damage calculation
- **WHEN** 攻击者 attack=10, 目标 defense=4, defenseRatio=0.5, 无暴击
- **THEN** 最终伤害 = max(1, 10 - 4×0.5) = 8

#### Scenario: Critical hit
- **WHEN** 暴击判定成功, baseDamage=10, critMultiplier=1.5
- **THEN** baseDmg = 10 × 1.5 = 15, 然后再减防御

### Requirement: AutoAttackComponent for auto targeting
系统 SHALL 提供 `AutoAttackComponent`，实现自动锁定最近敌人并发射投射物（吸血鬼幸存者式）。
AutoAttackComponent SHALL：
- 每隔 `attackSpeed` 秒触发一次攻击
- 使用 `PhysicsSystem.overlapCircle()` 在 `attackRange` 内搜索敌方实体
- 选择距离最近的敌方目标
- 计算朝向目标的角度
- 调用 `ProjectileFactory.create()` 生成投射物
- 无目标时不攻击
/* Network: 攻击事件应通过 NetworkManager 广播 */

#### Scenario: Auto attack nearest enemy
- **WHEN** 玩家周围 200px 内有 3 个怪物，最近的在 80px
- **THEN** 投射物朝距离 80px 的怪物方向发射

#### Scenario: No target in range
- **WHEN** 攻击范围内无敌方实体
- **THEN** 不发射投射物，等待下次检测

### Requirement: ProjectileComponent for bullet behavior
系统 SHALL 提供 `ProjectileComponent`，管理投射物的飞行和命中逻辑。
ProjectileComponent SHALL：
- 按 `direction` + `speed` 每帧移动
- 拥有 ColliderComponent（isTrigger=true）
- 碰撞到敌方阵营实体时：调用 CombatSystem.dealDamage()，然后销毁自身
- 碰撞到墙壁瓦片时销毁自身
- 超过 `maxLifetime`（默认 2 秒）后自动销毁
- 超出摄像机视口一定距离后自动销毁（节省性能）

#### Scenario: Projectile hits enemy
- **WHEN** 玩家投射物碰到怪物
- **THEN** 触发伤害计算，投射物销毁

#### Scenario: Projectile expires
- **WHEN** 投射物飞行超过 2 秒
- **THEN** 自动销毁，不造成伤害

### Requirement: ProjectileFactory creates projectile entities
系统 SHALL 提供 `ProjectileFactory`，创建投射物实体。
ProjectileFactory.create(config) SHALL：
- 接受参数：`{owner, position, direction, speed, damage, faction, color, size}`
- 创建 Entity，挂载 TransformComponent, SpriteRenderer, ColliderComponent(trigger), ProjectileComponent
- 注册到 EntityManager
/* Network: 投射物创建应由 Host 权威，Client 做预测 */

#### Scenario: Create player projectile
- **WHEN** 调用 ProjectileFactory.create({faction:'player', damage:10, direction:{x:1,y:0}})
- **THEN** 生成一个黄色小圆点投射物，朝右飞行
