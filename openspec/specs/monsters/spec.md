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

### Requirement: MonsterFactory supports fixed spawn points
MonsterFactory.create() SHALL 新增支持 `isBoss: true` 参数。
当 `isBoss` 为 true 时：
- 怪物 tag SHALL 设为 `'boss'`（而非 `'enemy'`）
- 怪物的 HP、攻击力等属性 SHALL 从 monsters.json 中对应 Boss 配置读取
- 怪物的 SpriteRenderer 尺寸 SHALL 放大（size × 1.8）
MonsterFactory SHALL 不再需要随机位置生成逻辑（由 LevelManager 提供精确世界坐标）。

#### Scenario: Create boss monster
- **WHEN** 调用 create({ type: 'boss_slime', position: {x, y}, isBoss: true })
- **THEN** 创建一个 tag='boss' 的大号怪物实体

#### Scenario: Create normal monster at fixed position
- **WHEN** 调用 create({ type: 'slime', position: {x: 320, y: 160} })
- **THEN** 在世界坐标 (320, 160) 创建一个标准 slime 怪物

### Requirement: Monster spawning via LevelManager (replaces random spawning)
BattleScene SHALL 通过 `LevelManager.getAllSpawns()` 获取所有固定刷怪点，在关卡加载时一次性创建所有怪物（含 Boss）。
旧的随机刷怪策略已被关卡配置驱动的固定刷怪替代。
/* Network: Host 决定生成时机和位置，广播给 Client */

#### Scenario: Spawn all monsters from level config
- **WHEN** 关卡加载完成
- **THEN** 遍历 LevelManager.getAllSpawns()，在每个固定位置创建对应类型的怪物
