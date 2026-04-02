## 1. 关卡配置数据

- [x] 1.1 创建 `assets/data/levels.json` — 包含 2 个示例关卡的完整配置（房间布局、瓦片数据、刷怪点、Boss、门），第 1 关为教学关（3 个房间：起始+走廊+Boss），第 2 关为正式关（5 个房间：起始+走廊+战斗房+岔路+Boss）
- [x] 1.2 改造 `assets/data/monsters.json` — 新增 Boss 类型怪物配置（boss_slime: HP×5, attack×2, size×1.8, expValue×10）

## 2. 地图构建

- [x] 2.1 改造 `src/map/TilemapData.js` — 新增 `TilemapData.fromRooms(rooms, tileSize)` 静态工厂方法：计算 bounding box → 初始化总地图（默认全墙壁）→ 遍历房间写入瓦片 — 验证：3 个房间正确拼接
- [x] 2.2 改造 `src/map/TilemapData.js` — 新增 `setTile(gridX, gridY, layer, tileId)` 方法，支持运行时动态修改瓦片 — 验证：修改后 isWalkable 结果更新

## 3. LevelManager

- [x] 3.1 创建 `src/systems/LevelManager.js` — 实现 loadLevel(levelId)、buildTilemapData()、getPlayerSpawnWorldPos()、getAllSpawns()、getBossGateWorldRect() — 验证：加载 level_1 返回正确的玩家出生点和刷怪列表
- [x] 3.2 实现击杀计数 + Boss 门判定 — LevelManager 监听 onDeath 事件，维护 killCount，isBossGateOpen() 返回正确结果，达成条件时发射 onBossGateOpen — 验证：击杀 8 只后 isBossGateOpen() = true
- [x] 3.3 实现通关流程 — 监听 Boss 死亡（tag='boss'），发射 onLevelComplete 事件，提供 getNextLevelId() — 验证：Boss 死后触发事件

## 4. MonsterFactory 改造

- [x] 4.1 改造 `src/entities/MonsterFactory.js` — create() 支持 `isBoss: true` 参数，Boss 的 tag 设为 'boss'、尺寸放大、属性增强 — 验证：创建 boss_slime 得到 tag='boss' 的大号怪物

## 5. BattleScene 集成

- [x] 5.1 改造 `src/scenes/BattleScene.js` — 集成 LevelManager：init 时加载关卡配置 → buildTilemapData → 替换 tilemapRenderer → 从 sceneData 获取 levelId — 验证：进入战斗场景看到新地图
- [x] 5.2 改造 `src/scenes/BattleScene.js` — 替代随机刷怪：遍历 LevelManager.getAllSpawns() 创建所有怪物（含 Boss）— 验证：怪物出现在配置的固定位置
- [x] 5.3 改造 `src/scenes/BattleScene.js` — Boss 门机制：监听 onBossGateOpen 事件 → 调用 TilemapData.setTile 打开门 — 验证：击杀足够后门打开可通行
- [x] 5.4 改造 `src/scenes/BattleScene.js` — 监听 onLevelComplete → 显示通关 UI（可复用 GameOverUI 或新建）— 验证：Boss 死后显示通关画面

## 6. HUD 改造

- [x] 6.1 改造 `src/ui/HUD.js` — 新增关卡名称显示（屏幕顶部中央）— 验证：进入关卡后顶部显示关卡名
- [x] 6.2 改造 `src/ui/HUD.js` — 新增 Boss 门进度条（右上角或屏幕上方）：关闭时显示 "Boss 门: N/M"，开启时闪烁 "Boss 门已开启！" — 验证：击杀进度实时更新

## 7. 通关 UI

- [x] 7.1 创建 `src/ui/LevelCompleteUI.js` — Canvas 覆盖层显示 "关卡完成！" + 统计 + "下一关"/"返回选角" 按钮 — 验证：Boss 死后显示并可点击

## 8. Rules 更新

- [x] 8.1 更新 `rules.md` — 新增 3.5 关卡地图规范（线性+岔路房间制、JSON 配置驱动、Boss 门机制、固定刷怪点、通关流程）