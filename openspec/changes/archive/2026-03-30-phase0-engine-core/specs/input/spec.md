## ADDED Requirements

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

#### Scenario: WASD movement axis
- **WHEN** 按住 W 键
- **THEN** `InputManager.getAxis('vertical')` 返回 `-1`（向上为负 Y）

#### Scenario: Key down detection
- **WHEN** 玩家在本帧按下 ESC 键
- **THEN** `InputManager.getKeyDown('Escape')` 在本帧返回 `true`，下一帧返回 `false`

### Requirement: Keyboard input provider
系统 SHALL 提供键盘输入实现（Phase 0 默认输入方式）。
键盘输入 SHALL：
- 监听 `keydown` / `keyup` 事件，维护按键状态 Map
- 支持同时按下多个键（如 W+D 斜向移动）
- 对角移动时 SHALL 归一化方向向量（确保斜向速度 = 直向速度）

#### Scenario: Diagonal movement normalization
- **WHEN** 同时按下 W 和 D
- **THEN** `getAxis('horizontal')` = 0.707, `getAxis('vertical')` = -0.707（归一化后的值）

### Requirement: Key binding configuration
InputManager SHALL 支持键位绑定配置（Unity: Input System 的 Action Binding）。
默认键位映射 SHALL 为：
- `moveUp` → `KeyW`
- `moveDown` → `KeyS`
- `moveLeft` → `KeyA`
- `moveRight` → `KeyD`
- `pause` → `Escape`

键位配置 SHALL：
- 可通过 `setBinding(action, keyCode)` 修改
- 存储在 `localStorage`（键 `'keyBindings'`）
- 提供 `resetToDefault()` 恢复默认键位

#### Scenario: Custom key binding
- **WHEN** 调用 `InputManager.setBinding('moveUp', 'ArrowUp')`
- **THEN** 按 ArrowUp 键时 `getAxis('vertical')` 返回 `-1`，W 键不再有效

#### Scenario: Persist key bindings
- **WHEN** 修改键位后刷新页面
- **THEN** InputManager 从 localStorage 加载上次保存的键位配置

### Requirement: Touch input provider placeholder
InputManager SHALL 预留触屏输入 Provider 接口（Phase 4 实现）。
系统 SHALL 定义 `InputProvider` 接口：
- `update()` — 每帧刷新
- `getAxis(axisName)` — 返回轴值
- `getKey(keyName)` — 返回按键状态
InputManager SHALL 支持运行时切换 Provider（键盘 ↔ 触屏）。

#### Scenario: Provider interface exists
- **WHEN** Phase 4 实现 TouchInputProvider
- **THEN** 只需 `InputManager.setProvider(new TouchInputProvider())` 即可切换，无需修改游戏逻辑
