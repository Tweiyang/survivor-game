## ADDED Requirements

### Requirement: HUD displays active skill cooldown
HUD SHALL 在屏幕底部中央显示主动技能图标和冷却状态（Unity: UI Image + Cooldown Overlay）。
主动技能区 SHALL 显示：
- 技能图标（文字 emoji）
- 冷却遮罩（灰色半透明覆盖，从上到下按 cooldownPercent 缩减）
- 冷却剩余秒数（冷却中显示整数秒数）
- 就绪状态时边框高亮（金色边框 + "SPACE" 提示文字）
HUD SHALL 每帧从 ActiveSkillComponent 读取冷却状态。

#### Scenario: Skill ready display
- **WHEN** 主动技能冷却完成（cooldownTimer <= 0）
- **THEN** 图标全亮，金色边框，显示 "SPACE" 提示

#### Scenario: Skill on cooldown display
- **WHEN** 主动技能 cooldownPercent = 0.6（剩余 60% 冷却）
- **THEN** 图标上 60% 被灰色遮罩覆盖，显示剩余秒数

#### Scenario: No active skill
- **WHEN** 角色没有 ActiveSkillComponent（理论上不会发生）
- **THEN** 不显示主动技能区域
