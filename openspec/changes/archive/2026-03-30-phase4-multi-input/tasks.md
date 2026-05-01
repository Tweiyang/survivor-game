## 1. Action 抽象层（InputManager + KeyboardProvider 改造）

- [x] 1.1 改造 `KeyboardInputProvider`：新增 `_actionBindings` 映射表 `{ activeSkill: 'Space', pause: 'Escape' }` 和 `getAction(name)` / `getActionDown(name)` / `getActionUp(name)` 方法 — 验证：`getActionDown('activeSkill')` 在按 Space 时返回 true
- [x] 1.2 改造 `KeyboardInputProvider`：新增 `setActionBinding(actionName, keyCode)` 方法，支持修改 action → key 绑定并持久化到 localStorage — 验证：调用后按新键能触发 action
- [x] 1.3 改造 `KeyboardInputProvider`：新增空 `render(ctx)` 方法（键盘模式无需渲染 UI）— 验证：调用不报错
- [x] 1.4 改造 `InputManager`：代理新增 `getAction` / `getActionDown` / `getActionUp` / `render(ctx)` / `getCurrentDeviceType()` 到 Provider — 验证：外部可通过 InputManager 调用所有新接口
- [x] 1.5 改造 `InputManager`：新增 `setActionBinding(name, keyCode)` 代理和 `resetToDefault()` 增强（同时重置 action bindings）— 验证：重置后恢复默认绑定

## 2. PlayerController 解耦

- [x] 2.1 改造 `PlayerController`：将 `input.getKeyDown('Space')` 替换为 `input.getActionDown('activeSkill')`，将 ESC 暂停逻辑改为 `input.getActionDown('pause')` — 验证：键盘下行为不变，Space 触发技能、ESC 暂停

## 3. 虚拟摇杆组件

- [x] 3.1 创建 `src/ui/VirtualJoystick.js`：实现外圈底盘 + 内圈拇指绘制、touch 拖拽计算、归一化轴值输出 `axisX/axisY`，手指释放回弹 — 验证：独立调用 render 能看到半透明摇杆，拖拽后 axisX/Y 返回 -1~1
- [x] 3.2 创建 `src/ui/VirtualButton.js`：实现圆形按钮绘制、touch 命中检测、isPressed / wasJustPressed / wasJustReleased 帧状态、冷却遮罩渲染 — 验证：点击按钮后 wasJustPressed 返回 true

## 4. 触屏输入 Provider

- [x] 4.1 创建 `src/systems/TouchInputProvider.js`：实现 InputProvider 接口，管理 VirtualJoystick + VirtualButton[] 实例，注册 touchstart/touchmove/touchend/touchcancel — 验证：触屏模式下移动摇杆产生轴值
- [x] 4.2 实现多点触控追踪：`_touchTracker` Map 绑定 touch.identifier → 控件，确保摇杆和按钮互不干扰 — 验证：左手摇杆+右手按钮同时操作正确
- [x] 4.3 TouchInputProvider 默认布局：左下角摇杆、右下角技能按钮（activeSkill）、右上角暂停按钮（pause）— 验证：三个控件位置正确渲染

## 5. 设备检测

- [x] 5.1 创建 `src/systems/DeviceDetector.js`：实现 `detect()` 返回 `'keyboard' | 'touch'`，基于 `matchMedia('(pointer: coarse)')` + `maxTouchPoints` — 验证：手机返回 touch，桌面返回 keyboard
- [x] 5.2 实现运行时切换：监听首次 touchstart/mousemove 事件，切换设备类型并通过 `onDeviceChange(callback)` 通知 — 验证：桌面触屏后切换为 touch 模式

## 6. main.js 集成

- [x] 6.1 改造 `main.js`：启动时调用 `DeviceDetector.detect()` 决定初始 Provider（keyboard 或 touch），注册 `onDeviceChange` 回调自动切换 Provider — 验证：手机打开自动使用触屏模式
- [x] 6.2 改造 `main.js`：在 `onDebugRender` 中调用 `inputManager.render(ctx)` 绘制触屏 UI（仅 touch 模式有效）— 验证：触屏模式可见摇杆和按钮
- [x] 6.3 改造 `main.js`：将 ESC 暂停从 `window.addEventListener('keydown')` 硬编码改为由 InputManager 的 action 驱动（PlayerController 或 GameLoop 检测 pause action）— 验证：ESC 暂停依然工作，触屏暂停按钮也生效

## 7. 键位设置 UI

- [x] 7.1 创建 `src/ui/KeybindSettingsUI.js`：Canvas 覆盖弹窗，列出所有可绑定 action + 当前键位，支持点击行进入监听模式、恢复默认、关闭返回 — 验证：打开后可见所有 action 列表
- [x] 7.2 改造暂停菜单（HUD 或 BattleScene）：添加"键位设置"按钮入口（仅 keyboard 模式显示），点击打开 KeybindSettingsUI — 验证：暂停后可进入键位设置