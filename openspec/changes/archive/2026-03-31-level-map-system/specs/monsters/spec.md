## MODIFIED Requirements

### Requirement: MonsterFactory supports fixed spawn points
MonsterFactory.create() SHALL 新增支持 `isBoss: true` 参数。
当 `isBoss` 为 true 时：
- 怪物 tag SHALL 设为 `'boss'`（而非 `'enemy'`）
- 怪物的 HP、攻击力等属性 SHALL 从 monsters.json 中对应 Boss 配置读取
- 怪物的 SpriteRenderer 尺寸 SHALL 放大（size × 1.8）
MonsterFactory SHALL 不再需要随机位置生成逻辑（由 LevelManager 提供精确世界坐标）。

#### Scenario: Create boss monster
- **WHEN** 调用 create({ type: 'boss_slime', position: {x, y}, isBoss: true })
- **THEN** 创建一个 tag='boss' 的大号怪物实体

#### Scenario: Create normal monster at fixed position
- **WHEN** 调用 create({ type: 'slime', position: {x: 320, y: 160} })
- **THEN** 在世界坐标 (320, 160) 创建一个标准 slime 怪物
