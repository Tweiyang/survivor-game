## Why

当前地图是 30×30 的开放式矩形竞技场，玩家一览全局，刷怪完全随机。缺乏闯关推进感和关卡设计空间。
需要改为线性闯关制地图：从起点出发一路推进到终点 Boss 房间，沿途有固定刷怪点和可选岔路小房间。

## What Changes

- **新增关卡配置 `levels.json`**：手工定义每关的房间列表、连接关系、怪物刷怪点、Boss 配置、通关条件
- **新增 `LevelManager`**：加载/解析关卡配置，管理房间状态、Boss 门判定、通关流程
- **改造 `TilemapData`**：支持从关卡配置加载多房间拼接的大地图（房间→走廊→房间→Boss房间）
- **改造 `BattleScene`**：从 LevelManager 获取地图和刷怪数据，替代原有随机刷怪逻辑
- **新增 Boss 刷怪点类型**：Boss 房间门需要杀够足够怪物才开启，Boss 击败后关卡完成
- **新增 2 个示例关卡配置**：第一关（教学关）、第二关（正式关）
- **同步更新 `rules.md`**：新增地图/关卡设计规范章节

## Capabilities

### New Capabilities
- `level-config`: 关卡配置数据格式（JSON），定义房间布局、连接、刷怪点、Boss
- `level-manager`: 关卡加载/管理/通关流程控制
- `boss-gate`: Boss 房间门机制（击杀计数 → 开门 → Boss 战 → 通关）

### Modified Capabilities
- `rendering`: TilemapData 支持从关卡配置构建多房间地图
- `monsters`: MonsterFactory 支持从固定刷怪点配置创建怪物（替代随机位置）

## Impact

- **assets/data/levels.json** — 新建（2 个示例关卡）
- **src/systems/LevelManager.js** — 新建（关卡管理核心）
- **src/map/TilemapData.js** — 改造（从关卡 config 构建地图）
- **src/scenes/BattleScene.js** — 改造（集成 LevelManager、替代随机刷怪）
- **src/entities/MonsterFactory.js** — 改造（支持固定点刷怪 + Boss 类型）
- **src/ui/HUD.js** — 改造（显示关卡进度、Boss 门状态）
- **rules.md** — 新增 3.5 关卡地图规范
