## ADDED Requirements

### Requirement: HUD displays player status
系统 SHALL 提供 `HUD` 类，在 Canvas 上绘制玩家状态信息。
HUD SHALL 渲染以下元素：
- **血条**：红色/暗红色进度条，显示 currentHp/maxHp，位于画面左上角
- **经验条**：蓝色/暗蓝色进度条，显示 currentExp/expToNextLevel，血条下方
- **等级显示**：当前等级数字 "Lv.N"
- **击杀计数**：已击杀怪物数量 "Kills: N"
- **武器槽位**：屏幕左下角显示 4 个武器格子，已装备的显示图标+等级，空槽显示灰色边框
- **被动技能列表**：武器槽右侧显示已获得的被动技能小图标+等级
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

### Requirement: Monster health bars
HUD SHALL 渲染怪物头顶小血条：
- 位于怪物 SpriteRenderer 上方 5px
- 宽度 = 怪物 sprite 宽度，高度 = 3px
- 红色/暗红色进度条
- 满血时不显示（减少视觉噪音）
- 受击后显示 3 秒，然后淡出
- 使用摄像机坐标转换定位

#### Scenario: Monster health bar shown on hit
- **WHEN** 怪物受到伤害
- **THEN** 怪物头顶显示小血条，3 秒后淡出

#### Scenario: Full health monster no bar
- **WHEN** 怪物满血
- **THEN** 不显示头顶血条

### Requirement: GameOverUI shows death screen
系统 SHALL 提供 `GameOverUI`，在玩家死亡时显示死亡界面。
GameOverUI SHALL：
- 监听 'onDeath' 事件（玩家死亡时触发）
- 显示半透明黑色遮罩覆盖全屏
- 中央显示 "GAME OVER" 文字
- 显示本局统计：存活时间、击杀数、达到等级
- 显示 "重新开始" 按钮（Canvas 绘制 + 点击检测）
- 点击按钮时调用 SceneManager.restart()
GameOverUI SHALL 在显示时暂停 GameLoop。

#### Scenario: Player dies shows game over
- **WHEN** 玩家 HP 降为 0
- **THEN** 游戏暂停，显示 Game Over 界面，包含统计和重新开始按钮

#### Scenario: Restart from game over
- **WHEN** 点击 "重新开始" 按钮
- **THEN** 场景重新加载，所有状态重置

### Requirement: HUD provides volume control UI
HUD SHALL 在暂停菜单中显示音量控制面板（Unity: UI Slider）。
音量控制面板 SHALL 包含三个滑块：
- 主音量 (Master Volume): 0~100%
- 音效 (SFX Volume): 0~100%
- 音乐 (BGM Volume): 0~100%

滑块拖动时 SHALL 实时调用 `AudioManager.setXxxVolume()` 立即生效。
音量设置 SHALL 持久化到 localStorage，下次启动自动恢复。

#### Scenario: Adjust SFX volume
- **WHEN** 玩家在暂停菜单中将音效滑块拖至 50%
- **THEN** AudioManager.setSFXVolume(0.5) 被调用，后续所有音效以 50% 音量播放

#### Scenario: Volume persisted
- **WHEN** 玩家将主音量设为 80% 并关闭/重开游戏
- **THEN** 重开后主音量滑块显示 80%
