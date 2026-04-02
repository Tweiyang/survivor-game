## ADDED Requirements

### Requirement: characters.json defines all playable characters
系统 SHALL 从 `assets/data/characters.json`（Unity: `CharacterScriptableObject[]`）加载所有可选角色配置。
每个角色配置 SHALL 包含：
- `id` — 唯一标识（kebab-case）
- `name` — 显示名称
- `icon` — 文字图标（Canvas 绘制用）
- `description` — 角色描述
- `color` — 外观颜色（hex）
- `shape` — 外观形状（'circle' | 'square' | 'triangle'）
- `size` — 角色尺寸（像素）
- `stats` — 基础战斗属性对象（maxHp, attack, defense, critRate, critMultiplier, moveSpeed, attackSpeed, attackRange, projectileSpeed）
- `initialWeapon` — 初始武器 ID（对应 skills.json 中的武器）
- `activeSkill` — 绑定的主动技能 ID
- `activeSkillConfig` — 主动技能参数（cooldown, duration, value 等）
系统 SHALL 提供 ≥3 个可选角色。

#### Scenario: Load character data
- **WHEN** 游戏启动加载 characters.json
- **THEN** 每个角色的所有字段均可正确读取

#### Scenario: Character stat differences
- **WHEN** 比较"游侠-脉冲"和"先锋-泰坦"
- **THEN** 游侠攻速更高、血量更低；先锋血量更高、攻速更慢

### Requirement: PlayerFactory creates character by ID
`PlayerFactory.create()` SHALL 接受 `characterId` 参数（Unity: 通过 Inspector 注入 CharacterSO）。
PlayerFactory SHALL：
1. 从 `characters.json` 读取 `characterId` 对应的角色配置
2. 用角色 `stats` 初始化 CombatComponent 和 HealthComponent
3. 用角色 `color`、`shape`、`size` 配置 SpriteComponent
4. 通过 `SkillComponent.addSkill(initialWeapon)` 添加初始武器
5. 创建 `ActiveSkillComponent` 并挂载角色绑定的主动技能
6. 未传 `characterId` 时 SHALL 使用默认角色（第一个角色）

#### Scenario: Create vanguard character
- **WHEN** `PlayerFactory.create({ characterId: 'vanguard', position: {x:100, y:100} })`
- **THEN** 创建的 Entity 拥有先锋的基础属性（高 HP、高 defense），外观为蓝色方块，初始武器为散弹枪

#### Scenario: Create ranger character
- **WHEN** `PlayerFactory.create({ characterId: 'ranger', position: {x:100, y:100} })`
- **THEN** 创建的 Entity 拥有游侠的基础属性（高攻速），外观为绿色圆形，初始武器为能量手枪

#### Scenario: Default character fallback
- **WHEN** `PlayerFactory.create({ position: {x:100, y:100} })` 不传 characterId
- **THEN** 使用 characters.json 中第一个角色的配置

### Requirement: AutoAttackComponent replaced by initial weapon
P3 SHALL 移除玩家实体上的 `AutoAttackComponent`。
玩家的自动攻击 SHALL 完全由 `SkillComponent` 管理的初始武器（`WeaponSkill`）提供。
初始武器通过 `characters.json` 的 `initialWeapon` 字段配置，对应 `skills.json` 中的武器 ID。

#### Scenario: No AutoAttackComponent on player
- **WHEN** 玩家实体创建完成
- **THEN** Entity 上没有 AutoAttackComponent，自动攻击由 SkillComponent.weapons[0] 提供

#### Scenario: Initial weapon fires automatically
- **WHEN** 游侠角色创建后有敌人进入范围
- **THEN** 初始武器"能量手枪"自动开火（与 P2 的 WeaponSkill 行为一致）
