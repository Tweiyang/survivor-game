## Purpose
定义音效触发集成规范——在游戏各系统的关键事件中接入 AudioManager 音效调用。

## Requirements

### Requirement: Combat events trigger sound effects
战斗系统 SHALL 在以下事件发生时触发对应音效（Unity: AudioSource.PlayOneShot on event）：
- 玩家投射物发射 → `playSFX('player_shoot')`
- 玩家受击 → `playSFX('player_hit')`
- 怪物受击 → `playSFX('enemy_hit')`
- 怪物死亡 → `playSFX('enemy_kill')`
- Boss 死亡 → `playSFX('boss_kill')`
- 主动技能释放 → `playSFX('active_skill')`

音效触发 SHALL 通过 EventSystem 事件驱动，不直接耦合到业务逻辑中。

#### Scenario: Player shoots
- **WHEN** ProjectileComponent 发射一颗子弹
- **THEN** 播放 'player_shoot' 音效

#### Scenario: Enemy killed
- **WHEN** 一个 tag='enemy' 的实体死亡
- **THEN** 播放 'enemy_kill' 音效

#### Scenario: Boss killed
- **WHEN** 一个 tag='boss' 的实体死亡
- **THEN** 播放 'boss_kill' 音效（更重的低频音效）

### Requirement: Progression events trigger sound effects
进度系统 SHALL 在以下事件发生时触发对应音效：
- 经验球拾取 → `playSFX('exp_pickup')`
- 玩家升级 → `playSFX('level_up')`
- Boss 门开启 → `playSFX('gate_open')`
- 关卡通关 → `playSFX('level_complete')`
- 技能选择确认 → `playSFX('skill_select')`

#### Scenario: Level up
- **WHEN** 玩家经验达到升级阈值
- **THEN** 播放 'level_up' 音效（上升音阶）

#### Scenario: Boss gate opens
- **WHEN** 击杀数达到 Boss 门阈值
- **THEN** 播放 'gate_open' 音效（沉重的开门声）

### Requirement: Scene transitions manage BGM
场景切换 SHALL 管理 BGM 的生命周期：
- 角色选择场景 → 播放 `bgm_title`
- 进入战斗场景 → 交叉淡入 `bgm_battle`
- 进入 Boss 房间 → 交叉淡入 `bgm_boss`（可选，若配置了）
- 通关/死亡 → 停止 BGM（淡出）

#### Scenario: Enter battle from character select
- **WHEN** 玩家选择角色并进入战斗场景
- **THEN** title BGM 淡出、battle BGM 淡入

#### Scenario: Player dies
- **WHEN** 玩家血量归零
- **THEN** battle BGM 在 1 秒内淡出停止
