## Purpose
网络管理抽象层，封装 Colyseus Client SDK，管理连接生命周期，提供单机/联机模式无缝切换。

## ADDED Requirements

### Requirement: NetworkManager provides singleton network API
系统 SHALL 提供 `NetworkManager` 单例类（Unity: NetworkManager / Netcode for GameObjects）。
NetworkManager SHALL 管理以下状态：
- `mode`: `'offline'` | `'online'` — 当前网络模式
- `sessionId`: string | null — 当前玩家在服务器的会话 ID
- `room`: Room | null — 当前加入的 Colyseus Room 引用
- `isConnected`: boolean — WebSocket 是否已连接

NetworkManager SHALL 提供以下公共 API：
- `connect(serverUrl)` — 连接到 Colyseus 服务器（Unity: NetworkManager.StartClient）
- `disconnect()` — 断开连接（Unity: NetworkManager.Shutdown）
- `createRoom(roomName, options)` — 创建房间并加入
- `joinRoom(roomId)` — 加入指定房间
- `joinOrCreate(roomName, options)` — 加入或创建房间
- `getAvailableRooms(roomName)` — 查询可用房间列表
- `send(type, data)` — 向服务器发送消息
- `onStateChange(callback)` — 注册状态变化监听
- `onMessage(type, callback)` — 注册自定义消息监听
- `isOnline` — 只读属性，返回 `mode === 'online' && isConnected`

#### Scenario: Connect to server
- **WHEN** 调用 `NetworkManager.connect('ws://localhost:2567')`
- **THEN** WebSocket 连接建立，`isConnected` 变为 `true`

#### Scenario: Create and join room
- **WHEN** 调用 `NetworkManager.createRoom('battle', { characterId: 'warrior' })`
- **THEN** 服务器创建 BattleRoom，客户端自动加入，`room` 不为 null，`sessionId` 被赋值

#### Scenario: Offline mode bypass
- **WHEN** `mode === 'offline'` 时调用 `send()`
- **THEN** 消息被静默忽略，不抛异常

### Requirement: NetworkManager supports mode switching
NetworkManager SHALL 支持在 `offline` 和 `online` 模式间切换。
- `offline` 模式下：所有游戏逻辑在本地运行（与当前单机模式完全一致），不连接服务器
- `online` 模式下：连接 Colyseus 服务器，输入发送到服务器，状态从服务器同步
- 切换点 SHALL 在 LobbyScene 中由用户操作触发

#### Scenario: Select single player
- **WHEN** 玩家在大厅选择"单人游戏"
- **THEN** `NetworkManager.mode` 设为 `'offline'`，直接进入 BattleScene 使用本地逻辑

#### Scenario: Select multiplayer
- **WHEN** 玩家在大厅选择"创建房间"或"加入房间"
- **THEN** `NetworkManager.mode` 设为 `'online'`，连接服务器并加入房间

### Requirement: NetworkManager handles connection events
NetworkManager SHALL 通过 EventSystem 发射以下网络事件：
- `onNetConnected` — 连接成功
- `onNetDisconnected` — 连接断开（含 code 和 reason）
- `onNetError` — 连接错误
- `onNetRoomJoined` — 成功加入房间（含 room 引用）
- `onNetRoomLeft` — 离开房间

#### Scenario: Server goes down
- **WHEN** 游戏进行中服务器意外断开
- **THEN** 发射 `onNetDisconnected` 事件，BattleScene 显示断线提示
