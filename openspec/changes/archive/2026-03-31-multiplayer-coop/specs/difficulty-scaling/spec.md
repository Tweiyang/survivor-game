## Purpose
多人难度缩放系统，根据房间玩家数量动态调整怪物属性和生成数量，保持游戏挑战性平衡。

## ADDED Requirements

### Requirement: DifficultyScaler computes multiplier from player count
系统 SHALL 提供 `DifficultyScaler` 模块（Unity: ScriptableObject 难度配置）。
DifficultyScaler SHALL 从 `difficulty.json` 读取配置：
```json
{
    "scalingFormula": "linear",
    "baseMultiplier": 1.0,
    "perPlayerAdd": 0.5,
    "fields": {
        "monsterHp": true,
        "monsterCount": true,
        "monsterDamage": false,
        "bossHp": true
    }
}
```
DifficultyScaler SHALL 计算缩放倍率：`multiplier = baseMultiplier + (playerCount - 1) * perPlayerAdd`
DifficultyScaler SHALL 只对 `fields` 中值为 `true` 的属性应用倍率。

#### Scenario: 2-player difficulty
- **WHEN** 房间有 2 个玩家
- **THEN** `multiplier = 1.0 + (2-1) * 0.5 = 1.5`，怪物血量和数量 ×1.5

#### Scenario: 4-player difficulty
- **WHEN** 房间有 4 个玩家
- **THEN** `multiplier = 1.0 + (4-1) * 0.5 = 2.5`，怪物血量和数量 ×2.5

#### Scenario: Single player unchanged
- **WHEN** 房间只有 1 个玩家（或 offline 模式）
- **THEN** `multiplier = 1.0`，难度与单人模式完全一致

### Requirement: DifficultyScaler dynamically adjusts on player change
DifficultyScaler SHALL 在玩家数量变化时（加入/离开）重新计算倍率。
- 新的倍率 SHALL 立即应用于后续生成的怪物
- 已存在的怪物血量 SHALL 不受影响（只影响新生成的）

#### Scenario: Player leaves mid-game
- **WHEN** 4 人房间中 1 人断线，变为 3 人
- **THEN** 后续生成的怪物按 2.0x 缩放，已存在的怪物不变
