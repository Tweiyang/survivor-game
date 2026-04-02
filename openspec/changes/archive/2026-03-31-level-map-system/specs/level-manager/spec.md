## ADDED Requirements

### Requirement: LevelManager loads and manages levels
系统 SHALL 提供 `LevelManager` 类，负责加载关卡配置并管理运行时状态（Unity: LevelManager / GameManager）。
LevelManager SHALL 提供：
- `loadLevel(levelId)` — 从 levels.json 加载指定关卡配置
- `buildTilemapData()` — 根据关卡配置构建 TilemapData（多房间拼接）
- `getPlayerSpawnWorldPos()` — 返回玩家出生点的世界坐标
- `getAllSpawns()` — 返回所有刷怪点列表（世界坐标 + monsterType + isBoss）
- `getBossGateWorldRect()` — 返回 Boss 门在世界坐标中的矩形区域
- `currentLevel` — 当前关卡配置引用

LevelManager SHALL 计算总地图尺寸：遍历所有房间，取 `max(offsetX + width)` 和 `max(offsetY + height)`。
LevelManager SHALL 将每个房间的 spawns 的 gridX/gridY 转换为世界坐标（加上房间 offset × tileSize）。

#### Scenario: Build tilemap from rooms
- **WHEN** 调用 buildTilemapData()
- **THEN** 返回的 TilemapData 包含所有房间的瓦片数据，正确拼接在总地图中

#### Scenario: Get all spawns with world coords
- **WHEN** 调用 getAllSpawns()
- **THEN** 返回数组中每个 spawn 的 x/y 为世界坐标（房间 offset + gridX × tileSize + tileSize/2）

### Requirement: LevelManager tracks kill count for boss gate
LevelManager SHALL 维护 `killCount` 计数器。
LevelManager SHALL 监听 `onDeath` 事件，过滤 `tag === 'enemy'` 的死亡实体进行计数。
LevelManager SHALL 提供 `isBossGateOpen()` 方法，返回 `killCount >= currentLevel.killsToOpenBoss`。
LevelManager SHALL 在 Boss 门开启条件达成时发射 `onBossGateOpen` 事件。

#### Scenario: Kill count reaches threshold
- **WHEN** 击杀 8 只怪物（killsToOpenBoss = 8）
- **THEN** isBossGateOpen() 返回 true，触发 onBossGateOpen 事件

### Requirement: LevelManager handles level completion
LevelManager SHALL 监听 Boss 实体的死亡事件。
LevelManager SHALL 在 Boss 死亡时发射 `onLevelComplete` 事件，携带 `{ levelId, nextLevelId }` 数据。
LevelManager SHALL 提供 `getNextLevelId()` — 返回下一关 ID（按 levels 数组顺序），无下一关返回 null。

#### Scenario: Boss defeated completes level
- **WHEN** Boss 实体死亡
- **THEN** 触发 onLevelComplete 事件

#### Scenario: Last level has no next
- **WHEN** 当前是最后一关且 Boss 被击败
- **THEN** getNextLevelId() 返回 null，UI 显示"全部通关"
