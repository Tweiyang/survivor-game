## Purpose
大厅/房间场景，提供创建房间、加入房间、玩家准备、开始游戏的完整联机入口流程。

## ADDED Requirements

### Requirement: LobbyScene provides multiplayer entry flow
系统 SHALL 提供 `LobbyScene` 场景（Unity: Lobby UI Canvas），在角色选择后显示。
LobbyScene SHALL 提供以下 UI 元素：
- "单人游戏" 按钮 — 进入 offline 模式直接开始
- "创建房间" 按钮 — 连接服务器并创建新房间
- "加入房间" 按钮 — 显示可用房间列表
- 房间列表面板 — 显示可加入的房间（roomId、玩家数、状态）
- 服务器地址输入框 — 默认 `ws://localhost:2567`

#### Scenario: Enter lobby after character select
- **WHEN** 玩家在角色选择场景确认角色
- **THEN** 进入 LobbyScene，显示单人/多人选择

#### Scenario: Create room
- **WHEN** 点击"创建房间"
- **THEN** 连接服务器，创建 BattleRoom，进入等待界面

#### Scenario: Join existing room
- **WHEN** 点击房间列表中某个可用房间
- **THEN** 加入该房间，进入等待界面

### Requirement: LobbyScene shows waiting room UI
当玩家创建或加入房间后，LobbyScene SHALL 显示等待界面：
- 房间 ID（可分享）
- 已加入的玩家列表（角色名 + 角色图标 + 准备状态）
- "准备" 按钮 — 切换本玩家的 ready 状态
- 当所有玩家 ready 后自动开始倒计时（3 秒）
- 倒计时结束后切换到 BattleScene

#### Scenario: All players ready countdown
- **WHEN** 房间内所有玩家均已 ready
- **THEN** 显示 3 秒倒计时，倒计时结束后进入 BattleScene

#### Scenario: Player un-readies during countdown
- **WHEN** 倒计时中某玩家取消 ready
- **THEN** 倒计时取消，回到等待状态

#### Scenario: Room full
- **WHEN** 第 5 个玩家尝试加入已有 4 人的房间
- **THEN** 服务器拒绝加入，客户端显示"房间已满"提示
