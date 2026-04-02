## ADDED Requirements

### Requirement: ColliderComponent defines collision shape
系统 SHALL 提供 `ColliderComponent`，定义实体的碰撞区域（Unity: `Collider2D`）。
ColliderComponent SHALL 支持两种碰撞形状：
- `'aabb'` — 轴对齐矩形碰撞体，参数 `{width, height}`（Unity: `BoxCollider2D`）
- `'circle'` — 圆形碰撞体，参数 `{radius}`（Unity: `CircleCollider2D`）
ColliderComponent SHALL 包含：
- `type` — 碰撞体类型
- `offset: {x, y}` — 相对 Transform 位置的偏移
- `isTrigger` — 是否为触发器（true 时不产生物理阻挡，只触发事件）（Unity: `Collider2D.isTrigger`）
- `layer` — 碰撞层标识（字符串），用于过滤碰撞对（Unity: `Layer`）

#### Scenario: AABB collider creation
- **WHEN** 创建 `new ColliderComponent({type: 'aabb', width: 32, height: 32})`
- **THEN** 碰撞区域为以 Transform 位置为中心的 32×32 矩形

#### Scenario: Circle collider creation
- **WHEN** 创建 `new ColliderComponent({type: 'circle', radius: 16})`
- **THEN** 碰撞区域为以 Transform 位置为中心、半径 16 的圆

### Requirement: RigidbodyComponent for velocity-driven movement
系统 SHALL 提供 `RigidbodyComponent`，管理实体的速度驱动运动（Unity: `Rigidbody2D`）。
RigidbodyComponent SHALL 包含：
- `velocity: {x, y}` — 当前速度（像素/秒）（Unity: `Rigidbody2D.velocity`）
- `maxSpeed` — 最大速度限制
- `friction` — 摩擦系数（0~1，每帧速度衰减比例），默认 0（无摩擦）
- `isKinematic` — 是否为运动学物体（true 时不受碰撞推力影响）（Unity: `Rigidbody2D.isKinematic`）
RigidbodyComponent 的 `update(dt)` SHALL 每帧根据 `velocity` 更新 Transform 的 position。

#### Scenario: Velocity moves entity
- **WHEN** 实体 Rigidbody 的 velocity = {x: 100, y: 0}，经过 0.5 秒
- **THEN** 实体 Transform.position.x 增加约 50

#### Scenario: Friction slows down
- **WHEN** 实体 Rigidbody 的 friction = 0.9，velocity = {x: 100, y: 0}
- **THEN** 每帧 velocity.x 乘以 (1 - 0.9 × dt)，逐渐趋近 0

### Requirement: PhysicsSystem for collision detection
系统 SHALL 提供 `PhysicsSystem`，每帧检测所有 ColliderComponent 之间的碰撞（Unity: `Physics2D` 引擎）。
PhysicsSystem SHALL：
- 遍历所有拥有 ColliderComponent 的实体对，执行碰撞检测
- 支持 AABB vs AABB、Circle vs Circle、AABB vs Circle 三种组合
- 维护碰撞状态，区分 `Enter`（首次碰撞）、`Stay`（持续碰撞）、`Exit`（离开碰撞）
- 在碰撞发生时调用相关实体组件的回调：
  - `onCollisionEnter(other)` — 首次碰撞（Unity: `OnCollisionEnter2D`）
  - `onCollisionStay(other)` — 持续碰撞（Unity: `OnCollisionStay2D`）
  - `onCollisionExit(other)` — 离开碰撞（Unity: `OnCollisionExit2D`）
- 对 `isTrigger=true` 的碰撞体，调用 `onTriggerEnter` / `onTriggerStay` / `onTriggerExit`
- 非 trigger 碰撞 SHALL 产生简易分离（将重叠实体推开）

#### Scenario: AABB collision detection
- **WHEN** 实体 A (AABB 32×32 at 100,100) 和实体 B (AABB 32×32 at 120,100) 重叠
- **THEN** PhysicsSystem 检测到碰撞，调用双方的 `onCollisionEnter`

#### Scenario: Trigger does not push entities apart
- **WHEN** 实体 A 的 ColliderComponent.isTrigger = true，与实体 B 重叠
- **THEN** 调用 `onTriggerEnter`，但不产生物理分离推力

#### Scenario: Collision state transitions
- **WHEN** 实体 A 和 B 在第 1 帧开始重叠，第 2-3 帧持续重叠，第 4 帧分离
- **THEN** 第 1 帧触发 `onCollisionEnter`，第 2-3 帧触发 `onCollisionStay`，第 4 帧触发 `onCollisionExit`

### Requirement: PhysicsSystem overlap queries
PhysicsSystem SHALL 提供静态查询方法（Unity: `Physics2D.OverlapCircle` 等）：
- `overlapCircle(center, radius, layerFilter?)` — 查询圆形范围内的所有碰撞体
- `raycast(origin, direction, distance, layerFilter?)` — 射线检测

#### Scenario: Overlap circle query
- **WHEN** 调用 `PhysicsSystem.overlapCircle({x:100, y:100}, 50)`
- **THEN** 返回所有碰撞体中心在 (100,100) 半径 50 范围内的实体列表
