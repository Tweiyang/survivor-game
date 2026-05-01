## Requirements

### Requirement: SpriteRenderer component for entity drawing
系统 SHALL 提供 `SpriteRenderer` 组件，负责在 Canvas 2D 上绘制实体的视觉表现（Unity: `SpriteRenderer`）�?
SpriteRenderer SHALL 支持以下属性：
- `width` / `height` �?绘制尺寸（像素）
- `color` �?填充颜色（CSS 颜色字符串）
- `shape` �?形状类型：`'rect'` / `'circle'` / `'triangle'`（Phase 0 简笔画风格�?
- `sortingLayer` �?渲染层级（整数，对应 design.md D6 层级定义�?
- `sortingOrder` �?同层内排序�?
- `visible` �?是否可见
- `opacity` �?透明�?0~1
SpriteRenderer SHALL 预留 `sprite` 属性用于后续加�?PNG 图片（Unity: `sprite` 字段）�?

#### Scenario: Draw entity as colored rectangle
- **WHEN** 实体拥有 SpriteRenderer（shape='rect', color='#FF0000', width=32, height=32�?
- **THEN** Canvas 上在实体 Transform 位置绘制一�?32×32 的红色矩�?

#### Scenario: Invisible sprite not rendered
- **WHEN** SpriteRenderer �?`visible` 设为 `false`
- **THEN** 该实体不出现在画面上

### Requirement: RenderSystem manages draw order
系统 SHALL 提供 `RenderSystem`，统一管理所�?SpriteRenderer 的绘制顺序（Unity: Sorting Layer 系统）�?
RenderSystem SHALL�?
- 每帧收集所有带 SpriteRenderer 的实�?
- �?`sortingLayer` 升序排列，同层按 `sortingOrder` 排列，同 order �?Y 坐标排列（Y 大的后绘制，实现伪深度）
- 应用摄像机偏移后绘制
- 提供 `render(ctx, camera)` 方法

#### Scenario: Y-axis sorting for depth effect
- **WHEN** 两个同层实体，A �?Y=100，B �?Y=200
- **THEN** A 先绘制，B 后绘制（B 在视觉上覆盖 A�?

### Requirement: CameraSystem follows target
系统 SHALL 提供 `CameraSystem`，实现摄像机跟随和视口管理（Unity: `Camera`）�?
CameraSystem SHALL 支持�?
- `setTarget(entity)` �?设置跟随目标
- `position: {x, y}` �?摄像机世界坐�?
- `viewportWidth` / `viewportHeight` �?视口尺寸�? Canvas 尺寸�?
- 每帧平滑跟随目标实体�?Transform 位置
- `worldToScreen(worldPos)` �?世界坐标转屏幕坐�?
- `screenToWorld(screenPos)` �?屏幕坐标转世界坐�?

#### Scenario: Camera follows player smoothly
- **WHEN** 摄像机目标为玩家实体，玩家移动到 (500, 300)
- **THEN** 摄像机位置平滑趋�?(500, 300)，玩家保持在画面中心附近

#### Scenario: World to screen conversion
- **WHEN** 摄像机在 (100, 100)，视�?800×600，查询世界坐�?(100, 100) 的屏幕坐�?
- **THEN** 返回 (400, 300)（画面中心）

### Requirement: TilemapRenderer for tile-based maps
系统 SHALL 提供 `TilemapRenderer`，基于瓦片数据在 Canvas 上渲染地图（Unity: `Tilemap` + `TilemapRenderer`）�?
TilemapRenderer SHALL�?
- 接受瓦片地图数据（JSON 格式，定义见 design.md D8�?
- �?`tileSize` 逐格绘制，使�?`tileTypes` 中定义的颜色
- 支持多图层渲染（ground �?+ walls 层）
- 只渲染摄像机视口内可见的瓦片（视锥裁剪）
- 提供 `getTileAt(worldX, worldY)` 查询指定坐标的瓦片类�?
- 提供 `isWalkable(worldX, worldY)` 查询指定位置是否可行�?

#### Scenario: Render visible tiles only
- **WHEN** 地图�?30×30 瓦片，摄像机只看到其�?10×10 区域
- **THEN** 只绘制这 10×10 = 100 个瓦片，非可见瓦片不参与绘制

#### Scenario: Wall tile blocks movement
- **WHEN** 查询一个 `tileType` 为 `wall`（walkable=false）的坐标
- **THEN** `isWalkable()` 返回 `false`

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
