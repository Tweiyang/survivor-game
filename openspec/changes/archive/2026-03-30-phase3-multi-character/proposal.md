## Why

当前游戏只有一个固定角色，所有玩家的基础属性、初始武器和外观完全相同，缺乏重玩价值和策略选择深度。按照 rules.md 3.4 节的规划，P3 需要实现多角色系统——让玩家在进入战斗前选择角色，不同角色拥有差异化的属性、初始武器和绑定主动技能，从而丰富游戏的策略层和可玩性。

**Phase**: P3

## What Changes

- 新增 `characters.json` 角色配置文件，定义 ≥3 个可选角色的基础属性、初始武器、外观和绑定主动技能
- 新增 `ActiveSkill` 主动技能系统，每个角色绑定一个独特的主动技能（按键触发，有冷却）
- 新增 `CharacterSelectScene` 选角场景，在进入战斗前让玩家选择角色
- 改造 `PlayerFactory` 支持按 `characterId` 加载不同角色配置
- 改造 `BattleScene` 接收选角结果并初始化对应角色
- 改造 `HUD` 显示主动技能图标和冷却状态
- 改造 `InputManager` 支持主动技能按键绑定（空格键/J 键）

## Capabilities

### New Capabilities
- `character-system`: 角色数据模型、角色工厂改造、characters.json 配置——覆盖角色差异化属性和初始武器
- `active-skill`: 主动技能框架——ActiveSkill 基类、策略模式实现角色绑定技能、冷却管理
- `character-select`: 选角场景——CharacterSelectScene UI、角色预览、选角结果传递

### Modified Capabilities
- `combat`: CombatComponent 需支持从角色配置加载不同基础属性
- `scene-management`: SceneManager 需支持场景间数据传递（选角结果 → 战斗场景）
- `skill-ui`: HUD 新增主动技能冷却显示区域

## Impact

- **配置文件**: 新增 `assets/data/characters.json`
- **场景流程**: 启动 → CharacterSelectScene → BattleScene（当前是直接进 BattleScene）
- **输入系统**: 新增主动技能按键映射（空格键/J 键）
- **工厂改造**: PlayerFactory 从单一配置改为按 characterId 分发
- **UI 改造**: HUD 底部新增主动技能区域（图标 + 冷却遮罩）
