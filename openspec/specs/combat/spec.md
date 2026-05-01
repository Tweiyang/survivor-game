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
- `attack` — 基础攻击力
- `defense` — 基础防御力
- `critRate` — 基础暴击率（0~1）
- `critMultiplier` — 暴击倍率
- `attackSpeed` — 基础攻击间隔（秒）
- `attackRange` — 攻击范围（像素）
- `projectileSpeed` — 投射物速度（像素/秒）
- `faction` — 阵营标识（'player' / 'enemy'），用于判断敌我
CombatComponent SHALL 提供 `getFinal*()` 系列方法，查询 SkillComponent 的 modifier 加成：
- `getFinalAttack()` — `attack × (1 + percentAdd) + flatAdd`
- `getFinalDefense()` — `defense × (1 + percentAdd) + flatAdd`
- `getFinalCritRate()` — `critRate + flatAdd`（暴击率用 flatAdd）
- `getFinalAttackSpeed()` — `attackSpeed / (1 + percentAdd)`（攻速越高间隔越短）
CombatComponent SHALL 在 `start()` 时缓存对 SkillComponent 的引用。
不持有 SkillComponent 时（如怪物），getFinal*() SHALL 返回 base 值。
**P3 新增**：CombatComponent 的构造函数 SHALL 支持从 `characters.json` 的 `stats` 对象直接初始化所有属性。

#### Scenario: Load stats from character config
- **WHEN** PlayerFactory 用角色 stats {maxHp:150, attack:8, defense:5, moveSpeed:120, ...} 初始化 CombatComponent
- **THEN** CombatComponent 各属性与角色配置一致

#### Scenario: No SkillComponent (monster)
- **WHEN** 怪物实体没有 SkillComponent
- **THEN** getFinalAttack() = base attack 值

### Requirement: HealthComponent supports invincible state
HealthComponent SHALL 新增 `isInvincible: boolean` 属性（默认 false）。
HealthComponent.takeDamage() SHALL 在 `isInvincible === true` 时跳过伤害（不扣血、不触发闪烁）。
该属性由 ShieldBashSkill 在技能释放时设置为 true，到期后设回 false。

#### Scenario: Invincible blocks damage
- **WHEN** isInvincible = true 且受到 20 点伤害
- **THEN** currentHp 不变

#### Scenario: Normal damage after invincible ends
- **WHEN** isInvincible = false（护盾到期后）且受到 20 点伤害
- **THEN** currentHp 正常减少

### Requirement: CombatSystem calculates damage
系统 SHALL 提供 `CombatSystem`，负责伤害计算（Unity: 战斗管理脚本）。
CombatSystem SHALL 提供 `dealDamage(attackerEntity, targetEntity, baseDamage, skillMultiplier?)` 方法。
/* Network: 伤害应由 Host/服务器计算 */
伤害公式（使用 getFinal* 方法）：
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
AutoAttackComponent SHALL 作为玩家的"初始默认手枪"武器。
在 SkillComponent 初始化时，SHALL 将 AutoAttackComponent 注册为 weapons[0]。
AutoAttackComponent SHALL 受 SkillComponent 的攻速 modifier 影响（通过 CombatComponent.getFinalAttackSpeed() 获取实际攻击间隔）。

#### Scenario: Auto attack nearest enemy
- **WHEN** 玩家周围 200px 内有 3 个怪物，最近的在 80px
- **THEN** 投射物朝距离 80px 的怪物方向发射

#### Scenario: No target in range
- **WHEN** 攻击范围内无敌方实体
- **THEN** 不发射投射物，等待下次检测

#### Scenario: Default weapon registered
- **WHEN** 玩家实体初始化完成
- **THEN** SkillComponent.weapons[0] 为 AutoAttackComponent（默认手枪）

#### Scenario: Attack speed modifier applies to default weapon
- **WHEN** 获得攻速被动 percentAdd=0.2
- **THEN** AutoAttackComponent 的实际攻击间隔缩短 16.7%

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

### Requirement: Combat system emits audio events
CombatSystem SHALL 在造成伤害和击杀时通过 EventSystem 发射音频事件（Unity: UnityEvent 触发 AudioSource）：
- `dealDamage` 成功命中时 SHALL 发射 `onSFX` 事件，携带 `{ soundId: 'enemy_hit' }` 或 `{ soundId: 'player_hit' }`（根据目标 tag 区分）
- 目标死亡时 SHALL 根据 tag 发射 `onSFX` 事件：`tag='enemy'` → `'enemy_kill'`，`tag='boss'` → `'boss_kill'`

#### Scenario: Enemy takes damage plays hit sound
- **WHEN** CombatSystem.dealDamage 命中一个 tag='enemy' 的实体且未死亡
- **THEN** 发射 `onSFX` 事件，soundId='enemy_hit'

#### Scenario: Boss killed plays boss kill sound
- **WHEN** CombatSystem.dealDamage 导致 tag='boss' 实体死亡
- **THEN** 发射 `onSFX` 事件，soundId='boss_kill'
