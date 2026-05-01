## ADDED Requirements

### Requirement: Experience drops use server-authoritative pickup
经验球拾取 SHALL 在联机模式下由 Server 权威判定（Unity: Server RPC 拾取确认）。
- Server SHALL 每 tick 检测每个玩家与掉落物的距离
- 当距离 < 拾取半径时，Server SHALL 将经验加到**最先触碰的玩家**的 PlayerState.exp
- Server SHALL 设置 `drops[id].collected = true`，客户端收到后销毁掉落物表现
- 各玩家独立获得经验，独立升级，独立选择技能

#### Scenario: Player picks up exp orb online
- **WHEN** 玩家 A 移动到经验球旁（距离 < 拾取半径），联机模式
- **THEN** Server 判定拾取，玩家 A 的 exp 增加，经验球标记 collected

#### Scenario: Two players near same orb
- **WHEN** 两个玩家同时接近同一经验球
- **THEN** Server 在当前 tick 中优先处理先进入拾取范围的玩家
