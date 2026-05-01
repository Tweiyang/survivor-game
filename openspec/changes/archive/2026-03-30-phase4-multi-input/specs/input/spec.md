## MODIFIED Requirements

### Requirement: InputManager abstracts platform input
系统 SHALL 提供 `InputManager` 单例，统一抽象键盘和触屏输入（Unity: `Input` / 新 Input System）。
所有游戏逻辑 SHALL 通过 InputManager 的 API 读取输入，不直接监听 DOM 事件。

InputManager SHALL 提供以下 API：
- `getAxis(axisName)` — 返回 -1~1 的浮点值（Unity: `Input.GetAxis()`）
  - 预定义轴：`'horizontal'`（A/D 映射 -1/+1），`'vertical'`（W/S 映射 -1/+1）
- `getKey(keyName)` — 当前帧是否按住（Unity: `Input.GetKey()`）
- `getKeyDown(keyName)` — 当前帧是否刚按下（Unity: `Input.GetKeyDown()`）
- `getKeyUp(keyName)` — 当前帧是否刚松开（Unity: `Input.GetKeyUp()`）
- `update()` — 每帧开始时调用，刷新按键状态

**P4 新增** — Action 抽象层（Unity: `InputAction`）：
- `getAction(actionName)` — 返回 action 是否激活（持续按住 = true）
- `getActionDown(actionName)` — 本帧 action 是否刚触发
- `getActionUp(actionName)` — 本帧 action 是否刚结束
预定义 actions：
- `'activeSkill'` — 键盘默认 `Space`，触屏映射技能按钮
- `'pause'` — 键盘默认 `Escape`，触屏映射暂停按钮

**P4 新增** — Provider 管理增强：
- `getCurrentDeviceType()` — 返回 `'keyboard' | 'touch'`
- `render(ctx)` — 代理到当前 Provider 的 render 方法（触屏模式绘制摇杆 UI）
- 运行时通过 `DeviceDetector` 的回调自动切换 Provider

#### Scenario: WASD movement axis
- **WHEN** 按住 W 键
- **THEN** `InputManager.getAxis('vertical')` 返回 `-1`（向上为负 Y）

#### Scenario: Action down detection (keyboard)
- **WHEN** 玩家在本帧按下 Space 键
- **THEN** `InputManager.getActionDown('activeSkill')` 在本帧返回 `true`，下一帧返回 `false`

#### Scenario: Action down detection (touch)
- **WHEN** 触屏模式下玩家点击技能按钮
- **THEN** `InputManager.getActionDown('activeSkill')` 在本帧返回 `true`

#### Scenario: Render touch controls
- **WHEN** 当前为 touch 模式
- **THEN** `InputManager.render(ctx)` 在 Canvas 上绘制虚拟摇杆和按钮

### Requirement: Keyboard input provider
系统 SHALL 提供键盘输入实现（Phase 0 默认输入方式）。
键盘输入 SHALL：
- 监听 `keydown` / `keyup` 事件，维护按键状态 Map
- 支持同时按下多个键（如 W+D 斜向移动）
- 对角移动时 SHALL 归一化方向向量（确保斜向速度 = 直向速度）

**P4 新增**：KeyboardInputProvider SHALL 额外实现 action 接口：
- `getAction(actionName)` — 查询 action → keyCode 绑定，返回该 key 是否按住
- `getActionDown(actionName)` — 返回绑定 key 的 keyDown 状态
- `getActionUp(actionName)` — 返回绑定 key 的 keyUp 状态
默认 action 绑定：`{ activeSkill: 'Space', pause: 'Escape' }`

#### Scenario: Diagonal movement normalization
- **WHEN** 同时按下 W 和 D
- **THEN** `getAxis('horizontal')` = 0.707, `getAxis('vertical')` = -0.707（归一化后的值）

#### Scenario: Action via keyboard binding
- **WHEN** 按下 Space 键
- **THEN** `getActionDown('activeSkill')` 返回 `true`

### Requirement: Key binding configuration
InputManager SHALL 支持键位绑定配置（Unity: Input System 的 Action Binding）。
默认键位映射 SHALL 为：
- `moveUp` → `KeyW`
- `moveDown` → `KeyS`
- `moveLeft` → `KeyA`
- `moveRight` → `KeyD`
- `pause` → `Escape`

**P4 新增**：action 绑定映射 SHALL 为：
- `activeSkill` → `Space`
- `pause` → `Escape`

键位配置 SHALL：
- 可通过 `setBinding(action, keyCode)` 修改
- 存储在 `localStorage`（键 `'keyBindings'`）
- 提供 `resetToDefault()` 恢复默认键位
- **P4 新增**：action 绑定通过 `setActionBinding(actionName, keyCode)` 修改

#### Scenario: Custom key binding
- **WHEN** 调用 `InputManager.setBinding('moveUp', 'ArrowUp')`
- **THEN** 按 ArrowUp 键时 `getAxis('vertical')` 返回 `-1`，W 键不再有效

#### Scenario: Custom action binding
- **WHEN** 调用 `InputManager.setActionBinding('activeSkill', 'KeyE')`
- **THEN** 按 E 键时 `getActionDown('activeSkill')` 返回 `true`

### Requirement: Touch input provider placeholder
InputManager SHALL 预留触屏输入 Provider 接口（Phase 4 实现）。
系统 SHALL 定义 `InputProvider` 接口：
- `update()` — 每帧刷新
- `getAxis(axisName)` — 返回轴值
- `getKey(keyName)` — 返回按键状态
- **P4 新增**：`getAction(actionName)` — 返回 action 状态
- **P4 新增**：`getActionDown(actionName)` — 返回 action down 状态
- **P4 新增**：`getActionUp(actionName)` — 返回 action up 状态
- **P4 新增**：`render(ctx)` — 绘制触屏 UI（键盘 Provider 为空实现）
InputManager SHALL 支持运行时切换 Provider（键盘 ↔ 触屏）。

#### Scenario: Provider interface exists
- **WHEN** Phase 4 实现 TouchInputProvider
- **THEN** 只需 `InputManager.setProvider(new TouchInputProvider())` 即可切换，无需修改游戏逻辑
