## ADDED Requirements

### Requirement: SceneManager supports lobby scene in flow
SceneManager SHALL 支持扩展后的场景流程（Unity: Scene 加载流程）：
- `character-select` → `lobby` → `battle`（联机模式）
- `character-select` → `battle`（单机模式，与当前一致）
- SceneManager SHALL 在切换场景时传递上下文数据（选定角色 ID、房间引用等）

#### Scenario: Multiplayer flow
- **WHEN** 玩家选择角色后进入联机模式
- **THEN** 场景流程为 character-select → lobby → battle

#### Scenario: Single player flow unchanged
- **WHEN** 玩家在大厅选择"单人游戏"
- **THEN** 场景流程与当前完全一致，不经过 lobby 等待
