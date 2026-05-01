## ADDED Requirements

### Requirement: HUD displays multiplayer information
HUD SHALL 在联机模式下额外显示以下信息（Unity: UI Canvas 多人信息面板）：
- **队友状态栏**：屏幕右上角显示所有队友的角色图标 + 名称 + 血条（小型）
- **联机状态指示器**：右下角显示当前连接状态（🟢 已连接 / 🔴 已断线）
- **延迟显示**：右下角显示当前 ping 值（ms）
- offline 模式下这些 UI 元素 SHALL 不显示

#### Scenario: Show teammate status
- **WHEN** 联机模式中有 3 个队友
- **THEN** 右上角显示 3 个小型队友状态栏，实时更新血量

#### Scenario: Teammate dies
- **WHEN** 队友 HP 归零
- **THEN** 该队友状态栏变暗/灰色，显示"已阵亡"

#### Scenario: Connection indicator
- **WHEN** 网络延迟从 50ms 升至 200ms
- **THEN** 延迟数字更新，颜色从绿色变为黄色
