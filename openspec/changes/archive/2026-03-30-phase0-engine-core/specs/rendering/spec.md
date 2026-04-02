## ADDED Requirements

### Requirement: SpriteRenderer component for entity drawing
系统 SHALL 提供 `SpriteRenderer` 组件，负责在 Canvas 2D 上绘制实体的视觉表现（Unity: `SpriteRenderer`）。
SpriteRenderer SHALL 支持以下属性：
- `width` / `height` — 绘制尺寸（像素）
- `color` — 填充颜色（CSS 颜色字符串）
- `shape` — 形状类型：`'rect'` / `'circle'` / `'triangle'`（Phase 0 简笔画风格）
- `sortingLayer` — 渲染层级（整数，对应 design.md D6 层级定义）
- `sortingOrder` — 同层内排序值
- `visible` — 是否可见
- `opacity` — 透明度 0~1
SpriteRenderer SHALL 预留 `sprite` 属性用于后续加载 PNG 图片（Unity: `sprite` 字段）。

#### Scenario: Draw entity as colored rectangle
- **WHEN** 实体拥有 SpriteRenderer（shape='rect', color='#FF0000', width=32, height=32）
- **THEN** Canvas 上在实体 Transform 位置绘制一个 32×32 的红色矩形

#### Scenario: Invisible sprite not rendered
- **WHEN** SpriteRenderer 的 `visible` 设为 `false`
- **THEN** 该实体不出现在画面上

### Requirement: RenderSystem manages draw order
系统 SHALL 提供 `RenderSystem`，统一管理所有 SpriteRenderer 的绘制顺序（Unity: Sorting Layer 系统）。
RenderSystem SHALL：
- 每帧收集所有带 SpriteRenderer 的实体
- 按 `sortingLayer` 升序排列，同层按 `sortingOrder` 排列，同 order 按 Y 坐标排列（Y 大的后绘制，实现伪深度）
- 应用摄像机偏移后绘制
- 提供 `render(ctx, camera)` 方法

#### Scenario: Y-axis sorting for depth effect
- **WHEN** 两个同层实体，A 的 Y=100，B 的 Y=200
- **THEN** A 先绘制，B 后绘制（B 在视觉上覆盖 A）

### Requirement: CameraSystem follows target
系统 SHALL 提供 `CameraSystem`，实现摄像机跟随和视口管理（Unity: `Camera`）。
CameraSystem SHALL 支持：
- `setTarget(entity)` — 设置跟随目标
- `position: {x, y}` — 摄像机世界坐标
- `viewportWidth` / `viewportHeight` — 视口尺寸（= Canvas 尺寸）
- 每帧平滑跟随目标实体的 Transform 位置
- `worldToScreen(worldPos)` — 世界坐标转屏幕坐标
- `screenToWorld(screenPos)` — 屏幕坐标转世界坐标

#### Scenario: Camera follows player smoothly
- **WHEN** 摄像机目标为玩家实体，玩家移动到 (500, 300)
- **THEN** 摄像机位置平滑趋近 (500, 300)，玩家保持在画面中心附近

#### Scenario: World to screen conversion
- **WHEN** 摄像机在 (100, 100)，视口 800×600，查询世界坐标 (100, 100) 的屏幕坐标
- **THEN** 返回 (400, 300)（画面中心）

### Requirement: TilemapRenderer for tile-based maps
系统 SHALL 提供 `TilemapRenderer`，基于瓦片数据在 Canvas 上渲染地图（Unity: `Tilemap` + `TilemapRenderer`）。
TilemapRenderer SHALL：
- 接受瓦片地图数据（JSON 格式，定义见 design.md D8）
- 按 `tileSize` 逐格绘制，使用 `tileTypes` 中定义的颜色
- 支持多图层渲染（ground 层 + walls 层）
- 只渲染摄像机视口内可见的瓦片（视锥裁剪）
- 提供 `getTileAt(worldX, worldY)` 查询指定坐标的瓦片类型
- 提供 `isWalkable(worldX, worldY)` 查询指定位置是否可行走

#### Scenario: Render visible tiles only
- **WHEN** 地图为 30×30 瓦片，摄像机只看到其中 10×10 区域
- **THEN** 只绘制这 10×10 = 100 个瓦片，非可见瓦片不参与绘制

#### Scenario: Wall tile blocks movement
- **WHEN** 查询一个 `tileType` 为 `wall`（walkable=false）的坐标
- **THEN** `isWalkable()` 返回 `false`
