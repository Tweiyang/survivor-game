## ADDED Requirements

### Requirement: Level config defines room-based maps
系统 SHALL 提供 `levels.json` 配置文件，定义所有关卡数据（Unity: Tilemap Scene Assets）。
每个关卡 SHALL 包含：
- `id` — 关卡唯一标识
- `name` — 显示名称
- `killsToOpenBoss` — 开启 Boss 门需要的击杀数
- `rooms` — 房间数组

每个房间 SHALL 包含：
- `id` — 房间唯一标识
- `type` — 房间类型：`"start"` | `"normal"` | `"corridor"` | `"side"` | `"boss"`
- `offsetX`, `offsetY` — 房间在总地图中的网格偏移
- `width`, `height` — 房间尺寸（瓦片数）
- `groundData` — 地面层瓦片 ID 数组（长度 = width × height）
- `wallData` — 墙壁层瓦片 ID 数组（-1 表示无墙壁）
- `spawns` — 刷怪点数组（可选）

`type: "start"` 的房间 SHALL 额外包含 `playerSpawn: { gridX, gridY }` — 玩家出生点（相对房间内的网格坐标）。
`type: "boss"` 的房间 SHALL 额外包含 `gate: { gridX, gridY, width, height }` — Boss 门位置（相对房间内坐标）。

每个刷怪点 SHALL 包含：
- `gridX`, `gridY` — 相对房间内的网格坐标
- `monsterType` — 怪物类型 ID（对应 monsters.json 的 key）
- `isBoss` — 是否为 Boss（可选，默认 false）

#### Scenario: Load level config
- **WHEN** fetch levels.json 并解析
- **THEN** 得到包含 rooms/spawns/gate 等完整关卡数据

#### Scenario: Side room is optional
- **WHEN** 关卡有 type="side" 的岔路房间
- **THEN** 玩家可以选择进入或跳过，不影响通关条件（仅 Boss 门击杀计数）
