## Context

当前游戏完全无音频输出。rules.md 已预留 `AudioSource → AudioManager` 的 Unity 映射概念，但尚未实现。
游戏使用纯 JS + Canvas 2D 架构，无外部依赖。当前阶段不引入真实音频文件，而是利用 Web Audio API 的 **OscillatorNode + GainNode** 程序化合成 8-bit 风格音效，契合简笔画像素风格。

## Goals / Non-Goals

**Goals:**
- 建立与 Unity AudioSource/AudioClip 对标的抽象音频接口
- 通过程序化合成提供即时可用的游戏音效（射击、受击、击杀、拾取、Boss 战、通关等）
- 提供 BGM 系统，支持循环播放和场景间淡入淡出
- 提供音量控制 UI（主音量 / 音效 / 音乐三通道）
- 数据驱动：音效配置全部通过 `sounds.json` 管理

**Non-Goals:**
- 不引入真实 .mp3/.ogg 音频文件（后续 Unity 阶段再接入）
- 不实现 3D 空间音效（当前为 2D 俯视角，无需空间化）
- 不实现音频流式加载（合成音效无需网络加载）

## Decisions

### D1: 抽象层架构 — AudioManager 单例 + Backend 策略模式

**选择:** `AudioManager` 作为全局单例对外暴露 API，内部持有一个 `AudioBackend` 接口引用。当前实现 `WebAudioBackend`，迁移 Unity 时只需替换为 `UnityAudioBackend`。

```
AudioManager (单例, 对外 API)
  ├── WebAudioBackend (当前: Web Audio API)     // Unity: UnityAudioBackend
  ├── SoundBank (音效注册表, JSON 驱动)          // Unity: AudioClip 资源引用
  └── BGMController (BGM 播放控制)              // Unity: AudioSource (loop)
```

**Unity 映射:**
| JS 概念 | Unity 概念 |
|---|---|
| `AudioManager.playSFX(id)` | `AudioSource.PlayOneShot(clip)` |
| `AudioManager.playBGM(id)` | `AudioSource.Play()` (loop) |
| `WebAudioBackend` | Unity 原生 Audio System |
| `SoundBank` 条目 | `AudioClip` ScriptableObject |
| `BGMController.crossfade()` | AudioMixer Snapshot 过渡 |

**替代方案:** 不使用策略模式，直接在 AudioManager 中硬编码 Web Audio 调用。
**否决原因:** 迁移 Unity 时需大量重写，违反双轨开发策略。

### D2: 音效生成 — OscillatorNode 程序化合成

**选择:** 使用 Web Audio API 的 `OscillatorNode` + `GainNode` + `BiquadFilterNode` 组合，生成 8-bit 风格的合成音效。每种音效由一组参数描述（波形、频率曲线、持续时间、增益包络）。

**音效参数结构 (sounds.json):**
```json
{
  "sfx": {
    "player_shoot": {
      "type": "synth",
      "wave": "square",
      "freq": [800, 200],
      "duration": 0.1,
      "gain": 0.3
    }
  },
  "bgm": {
    "battle": {
      "type": "synth_loop",
      "bpm": 120,
      "pattern": [...]
    }
  }
}
```

**替代方案:** 使用预录制的 Base64 内嵌音频。
**否决原因:** 增大代码体积，且无法灵活调参；合成音效更适合 pixel-art 风格。

### D3: BGM 实现 — 简单音序器

**选择:** BGM 使用简单的 **音序器模式** — 定义一组音符序列 + BPM，用定时器循环播放。支持淡入/淡出切换。

**替代方案:** 仅使用持续的低频 drone 音（更简单但单调）。
**否决原因:** 音序器模式能产出有旋律感的 BGM，提升游戏氛围。

### D4: 音量控制 — 三通道独立 GainNode

**选择:** 三级 GainNode 链：`masterGain → sfxGain / bgmGain`。用户可独立调节主音量、音效音量、音乐音量。设置持久化到 localStorage。

### D5: 音效触发点

| 触发事件 | 音效 ID | 触发位置 |
|---|---|---|
| 玩家射击 | `player_shoot` | `ProjectileComponent._fire()` |
| 玩家受击 | `player_hit` | `HealthComponent.takeDamage()` (player) |
| 怪物受击 | `enemy_hit` | `HealthComponent.takeDamage()` (enemy) |
| 怪物击杀 | `enemy_kill` | `HealthComponent.die()` (enemy) |
| Boss 击杀 | `boss_kill` | `HealthComponent.die()` (boss) |
| 经验拾取 | `exp_pickup` | `ExperienceSystem._checkPickup()` |
| 升级 | `level_up` | `ExperienceSystem._levelUp()` |
| Boss 门开启 | `gate_open` | `LevelManager` onBossGateOpen |
| 关卡通关 | `level_complete` | `LevelManager` onLevelComplete |
| 技能选择 | `skill_select` | `SkillSelectUI` 选择确认 |
| 主动技能释放 | `active_skill` | `ActiveSkillComponent.activate()` |
| BGM: 战斗 | `bgm_battle` | `BattleScene.init()` |
| BGM: 标题 | `bgm_title` | `CharacterSelectScene` |

## Risks / Trade-offs

- **[浏览器自动播放限制]** → 首次音频播放需要用户交互触发。缓解：在角色选择按钮点击时初始化 AudioContext（`resume()`）。
- **[合成音效质量有限]** → 程序化合成无法达到专业音效品质。缓解：当前阶段可接受，Unity 阶段替换为专业音频资源。
- **[BGM 音序器复杂度]** → 完整的音序器可能过于复杂。缓解：保持简单（单音轨 + 简单旋律），不做复杂编曲。
- **[性能]** → 大量同时播放的音效可能影响性能。缓解：设置最大同时播放数（maxConcurrent=8），超出时丢弃最旧的。
