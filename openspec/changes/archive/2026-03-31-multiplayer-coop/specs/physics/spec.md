## ADDED Requirements

### Requirement: PhysicsSystem runs on server side
PhysicsSystem 的碰撞检测算法 SHALL 可在服务端（无 Canvas 环境）独立运行（Unity: Physics 在 Server Build 中同样运行）。
- 服务端 ServerPhysics SHALL 复用客户端 PhysicsSystem 的 AABB/圆形碰撞检测算法
- 服务端 SHALL 加载 levels.json 的地图数据用于墙壁碰撞判定
- 客户端 PhysicsSystem 在 online 模式下 SHALL 仅对本地预测实体运行碰撞检测

#### Scenario: Server wall collision
- **WHEN** 服务端处理玩家移动，目标位置处于墙壁 tile
- **THEN** 服务端阻止移动并返回合法位置

#### Scenario: Client prediction collision
- **WHEN** 客户端预测本地玩家移动到墙壁处
- **THEN** 本地预测也阻止移动（与 Server 逻辑一致，减少 reconciliation）
