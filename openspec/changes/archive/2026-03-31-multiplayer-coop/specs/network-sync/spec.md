## Purpose
状态同步系统，包含客户端预测、服务器校正和远程实体插值，确保联机操作流畅无延迟感。

## ADDED Requirements

### Requirement: PredictionSystem provides client-side prediction for local player
系统 SHALL 提供 `PredictionSystem` 类（Unity: ClientNetworkTransform 预测模式）。
PredictionSystem SHALL：
- 维护一个**输入缓冲区**（环形数组，最近 128 帧），每条记录包含 `{ seq, dx, dy, dt, predictedX, predictedY }`
- 每帧将本地玩家输入**立即应用**到本地实体位置（不等待 Server 确认）
- 同时将输入通过 NetworkManager 发送到 Server：`send('input', { seq, dx, dy, dt })`
- 递增 `seq` 序列号，Server 处理后在 PlayerState.inputSeq 中回传最后处理的序号

PredictionSystem SHALL 在收到 Server 状态更新时执行 **Reconciliation**：
1. 从 Server 回包中获取 `confirmedSeq` 和 `confirmedX/Y`
2. 丢弃输入缓冲区中 `seq <= confirmedSeq` 的所有记录
3. 比较 confirmed 位置与该 seq 时刻的 predicted 位置
4. 若偏差超过阈值（默认 2px）：
   - 将实体位置重置为 confirmed 位置
   - 重放缓冲区中剩余的未确认输入

#### Scenario: Prediction matches server
- **WHEN** 本地预测位置与 Server 确认位置偏差 < 2px
- **THEN** 不做修正，玩家感知无延迟

#### Scenario: Prediction diverges
- **WHEN** 本地预测位置与 Server 确认位置偏差 > 2px（如被怪物推回）
- **THEN** 回滚到 Server 位置 → 重放未确认输入 → 玩家位置平滑修正

#### Scenario: Offline mode skips prediction
- **WHEN** `NetworkManager.mode === 'offline'`
- **THEN** PredictionSystem 不激活，本地逻辑直接控制玩家移动（与单机一致）

### Requirement: InterpolationSystem smooths remote entities
系统 SHALL 提供 `InterpolationSystem` 类（Unity: NetworkTransform 插值模式）。
InterpolationSystem SHALL：
- 为每个远程实体维护一个**状态缓冲区**（最近 3 个 Server 状态快照），每个快照包含 `{ x, y, timestamp }`
- 渲染时在最近两个快照之间做**线性插值**，插值时间 = 当前时间 - 渲染延迟（默认 100ms）
- 当缓冲区不足 2 个快照时（刚加入/网络抖动），SHALL 直接 snap 到最新位置
- 远程实体包括：远程玩家、所有怪物、远程投射物

#### Scenario: Smooth remote player movement
- **WHEN** Server 以 20Hz 发送远程玩家位置
- **THEN** 客户端以 60fps 在位置之间平滑插值，视觉上无跳变

#### Scenario: Buffer underrun
- **WHEN** 网络延迟突增导致状态缓冲区为空
- **THEN** 远程实体停在最后已知位置，不做外推（避免错误预测）

#### Scenario: New entity appears
- **WHEN** Server 状态新增一个怪物
- **THEN** 客户端创建对应的本地表现实体，首帧直接 snap 到 Server 位置

### Requirement: State synchronizer maps server schema to local entities
系统 SHALL 提供 `StateSynchronizer` 类，负责将 Colyseus Schema 状态映射到本地 EntityManager 中的实体。
StateSynchronizer SHALL：
- 监听 `room.state.players.onAdd` → 调用 PlayerFactory 创建远程玩家实体（设置 `ownerId` 和 `networkId`）
- 监听 `room.state.players.onRemove` → 销毁对应实体
- 监听 `room.state.monsters.onAdd/onRemove` → 创建/销毁怪物实体
- 监听 `room.state.drops.onAdd` → 创建掉落物表现
- 每个同步实体的 `networkId` SHALL 与 Server Schema 的 key 一致

#### Scenario: Remote player joins
- **WHEN** 另一位玩家加入房间，`players` 新增一条
- **THEN** 本地创建远程玩家实体，显示对应角色外观

#### Scenario: Monster spawned by server
- **WHEN** Server 在 `monsters` 中新增一条怪物
- **THEN** 本地创建怪物实体，位置从 InterpolationSystem 获取
