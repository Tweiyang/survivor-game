## ADDED Requirements

### Requirement: Component base class with lifecycle
系统 SHALL 提供 `Component` 基类，所有游戏组件继承自该基类。
组件 SHALL 支持以下生命周期方法：
- `constructor(config)` — 初始化组件字段（Unity: `Awake()` + `[SerializeField]`）
- `start()` — 首帧前调用一次，可安全引用其他组件（Unity: `Start()`）
- `update(deltaTime)` — 每帧调用，deltaTime 为秒（Unity: `Update()`）
- `onDestroy()` — 组件/实体被销毁时调用（Unity: `OnDestroy()`）
组件 SHALL 持有对所属 Entity 的引用 `this.entity`。
组件 SHALL 有 `enabled` 属性，disabled 时不调用 `update()`。

#### Scenario: Component lifecycle execution order
- **WHEN** 一个 Component 被添加到 Entity 并经过一帧
- **THEN** `start()` 在第一次 `update()` 之前被调用恰好一次

#### Scenario: Disabled component skips update
- **WHEN** 一个 Component 的 `enabled` 被设为 `false`
- **THEN** 该组件的 `update()` 不被调用，但 `onDestroy()` 仍正常触发

### Requirement: Entity as component container
系统 SHALL 提供 `Entity` 类，作为组件的容器（Unity: `GameObject`）。
Entity SHALL 支持以下操作：
- `addComponent(component)` — 添加组件并设置 `component.entity` 引用（Unity: `AddComponent<T>()`）
- `getComponent(ComponentClass)` — 按类型获取组件（Unity: `GetComponent<T>()`）
- `removeComponent(ComponentClass)` — 移除组件并触发其 `onDestroy()`
- `hasComponent(ComponentClass)` — 检查是否拥有某类型组件
Entity SHALL 拥有唯一 `id`（自增整数）、`name`（字符串）、`tag`（字符串）和 `active` 状态。
Entity 创建时 SHALL 自动包含一个 `TransformComponent`。

#### Scenario: Add and retrieve component
- **WHEN** 调用 `entity.addComponent(new HealthComponent({maxHp: 100}))`
- **THEN** `entity.getComponent(HealthComponent)` 返回该组件实例，且 `component.entity === entity`

#### Scenario: Entity auto-includes Transform
- **WHEN** 创建一个新的 `Entity`
- **THEN** `entity.getComponent(TransformComponent)` 不为 `null`

### Requirement: EntityManager for global entity tracking
系统 SHALL 提供 `EntityManager` 单例，管理所有活跃 Entity（Unity: `Object.FindObjectsOfType` 等价）。
EntityManager SHALL 支持：
- `add(entity)` — 注册实体
- `remove(entity)` — 标记实体为待销毁
- `findByTag(tag)` — 返回第一个匹配 tag 的实体（Unity: `GameObject.FindWithTag()`）
- `findAllByTag(tag)` — 返回所有匹配 tag 的实体
- `findByComponent(ComponentClass)` — 返回所有拥有该组件的实体
- `updateAll(deltaTime)` — 遍历所有实体的所有组件调用 `update()`
- `cleanup()` — 执行延迟销毁

#### Scenario: Find entity by tag
- **WHEN** 一个 tag 为 `'player'` 的 Entity 被添加到 EntityManager
- **THEN** `EntityManager.findByTag('player')` 返回该 Entity

#### Scenario: Delayed destruction
- **WHEN** 在 `update()` 过程中调用 `EntityManager.remove(entity)`
- **THEN** 该 Entity 在当前帧的 `update` 循环结束后才被真正销毁，不会导致迭代错误

### Requirement: GameLoop with fixed timestep
系统 SHALL 提供 `GameLoop` 类，驱动游戏的更新和渲染循环。
GameLoop SHALL 使用 `requestAnimationFrame` 驱动。
每帧 SHALL 计算 `deltaTime`（秒），并 clamp 到最大 0.1 秒。
GameLoop SHALL 按以下顺序执行每帧：
1. InputManager.update()
2. EntityManager.updateAll(deltaTime)
3. PhysicsSystem.update()
4. EntityManager.cleanup()
5. RenderSystem.render()
GameLoop SHALL 支持 `start()` / `stop()` / `pause()` / `resume()`。

#### Scenario: Frame execution order
- **WHEN** GameLoop 执行一帧
- **THEN** Input 采集先于实体更新，实体更新先于物理检测，物理检测先于延迟销毁，延迟销毁先于渲染

#### Scenario: Pause freezes game
- **WHEN** 调用 `GameLoop.pause()`
- **THEN** `update` 阶段不再执行，但 `render` 仍绘制最后状态

### Requirement: EventSystem for decoupled communication
系统 SHALL 提供 `EventSystem` 全局事件总线，支持发布/订阅模式（Unity: `UnityEvent` / C# delegate）。
EventSystem SHALL 支持：
- `on(eventName, callback)` — 订阅事件
- `off(eventName, callback)` — 取消订阅
- `emit(eventName, ...args)` — 触发事件，所有订阅者按注册顺序收到回调

#### Scenario: Event publish and subscribe
- **WHEN** 订阅 `'onDeath'` 事件后，触发 `emit('onDeath', entity)`
- **THEN** 订阅回调被调用，参数为该 entity

#### Scenario: Unsubscribe stops receiving events
- **WHEN** 调用 `off('onDeath', callback)` 后再次触发 `'onDeath'`
- **THEN** 该 callback 不被调用

### Requirement: TransformComponent for spatial data
系统 SHALL 提供 `TransformComponent`，管理实体的空间信息（Unity: `Transform`）。
TransformComponent SHALL 包含：
- `position: {x, y}` — 世界坐标（Unity: `transform.position`）
- `rotation: number` — 旋转角度（弧度）（Unity: `transform.rotation`）
- `scale: {x, y}` — 缩放（Unity: `transform.localScale`）

#### Scenario: Position update
- **WHEN** 设置 `transform.position = {x: 100, y: 200}`
- **THEN** 该实体的渲染位置和碰撞体位置都基于此坐标
