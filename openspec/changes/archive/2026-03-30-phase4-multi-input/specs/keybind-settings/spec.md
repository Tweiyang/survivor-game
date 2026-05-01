## ADDED Requirements

### Requirement: KeybindSettings overlay UI
系统 SHALL 提供 `KeybindSettingsUI` 覆盖层，在游戏暂停时显示键位设置界面（Unity: Settings Panel UI）。
KeybindSettingsUI SHALL 作为 Canvas 上的半透明覆盖弹窗渲染，不切换场景。
KeybindSettingsUI SHALL 展示当前所有可绑定 action 及其对应的按键。
KeybindSettingsUI SHALL 支持点击某个 action 进入"监听模式"，等待用户按下新按键后完成绑定。
KeybindSettingsUI SHALL 提供"恢复默认"按钮，调用 `InputManager.resetToDefault()`。
KeybindSettingsUI SHALL 提供"返回"按钮关闭覆盖层并恢复游戏。
KeybindSettingsUI SHALL 仅在 keyboard 模式下可用（触屏模式隐藏键位设置入口）。

#### Scenario: Open keybind settings
- **WHEN** 游戏暂停后，用户点击"键位设置"按钮
- **THEN** 显示覆盖层，列出所有 action 与当前键位

#### Scenario: Rebind a key
- **WHEN** 用户点击 `moveUp` 行，然后按下 `ArrowUp`
- **THEN** `moveUp` 绑定更新为 `ArrowUp`，显示刷新

#### Scenario: Reset to default
- **WHEN** 用户点击"恢复默认"
- **THEN** 所有 action 恢复为 WASD + Space + Escape 默认绑定

### Requirement: Pause menu shows settings entry
暂停菜单（ESC 暂停后的覆盖 UI）SHALL 显示"键位设置"入口按钮。
该按钮 SHALL 仅在 keyboard 模式下显示。
点击后 SHALL 打开 `KeybindSettingsUI` 覆盖层。

#### Scenario: Access settings from pause
- **WHEN** 按 ESC 暂停游戏后点击"键位设置"
- **THEN** KeybindSettingsUI 覆盖层出现
