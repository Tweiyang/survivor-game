## Context

当前 `InputManager` 已具备 Provider 模式骨架：`KeyboardInputProvider` 实现了 `InputProvider` 接口，`InputManager` 通过 `setProvider()` 支持运行时切换。但存在两个缺陷：
1. **无触屏 Provider** — 移动端完全不可用
2. **游戏逻辑硬编码 keyCode** — `PlayerController` 直接读 `getKeyDown('Space')`，触屏 Provider 无法映射

Unity 映射：本次改造对应 Unity 的 **New Input System**（`InputActionAsset` + `PlayerInput` 组件），通过 Action Map 定义语义化动作，绑定到具体设备控件。

## Goals / Non-Goals

**Goals:**
- 手机浏览器能通过虚拟摇杆流畅操控角色移动
- 触屏上有可点按的主动技能按钮
- PC 用户可自定义键位绑定
- 自动检测设备类型，零配置上手
- 游戏逻辑与具体按键/触屏完全解耦

**Non-Goals:**
- ❌ 手柄/游戏控制器支持（P5+ 或 Unity 阶段）
- ❌ 触屏手势（如双指缩放、滑动攻击）
- ❌ 键位设置场景的动画/过渡效果
- ❌ 虚拟摇杆皮肤自定义

## Decisions

### D1: Action 抽象层（语义化输入）
**选择**：在 `InputManager` 层新增 `getAction(name)` / `getActionDown(name)` / `getActionUp(name)` 接口，游戏逻辑只通过 action 名称读取输入。  
**备选**：让 TouchInputProvider 模拟键盘 keyCode（虚拟 'Space' 键）。  
**理由**：模拟 keyCode 是 hack，无法表达"摇杆方向"等连续值。Action 层更贴近 Unity Input System 的设计，且天然支持键位重绑定。

Unity 映射：`InputAction` → `getAction(name)`, `InputActionMap` → action bindings 配置对象。

预定义 Actions：
```
| Action Name    | 类型   | 键盘默认       | 触屏映射         |
|----------------|--------|----------------|-----------------|
| moveHorizontal | axis   | A/D → -1/+1   | 摇杆 X 轴       |
| moveVertical   | axis   | W/S → -1/+1   | 摇杆 Y 轴       |
| activeSkill    | button | Space          | 技能按钮         |
| pause          | button | Escape         | 暂停按钮(HUD)   |
```

### D2: 虚拟摇杆实现方案
**选择**：Canvas overlay 渲染，直接在游戏 Canvas 上绘制摇杆和按钮，通过 `touchstart/touchmove/touchend` 多点触控事件驱动。  
**备选 A**：HTML DOM 叠加层（div + CSS 圆圈）。  
**备选 B**：独立 Canvas 叠加。  
**理由**：游戏已用单一 Canvas，DOM 叠加需要处理 z-index 和坐标映射；独立 Canvas 需要同步渲染。直接在游戏 Canvas 的 UI 层绘制最简单，且与 Unity 的 Canvas overlay 概念一致。

摇杆布局：
- **左摇杆**：屏幕左下角 1/4 区域，圆形底盘 + 可拖拽拇指圆
- **技能按钮**：屏幕右下角，圆形按钮（显示技能图标 + 冷却遮罩）
- **暂停按钮**：屏幕右上角小图标

Unity 映射：`VirtualJoystick` → Unity UI Canvas 上的 `On-Screen Stick` 控件。

### D3: 设备检测策略
**选择**：启动时检测 + 首次触屏事件切换的双保险机制。  
**理由**：仅靠 `navigator.maxTouchPoints` 会误判笔记本触屏为移动端；仅靠事件则初始帧无法渲染摇杆。双保险 = 初始猜测 + 运行时修正。

```
启动检测:
  isTouchPrimary = (matchMedia('(pointer: coarse)').matches && maxTouchPoints > 0)
    
运行时修正:
  window.addEventListener('touchstart', switchToTouch, { once: true })
  window.addEventListener('mousemove', switchToKeyboard, { once: true })
```

Unity 映射：`InputSystem.GetDevice<Touchscreen>()` 检测。

### D4: 键位设置 UI
**选择**：作为游戏内弹窗覆盖层（非独立场景），通过 ESC 菜单或选角场景的"设置"按钮打开。  
**备选**：独立 `SettingsScene`。  
**理由**：键位设置需要在游戏中随时打开（暂停时），独立场景需要卸载当前场景。弹窗覆盖层更灵活。

### D5: TouchInputProvider 架构
```
TouchInputProvider
  ├── VirtualJoystick (移动摇杆 — 计算 axis 值)
  ├── VirtualButton[] (技能/暂停按钮 — 模拟 actionDown/actionUp)
  └── _touchTracker (多点触控 ID → 控件映射)
```

每个触控点（touch identifier）绑定到首次命中的控件，后续 move/end 只发给该控件，避免摇杆和按钮互相干扰。

## Risks / Trade-offs

- **[Risk] 多点触控复杂度** → 使用 touchId 追踪机制，每个 touch 绑定到一个控件实例，互不干扰
- **[Risk] Canvas 摇杆遮挡游戏画面** → 摇杆使用半透明绘制 (alpha 0.4)，且仅在触屏模式渲染
- **[Risk] 设备误判（触屏笔记本）** → 双保险检测 + 运行时切换，用户也可在设置中手动切换
- **[Trade-off] action 层增加一层间接调用** → 性能影响可忽略（每帧几次 Map 查找），换来完全解耦
