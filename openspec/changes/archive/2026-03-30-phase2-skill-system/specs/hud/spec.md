## MODIFIED Requirements

### Requirement: HUD displays player status
系统 SHALL 提供 `HUD` 类，在 Canvas 上绘制玩家状态信息。
HUD SHALL 渲染以下元素：
- **血条**：红色/暗红色进度条，显示 currentHp/maxHp，位于画面左上角
- **经验条**：蓝色/暗蓝色进度条，显示 currentExp/expToNextLevel，血条下方
- **等级显示**：当前等级数字 "Lv.N"
- **击杀计数**：已击杀怪物数量 "Kills: N"
- **武器槽位**（新增）：屏幕左下角显示 4 个武器格子，已装备的显示图标+等级，空槽显示灰色边框
- **被动技能列表**（新增）：武器槽右侧显示已获得的被动技能小图标+等级
HUD SHALL 每帧从 HealthComponent、ExperienceSystem 和 SkillComponent 读取数据。
HUD SHALL 绘制在所有游戏内容之上（GameLoop 渲染阶段最后绘制）。

#### Scenario: HP bar updates
- **WHEN** 玩家受到伤害，HP 从 100 降到 70
- **THEN** 血条显示 70%，数字显示 "70/100"

#### Scenario: Level up display
- **WHEN** 玩家升级到 Lv.3
- **THEN** 等级显示更新为 "Lv.3"

#### Scenario: Weapon slots display
- **WHEN** 玩家持有手枪 Lv.1 和机关枪 Lv.2
- **THEN** 左下角 4 格中前 2 格显示对应图标和等级，后 2 格为空槽

#### Scenario: Passive icons display
- **WHEN** 玩家获得"超频芯片" Lv.2
- **THEN** 被动技能区显示 ⚡ 图标和 "Lv.2" 文字
