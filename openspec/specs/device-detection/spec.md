# device-detection Specification

## Purpose

自动检测当前设备的主要输入方式（键盘/触屏），并支持运行时动态切换。

## Requirements

### Requirement: DeviceDetector identifies input device type
系统 SHALL 提供 `DeviceDetector` 模块，自动检测当前设备的主要输入方式（Unity: `InputSystem.GetDevice<T>()`）。
DeviceDetector SHALL 在启动时执行初始检测：
- 检查 `window.matchMedia('(pointer: coarse)')` 和 `navigator.maxTouchPoints > 0`
- 若两者都满足，判定为触屏设备（`isTouchPrimary = true`）
- 否则判定为键盘/鼠标设备

DeviceDetector SHALL 提供 `detect()` 方法返回 `'keyboard' | 'touch'`。
DeviceDetector SHALL 提供 `onDeviceChange(callback)` 回调注册，设备切换时通知。

#### Scenario: Mobile phone detection
- **WHEN** 在手机浏览器（pointer: coarse + maxTouchPoints > 0）上启动
- **THEN** `detect()` 返回 `'touch'`

#### Scenario: Desktop detection
- **WHEN** 在桌面浏览器（pointer: fine）上启动
- **THEN** `detect()` 返回 `'keyboard'`

### Requirement: Runtime device switching
DeviceDetector SHALL 支持运行时设备切换（双保险机制）：
- 监听首次 `touchstart` 事件 → 若当前为 keyboard 模式，切换到 touch
- 监听首次 `mousemove` 事件 → 若当前为 touch 模式，切换到 keyboard
- 切换后通过 `onDeviceChange` 回调通知 InputManager 更换 Provider

#### Scenario: Laptop touchscreen fallback
- **WHEN** 启动时检测为 keyboard（笔记本），用户触摸屏幕
- **THEN** 首次 `touchstart` 触发切换到 touch 模式，摇杆 UI 出现

#### Scenario: Switch back to keyboard
- **WHEN** 当前为 touch 模式，用户开始使用鼠标
- **THEN** 首次 `mousemove` 切换回 keyboard 模式，摇杆 UI 隐藏