## ADDED Requirements

### Requirement: Combat system emits audio events
CombatSystem SHALL 在造成伤害和击杀时通过 EventSystem 发射音频事件（Unity: UnityEvent 触发 AudioSource）：
- `dealDamage` 成功命中时 SHALL 发射 `onSFX` 事件，携带 `{ soundId: 'enemy_hit' }` 或 `{ soundId: 'player_hit' }`（根据目标 tag 区分）
- 目标死亡时 SHALL 根据 tag 发射 `onSFX` 事件：`tag='enemy'` → `'enemy_kill'`，`tag='boss'` → `'boss_kill'`

#### Scenario: Enemy takes damage plays hit sound
- **WHEN** CombatSystem.dealDamage 命中一个 tag='enemy' 的实体且未死亡
- **THEN** 发射 `onSFX` 事件，soundId='enemy_hit'

#### Scenario: Boss killed plays boss kill sound
- **WHEN** CombatSystem.dealDamage 导致 tag='boss' 实体死亡
- **THEN** 发射 `onSFX` 事件，soundId='boss_kill'
