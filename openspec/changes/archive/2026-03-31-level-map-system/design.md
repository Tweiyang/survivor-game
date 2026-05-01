## Context

当前 `TilemapData` 通过 `_generateDefaultGround()` / `_generateDefaultWalls()` 硬编码生成 30×30 矩形竞技场。`BattleScene._updateSpawner()` 每 3 秒在玩家 300-500px 范围内随机刷怪。

需要改为数据驱动的关卡系统：JSON 配置定义地图结构和刷怪点，运行时按配置构建。

Unity 映射：本次改造对应 Unity 中 **Tilemap + SceneManager + Wave/SpawnManager**。

## Goals / Non-Goals

**Goals:**
- 手工配置关卡数据（房间布局、走廊连接、刷怪点、Boss）
- 玩家从起点出发线性推进到 Boss 房间
- 怪物在关卡加载时就存在于固定位置（自由探索）
- Boss 门需要击杀足够数量的怪物才能开启
- 击败 Boss 后显示通关画面
- 支持可选岔路小房间（有额外怪物/奖励）
- 提供 2 个示例关卡

**Non-Goals:**
- ❌ 随机地图生成（未来可加）
- ❌ 地图编辑器（未来 Unity 编辑器代替）
- ❌ 多层地形叠加（仅地面+墙壁两层）
- ❌ 关卡选择界面（直接进入第一关，后续扩展）

## Decisions

### D1: 关卡配置数据结构
**选择**：单一 `levels.json` 文件，包含所有关卡的数组。每个关卡由 `rooms` 数组定义，每个房间有独立的瓦片数据和刷怪点。

```json
{
  "levels": [
    {
      "id": "level_1",
      "name": "迷雾走廊",
      "killsToOpenBoss": 8,
      "rooms": [
        {
          "id": "start",
          "type": "start",
          "offsetX": 0, "offsetY": 0,
          "width": 12, "height": 10,
          "groundData": [...],
          "wallData": [...],
          "spawns": [],
          "playerSpawn": { "gridX": 5, "gridY": 5 }
        },
        {
          "id": "corridor_1",
          "type": "corridor",
          "offsetX": 12, "offsetY": 3,
          "width": 6, "height": 4,
          ...
        },
        {
          "id": "boss_room",
          "type": "boss",
          "gate": { "gridX": 0, "gridY": 3, "width": 1, "height": 2 },
          "spawns": [{ "gridX": 8, "gridY": 5, "monsterType": "boss_slime", "isBoss": true }]
        }
      ]
    }
  ]
}
```

**备选**：每关独立文件（`level_1.json`, `level_2.json`）。
**理由**：前期关卡少，单文件更简洁。大量关卡时再拆分。

Unity 映射：`levels.json` → Unity Tilemap Scene 或 Addressable Tilemap Assets。

### D2: 房间拼接策略
**选择**：每个房间有 `offsetX/offsetY`（网格坐标），表示在总地图中的偏移。`TilemapData` 计算所有房间的 bounding box 生成总地图尺寸，然后将每个房间的瓦片数据写入对应位置。

走廊通过自身的 room 数据定义（type: "corridor"），连接两个房间。

**理由**：简单直观，手工配置时只需关心每个房间的 offset 和尺寸。

### D3: Boss 门机制
**选择**：Boss 房间配置 `gate` 属性（门的网格位置 + 尺寸）。门初始为墙壁（不可通过），当击杀数 ≥ `killsToOpenBoss` 时将门的瓦片改为可行走地面，同时播放视觉提示。

**理由**：复用现有墙壁/地面系统，不需要新增碰撞类型。

Unity 映射：门 → `Tilemap.SetTile()` 动态修改。

### D4: 怪物固定刷怪
**选择**：每个房间的 `spawns` 数组定义刷怪点。关卡加载时，`LevelManager` 遍历所有 spawns，通过 `MonsterFactory.create()` 在指定网格位置创建怪物。怪物不会重生。

```json
"spawns": [
  { "gridX": 5, "gridY": 3, "monsterType": "slime" },
  { "gridX": 7, "gridY": 3, "monsterType": "bat" },
  { "gridX": 8, "gridY": 5, "monsterType": "boss_slime", "isBoss": true }
]
```

**理由**：自由探索模式下怪物预先存在最符合用户需求。

### D5: 通关流程
```
关卡加载 → 构建地图 + 放置所有怪物 + Boss 门关闭
  ↓
玩家自由探索击杀
  ↓
击杀数 ≥ killsToOpenBoss → Boss 门打开 → HUD 提示
  ↓
进入 Boss 房间 → 击败 Boss
  ↓
触发通关事件 → 显示通关 UI → 可进入下一关或返回选角
```

## Risks / Trade-offs

- **[Risk] 手工配置地图工作量** → 先做 2 关验证流程，后续可加编辑器或程序生成
- **[Risk] 大地图性能** → 视锥裁剪已有，仅渲染可见瓦片，问题不大
- **[Trade-off] 怪物不重生** → 简化管理但可能导致经验不足，可在岔路房间放额外怪物补偿
- **[Trade-off] Boss 门用墙壁替换实现** → 简单但视觉效果有限，后续可升级为动画门
