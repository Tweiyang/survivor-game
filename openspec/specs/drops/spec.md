## ADDED Requirements

### Requirement: DropComponent for pickup items
系统 SHALL 提供 `DropComponent`，管理掉落物行为（经验球等）。
DropComponent SHALL 包含：
- `dropType` — 掉落类型（'exp' / 'skill' 等，P1 只实现 'exp'）
- `value` — 掉落值（经验球的经验值）
- `pickupRange` — 磁吸触发距离（默认 80px）
- `magnetSpeed` — 磁吸飞行速度（默认 300px/s）
- `isBeingMagnetized` — 是否正在被磁吸

DropComponent 的 update() SHALL：
1. 检测与最近的 'player' 实体的距离
2. 如果距离 < pickupRange → 设置 isBeingMagnetized=true
3. 如果 isBeingMagnetized → 朝玩家加速飞行
4. 碰撞到玩家（Trigger）→ 触发拾取事件，销毁自身

#### Scenario: Exp ball magnetized to player
- **WHEN** 玩家距离经验球 < 80px
- **THEN** 经验球开始朝玩家飞行

#### Scenario: Exp ball picked up
- **WHEN** 磁吸飞行中的经验球碰到玩家
- **THEN** EventSystem 触发 'onPickup' 事件（含 dropType 和 value），经验球销毁

### Requirement: DropItemFactory creates drop entities
系统 SHALL 提供 `DropItemFactory`，创建掉落物实体。
DropItemFactory.spawnDrops(config) SHALL：
- 接受参数：`{position, expValue, expPerBall}`
- 计算经验球数量 = ceil(expValue / expPerBall)，上限 5 个
- 为每个经验球创建 Entity(tag='drop')，挂载：
  - SpriteRenderer（绿色小圆点，sortingLayer=1，size=8）
  - ColliderComponent（circle, isTrigger=true, radius=6）
  - DropComponent（dropType='exp', value=expPerBall）
- 经验球初始位置从死亡位置随机散开（±15px）
- 注册到 EntityManager
- 场上经验球总数超过 50 时，直接给玩家加经验（不生成实体）

#### Scenario: Monster drops exp balls
- **WHEN** expValue=10 的怪物死亡，expPerBall=5
- **THEN** 生成 2 个经验球，每个价值 5 经验

#### Scenario: Too many drops on field
- **WHEN** 场上已有 50 个经验球
- **THEN** 新的经验直接加给玩家，不生成实体

### Requirement: ExperienceSystem tracks exp and level
系统 SHALL 提供 `ExperienceSystem`，管理经验值收集和升级判定。
ExperienceSystem SHALL：
- 监听 'onPickup' 事件，当 dropType='exp' 时增加经验
- 维护 `currentExp` / `expToNextLevel` / `level` 状态
- 升级公式：`expToNextLevel = baseExpToLevel × (expLevelMultiplier ^ (level - 1))`
- 经验满时：level++，剩余经验保留，触发 `EventSystem.emit('onLevelUp', {level, ...})`
/* Network: 经验/升级应由服务器权威计算 */
/* P2 将在 onLevelUp 事件上挂载技能选择弹窗 */

#### Scenario: Collect exp and level up
- **WHEN** currentExp=45, expToNextLevel=50, 拾取价值 10 的经验球
- **THEN** level+1, currentExp=5, 触发 'onLevelUp' 事件

#### Scenario: Exp carries over
- **WHEN** 拾取大量经验导致连升多级
- **THEN** 每次升级都触发 'onLevelUp'，剩余经验继续累计
