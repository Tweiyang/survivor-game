## ADDED Requirements

### Requirement: LevelManager supports server-authoritative progression
LevelManager SHALL 在联机模式下将关卡进度判定委托给 Server（Unity: Server RPC 模式）。
- 客户端 SHALL 从 `room.state.levelState` 读取 `totalKills`、`bossGateOpen`、`phase` 等状态
- 客户端 SHALL 不再自行计算击杀计数和 Boss 门判定
- 客户端 SHALL 监听 `levelState` 变化来触发 UI 更新（如 Boss 门开启动画）
- offline 模式下行为与当前完全一致

#### Scenario: Online boss gate opens
- **WHEN** Server 设置 `levelState.bossGateOpen = true`
- **THEN** 客户端 LevelManager 收到状态变化，触发 Boss 门开启动画和音效

#### Scenario: Level complete
- **WHEN** Server 设置 `levelState.phase = "complete"`
- **THEN** 客户端显示通关界面，所有玩家同时看到
