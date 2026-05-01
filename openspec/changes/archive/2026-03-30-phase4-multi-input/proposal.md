## Why

Phase 4（P4）：多端输入系统。当前游戏仅支持键盘 WASD + 空格操作，无法在移动端游玩。需要实现触屏虚拟摇杆、自动检测设备类型切换输入 Provider，并提供键位自定义 UI，让 PC 和手机端都能流畅操控。

## What Changes

- **新增 `TouchInputProvider`**：虚拟摇杆 + 虚拟按钮（主动技能），实现 `InputProvider` 接口，接入现有 `InputManager.setProvider()`
- **新增虚拟摇杆 UI 组件**：Canvas 上绘制的移动摇杆（左拇指区域）和技能按钮（右拇指区域），支持多点触控
- **新增设备自动检测**：根据 `navigator.maxTouchPoints` / `ontouchstart` 等条件自动选择 Provider；首次触屏事件动态切换
- **新增键位设置 UI 场景**：独立场景或弹窗，展示当前键位绑定、支持逐项修改和重置默认
- **改造 `InputManager`**：增加 `getAction(actionName)` 统一动作接口（替代裸 keyCode），让触屏和键盘都通过 action 来传递"技能释放"等语义化操作
- **改造 `PlayerController`**：从直接读 `getKeyDown('Space')` 改为读 `getAction('activeSkill')`，解耦输入硬编码
- **改造 `main.js`**：启动时执行设备检测，自动设置 Provider

## Capabilities

### New Capabilities
- `touch-input`: 虚拟摇杆 + 触屏按钮的 `TouchInputProvider` 实现，Canvas overlay 渲染，多点触控支持
- `device-detection`: 设备类型自动检测（PC/移动端），运行时 Provider 热切换逻辑
- `keybind-settings`: 键位设置 UI 场景，展示/修改/重置键位绑定，localStorage 持久化

### Modified Capabilities
- `input`: InputManager 新增 Action 抽象层（`getAction` / `getActionDown` / `getActionUp`），让游戏逻辑与具体按键解耦；扩展 action bindings 包含 `activeSkill`、`pause` 等语义化动作

## Impact

- **src/systems/InputManager.js** — 核心改造：新增 action 接口、设备检测逻辑
- **src/entities/PlayerFactory.js (PlayerController)** — 解耦硬编码按键为 action
- **src/main.js** — 启动时设备检测 + Provider 初始化
- **新增文件** — `TouchInputProvider.js`、`VirtualJoystick.js`、`DeviceDetector.js`、`KeybindSettingsScene.js`
- **无 breaking change** — 键盘用户体验不变，TouchProvider 为新增路径
