## MODIFIED Requirements

### Requirement: TilemapData supports room-based construction
TilemapData 构造函数 SHALL 新增 `fromRooms(rooms, tileSize)` 静态工厂方法。
`fromRooms` SHALL：
- 计算所有房间的 bounding box → 总地图 width/height
- 初始化总地图的 groundLayer 和 wallLayer（默认填充墙壁）
- 遍历每个房间，将其 groundData/wallData 写入总地图对应偏移位置
- 返回构建好的 TilemapData 实例

TilemapData SHALL 新增 `setTile(gridX, gridY, layer, tileId)` 方法，用于运行时动态修改瓦片（Boss 门开启）。

#### Scenario: Build from 3 rooms
- **WHEN** 调用 TilemapData.fromRooms([startRoom, corridor, bossRoom])
- **THEN** 返回的 TilemapData 总尺寸包含所有房间，瓦片数据正确拼接

#### Scenario: Dynamic tile change for boss gate
- **WHEN** 调用 setTile(gateX, gateY, 'wall', -1) 清除墙壁
- **THEN** isWalkable(gateWorldX, gateWorldY) 返回 true
