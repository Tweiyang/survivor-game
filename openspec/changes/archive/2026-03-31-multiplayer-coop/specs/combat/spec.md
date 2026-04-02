## ADDED Requirements

### Requirement: CombatSystem supports server-authoritative mode
CombatSystem SHALL 新增 `authoritative` 模式（Unity: Server RPC 调用模式）。
- 当 `NetworkManager.isOnline` 为 true 时，客户端 SHALL 不直接调用 `dealDamage()`
- 投射物命中检测由客户端本地运行（用于预测表现），但实际伤害由 Server 计算
- 客户端 SHALL 监听 Server 的 `"damageEvent"` 消息来显示伤害飘字和音效
- 当 `NetworkManager.isOnline` 为 false 时（offline 模式），行为与当前完全一致

#### Scenario: Online mode damage flow
- **WHEN** 玩家投射物本地检测到命中怪物（online 模式）
- **THEN** 客户端不调用 dealDamage，等待 Server 的 damageEvent 消息来表现伤害

#### Scenario: Offline mode unchanged
- **WHEN** offline 模式下投射物命中怪物
- **THEN** 直接调用 dealDamage，行为与当前单机完全一致
