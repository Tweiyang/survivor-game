## ADDED Requirements

### Requirement: SkillSelectUI shows level-up skill choices
系统 SHALL 提供 `SkillSelectUI` 类（Unity: Canvas UI Panel），在玩家升级时弹出技能选择界面。
SkillSelectUI SHALL：
- 监听 `onLevelUp` 事件触发显示
- 显示前调用 `GameLoop.pause()` 暂停游戏
- 展示 3 个候选技能卡片（从 SkillComponent.getAvailableSkills(3) 获取）
- 每个卡片显示：图标 + 名称 + 当前等级 + 描述 + 下一级效果
- 已有技能显示为"升级"样式，新技能显示为"NEW!"标签
- 玩家点击选择后调用 SkillComponent.addSkill()
- 选择后调用 `GameLoop.resume()` 恢复游戏
- 使用 Canvas 2D 绘制，点击检测通过坐标判定

#### Scenario: Level up shows selection
- **WHEN** 玩家升级触发 onLevelUp 事件
- **THEN** 游戏暂停，弹出 3 个技能卡片供选择

#### Scenario: Select new weapon
- **WHEN** 玩家点击一张新武器"散弹枪"的卡片
- **THEN** SkillComponent 添加散弹枪 Lv.1，界面关闭，游戏恢复

#### Scenario: Select upgrade
- **WHEN** 玩家点击已有技能"机关枪 Lv.1 → Lv.2"的卡片
- **THEN** 机关枪升级到 Lv.2，界面关闭，游戏恢复

#### Scenario: Less than 3 candidates
- **WHEN** 技能池过滤后不足 3 个候选
- **THEN** 显示实际可用数量（1~2 个），不足部分不显示

### Requirement: HUD displays skill icons
HUD SHALL 在屏幕底部/侧边显示当前拥有的技能图标（Unity: UI Image Grid）。
技能图标区 SHALL：
- 武器槽：显示 4 个格子，已装备的武器显示图标+等级，空槽显示灰色边框
- 被动列表：在武器槽旁/下方显示已获得的被动技能小图标+等级
- 每帧从 SkillComponent 读取当前技能列表
- 使用文字 emoji 作为图标（Canvas fillText）

#### Scenario: Show weapon slots
- **WHEN** 玩家持有 2 把武器（手枪 Lv.1、机关枪 Lv.2）
- **THEN** HUD 显示 4 个格子，前两个有图标和等级，后两个为空槽

#### Scenario: Show passive icons
- **WHEN** 玩家持有 3 个被动技能
- **THEN** HUD 显示 3 个被动技能小图标及其等级
