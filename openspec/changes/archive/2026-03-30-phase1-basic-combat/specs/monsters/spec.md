## ADDED Requirements

### Requirement: ChaseAI component for monster behavior
系统 SHALL 提供 `ChaseAI` 组件，实现怪物追踪玩家并近身攻击的 AI 行为。
ChaseAI SHALL 实现三状态状态机：
- **IDLE**：距离玩家 > detectionRange 时静止
- **CHASE**：距离玩家 < detectionRange 时，朝玩家方向移动（速度 = moveSpeed）
- **ATTACK**：距离玩家 < attackRange 时，每隔 attackCooldown 秒执行一次近身攻击
近身攻击 SHALL 使用 `PhysicsSystem.overlapCircle()` 检测攻击范围内的敌方实体，调用 `CombatSystem.dealDamage()`。
/* Network: 怪物 AI 应只在 Host 端执行，Client 端播放表现 */

ChaseAI SHALL 包含瓦片碰撞检测（分轴检测），避免穿墙。P1 不做寻路，碰墙时尝试沿墙滑行。

#### Scenario: Monster chases player
- **WHEN** 玩家距离怪物 150px（< detectionRange 200px）
- **THEN** 怪物朝玩家方向移动

#### Scenario: Monster attacks player
- **WHEN** 玩家距离怪物 20px（< attackRange 30px）
- **THEN** 怪物停止移动，每秒攻击一次，造成伤害

#### Scenario: Monster blocked by wall
- **WHEN** 怪物追踪方向有墙壁
- **THEN** 怪物沿墙滑行（分轴检测），不穿墙

### Requirement: MonsterFactory creates monster entities
系统 SHALL 提供 `MonsterFactory`，按配置创建怪物实体。
MonsterFactory.create(config) SHALL：
- 接受参数：`{type, position}` + 从 monsters.json 加载的配置
- 创建 Entity(tag='enemy')，挂载：
  - SpriteRenderer（颜色/形状/大小来自配置）
  - ColliderComponent（circle 碰撞体）
  - RigidbodyComponent（isKinematic=false）
  - HealthComponent（maxHp 来自配置）
  - CombatComponent（attack/defense/faction='enemy' 来自配置）
  - ChaseAI（moveSpeed/detectionRange/attackRange/attackCooldown 来自配置）
- 注册到 EntityManager
/* Network: 怪物生成应由 Host 决定，广播给 Client */

#### Scenario: Create slime monster
- **WHEN** 调用 MonsterFactory.create({type:'slime', position:{x:200, y:200}})
- **THEN** 生成绿色圆形怪物，maxHp=30, attack=5, moveSpeed=60

### Requirement: PlayerFactory creates player entities
系统 SHALL 提供 `PlayerFactory`，创建玩家实体（从 DemoScene 提取并增强）。
PlayerFactory.create(config) SHALL：
- 接受参数：`{position, playerId?}` + 从 player.json 加载的配置
- 创建 Entity(tag='player')，挂载：
  - SpriteRenderer（蓝色方块）
  - ColliderComponent（aabb 碰撞体）
  - RigidbodyComponent（isKinematic=false）
  - HealthComponent（maxHp 来自配置）
  - CombatComponent（attack/defense/critRate/faction='player' 来自配置）
  - AutoAttackComponent（attackSpeed/attackRange 来自配置）
  - PlayerController（moveSpeed 来自配置，含瓦片碰撞检测）
- 注册到 EntityManager
/* Network: 支持通过回调创建远程玩家实体，不硬编码单个玩家 */

#### Scenario: Create local player
- **WHEN** 调用 PlayerFactory.create({position:{x:100, y:100}})
- **THEN** 生成蓝色方块玩家，maxHp=100, attack=10, 自动攻击已启用

### Requirement: Monster spawning in BattleScene
BattleScene SHALL 实现简化的持续怪物生成策略：
- 维护 `maxMonsters` 上限（默认 15）
- 每隔 `spawnInterval` 秒（默认 3 秒），在玩家周围 300~500px 随机位置生成怪物
- 生成位置 SHALL 在可行走瓦片上
- 当存活怪物数量 >= maxMonsters 时暂停生成
- 怪物类型从配置的类型池中随机选取
/* Network: Host 决定生成时机和位置，广播给 Client */

#### Scenario: Spawn monsters around player
- **WHEN** 场景启动后每 3 秒
- **THEN** 在玩家周围 300~500px 可行走位置生成一个怪物

#### Scenario: Monster cap reached
- **WHEN** 场上怪物数量 >= 15
- **THEN** 暂停生成，直到有怪物被击杀
