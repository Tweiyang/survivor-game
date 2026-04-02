# touch-input Specification

## Purpose
TBD - created by archiving change phase4-multi-input. Update Purpose after archive.
## Requirements
### Requirement: VirtualJoystick renders a draggable touch joystick
系统 SHALL 提供 `VirtualJoystick` 类，在 Canvas 上绘制虚拟摇杆 UI（Unity: On-Screen Stick）。
VirtualJoystick SHALL 位于屏幕左下角 1/4 区域，包含：
- 外圈底盘（半透明圆形，半径约 60px）
- 内圈拇指（可拖拽圆形，半径约 24px）
VirtualJoystick SHALL 在触摸未激活时以静态位置显示底盘。
VirtualJoystick SHALL 在 `touchstart` 命中底盘区域时激活拖拽。
VirtualJoystick SHALL 在拖拽过程中限制拇指圆不超出底盘半径。
VirtualJoystick SHALL 输出归一化的轴值 `axisX: -1~1` 和 `axisY: -1~1`（类似 `Input.GetAxis`）。
VirtualJoystick SHALL 在 `touchend` 时回弹拇指到中心，轴值归零。
VirtualJoystick SHALL 使用半透明绘制（alpha ≤ 0.5），避免遮挡游戏画面。

#### Scenario: Drag joystick right
- **WHEN** 触摸激活摇杆并向右拖拽至底盘边缘
- **THEN** `axisX` = 1.0, `axisY` ≈ 0

#### Scenario: Release joystick
- **WHEN** 手指离开摇杆
- **THEN** 拇指回到中心，`axisX` = 0, `axisY` = 0

#### Scenario: Diagonal drag with normalization
- **WHEN** 向右下 45° 拖拽至底盘边缘
- **THEN** `axisX` ≈ 0.707, `axisY` ≈ 0.707

### Requirement: VirtualButton provides touch action buttons
系统 SHALL 提供 `VirtualButton` 类，在 Canvas 上绘制可点按的虚拟按钮（Unity: On-Screen Button）。
VirtualButton SHALL 支持配置：
- `position` — 屏幕坐标 {x, y}
- `radius` — 按钮半径
- `icon` — 显示文本/图标
- `actionName` — 对应的 action 名称
VirtualButton SHALL 在触摸命中时标记 `isPressed = true`（本帧 down），手指离开时标记 `isPressed = false`（本帧 up）。
VirtualButton SHALL 支持冷却遮罩渲染（与 HUD 技能槽联动，传入 cooldownPercent）。

#### Scenario: Tap skill button
- **WHEN** 手指触碰技能按钮区域
- **THEN** `actionName` 对应的 action 触发 `actionDown`，松开后触发 `actionUp`

#### Scenario: Button with cooldown overlay
- **WHEN** 技能冷却中（cooldownPercent = 0.6）
- **THEN** 按钮显示 60% 扇形遮罩

### Requirement: TouchInputProvider implements InputProvider interface
系统 SHALL 提供 `TouchInputProvider` 类，实现 `InputProvider` 接口（Unity: TouchInputModule）。
TouchInputProvider SHALL 管理一个 `VirtualJoystick` 实例和多个 `VirtualButton` 实例。
TouchInputProvider SHALL 实现多点触控追踪：每个 `touch.identifier` 绑定到首次命中的控件，后续 `touchmove/touchend` 只发送给该控件。
TouchInputProvider SHALL 实现：
- `update()` — 刷新 actionDown/actionUp 帧状态
- `getAxis(axisName)` — 从 VirtualJoystick 读取轴值
- `getAction(actionName)` — 返回 action 是否激活
- `getActionDown(actionName)` — 本帧 action 是否刚按下
- `getActionUp(actionName)` — 本帧 action 是否刚松开
- `render(ctx)` — 在 Canvas 上绘制所有虚拟控件
- `dispose()` — 移除 touch 事件监听

TouchInputProvider SHALL 在 Canvas 上注册 `touchstart/touchmove/touchend/touchcancel` 事件，并调用 `e.preventDefault()` 阻止页面滚动。
TouchInputProvider 默认 SHALL 创建以下控件：
- 左下角移动摇杆
- 右下角主动技能按钮（actionName: 'activeSkill'）
- 右上角暂停按钮（actionName: 'pause'）

#### Scenario: Multi-touch joystick + skill
- **WHEN** 左手拖拽摇杆，右手点击技能按钮
- **THEN** 移动轴值和技能 action 同时正确输出，互不干扰

#### Scenario: Touch cancel resets state
- **WHEN** 系统触发 `touchcancel`（如来电打断）
- **THEN** 所有控件重置为未激活状态

