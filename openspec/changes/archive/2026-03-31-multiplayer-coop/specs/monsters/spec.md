## ADDED Requirements

### Requirement: Monster entities support remote-controlled mode
怪物系统 SHALL 支持"远程控制"模式（Unity: NetworkObject 非 Owner 实体）。
- 当 `NetworkManager.isOnline` 时，客户端 SHALL 不运行怪物 AI（ChaseAI）
- 怪物位置 SHALL 由 InterpolationSystem 从 Server 状态插值得到
- MonsterFactory SHALL 支持创建"同步怪物"实体（不挂载 AI 组件，仅挂载渲染和碰撞表现）
- 怪物生成/销毁 SHALL 由 StateSynchronizer 监听 Server Schema 变化触发

#### Scenario: Online monster is server-driven
- **WHEN** 联机模式下 Server 在 monsters 中新增一只 slime
- **THEN** 客户端创建一只无 AI 的 slime 实体，位置由插值系统控制

#### Scenario: Monster dies on server
- **WHEN** Server 设置 monsters["m1"].alive = false
- **THEN** 客户端播放死亡动画并销毁该怪物实体
