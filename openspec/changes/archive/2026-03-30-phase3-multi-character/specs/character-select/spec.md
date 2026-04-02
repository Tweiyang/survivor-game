## ADDED Requirements

### Requirement: CharacterSelectScene displays character choices
系统 SHALL 提供 `CharacterSelectScene`（Unity: 独立 Scene），在进入战斗前展示所有可选角色。
CharacterSelectScene SHALL：
- 从 `characters.json` 加载所有角色数据
- 横向排列展示角色卡片（每张卡片包含：图标、名称、描述、属性条、主动技能信息）
- 支持点击选中角色（高亮边框）
- 提供"开始战斗"确认按钮
- 选中后将 `characterId` 存入 `SceneManager.sceneData`，然后 loadScene('battle')
CharacterSelectScene SHALL 使用 Canvas 2D 绘制（Unity 迁移为 Canvas UI）。

#### Scenario: Display all characters
- **WHEN** 进入选角场景
- **THEN** 显示 3 个角色卡片，每张包含名称、图标、属性、主动技能描述

#### Scenario: Select character
- **WHEN** 玩家点击"游侠-脉冲"卡片
- **THEN** 该卡片高亮，其他卡片恢复默认样式

#### Scenario: Confirm and start battle
- **WHEN** 玩家选中角色后点击"开始战斗"按钮
- **THEN** `sceneManager.sceneData.characterId` 设置为选中的角色 ID，加载 'battle' 场景

### Requirement: Character card displays stats comparison
每张角色卡片 SHALL 以可视化方式展示关键属性：
- **HP** — 生命值条（红色）
- **ATK** — 攻击力条（橙色）
- **SPD** — 移速条（绿色）
- **DEF** — 防御条（蓝色）
属性条 SHALL 按所有角色的最大值归一化，使玩家能直观对比角色差异。
卡片底部 SHALL 显示主动技能名称和简述。

#### Scenario: Stats bar normalization
- **WHEN** 角色 A maxHp=150，角色 B maxHp=100，角色 C maxHp=120
- **THEN** A 的 HP 条满格，B 的 HP 条为 67%，C 的 HP 条为 80%

### Requirement: Default selection on scene load
CharacterSelectScene SHALL 在加载时默认选中第一个角色。
玩家可以切换选择，也可以直接确认默认角色进入战斗。

#### Scenario: Default selection
- **WHEN** 选角场景首次加载
- **THEN** 第一个角色卡片已高亮选中

### Requirement: Scene flow starts from character select
`main.js` SHALL 将初始场景从 `'battle'` 改为 `'character-select'`。
游戏启动流程 SHALL 为：main.js → CharacterSelectScene → BattleScene。

#### Scenario: Game startup flow
- **WHEN** 游戏启动
- **THEN** 先进入选角场景，选角后才进入战斗场景
