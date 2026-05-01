## Purpose
音频系统核心，提供统一的音频播放 API，管理 SoundBank 配置和 Web Audio API 后端。抽象层设计对标 Unity AudioSource / AudioClip 体系。

## Requirements

### Requirement: AudioManager provides singleton audio API
系统 SHALL 提供 `AudioManager` 单例类（Unity: AudioManager + AudioSource 管理器）。
AudioManager SHALL 在首次使用时懒初始化 `AudioContext`（需用户交互后调用 `resume()`）。
AudioManager SHALL 提供以下公共 API：
- `playSFX(soundId, options?)` — 播放一次性音效（Unity: `AudioSource.PlayOneShot`）
- `playBGM(bgmId)` — 播放/切换背景音乐（Unity: `AudioSource.Play` loop）
- `stopBGM(fadeOut?)` — 停止背景音乐（可选淡出时长）
- `setMasterVolume(v)` / `setSFXVolume(v)` / `setBGMVolume(v)` — 设置音量 0~1
- `getMasterVolume()` / `getSFXVolume()` / `getBGMVolume()` — 获取音量
- `init()` — 加载 sounds.json 并注册所有音效
- `resume()` — 恢复被浏览器暂停的 AudioContext（用户交互后调用）

#### Scenario: Play a sound effect
- **WHEN** 调用 `AudioManager.playSFX('player_shoot')`
- **THEN** 系统通过 WebAudioBackend 创建合成音效并立即播放

#### Scenario: AudioContext suspended
- **WHEN** 浏览器因自动播放限制暂停了 AudioContext
- **THEN** 调用 `resume()` 后 AudioContext 恢复到 'running' 状态

#### Scenario: Volume control persisted
- **WHEN** 用户调整 SFX 音量为 0.5 并刷新页面
- **THEN** 刷新后 getSFXVolume() 返回 0.5（从 localStorage 恢复）

### Requirement: SoundBank manages sound definitions from JSON
系统 SHALL 提供数据驱动的 `SoundBank`（Unity: ScriptableObject 音效配置表）。
SoundBank SHALL 从 `assets/data/sounds.json` 加载音效定义。
每个 SFX 条目 SHALL 包含：
- `id` — 音效唯一标识（如 `player_shoot`）
- `type` — 固定为 `"synth"`（当前阶段）
- `wave` — 波形类型：`"sine"` | `"square"` | `"sawtooth"` | `"triangle"`
- `freq` — 频率数组 `[startHz, endHz]`，表示频率滑动
- `duration` — 持续时间（秒）
- `gain` — 音量 0~1
- `filter`（可选）— 滤波器参数 `{ type, frequency, Q }`

每个 BGM 条目 SHALL 包含：
- `id` — BGM 唯一标识
- `type` — `"synth_loop"`
- `bpm` — 节拍速度
- `tracks` — 音轨数组，每个音轨含 `wave` 和 `notes` 序列

#### Scenario: Load sounds.json
- **WHEN** 调用 `AudioManager.init()`
- **THEN** SoundBank 从 JSON 加载并注册所有 sfx 和 bgm 定义

#### Scenario: Unknown sound ID
- **WHEN** 调用 `playSFX('nonexistent_id')`
- **THEN** 控制台输出 `[AudioManager] Unknown sound: nonexistent_id`，不抛异常

### Requirement: WebAudioBackend synthesizes sounds from parameters
系统 SHALL 提供 `WebAudioBackend` 类实现程序化音效合成（Unity: 此层在 Unity 中被原生 AudioClip 替代）。
WebAudioBackend SHALL 支持：
- 创建 OscillatorNode 并设置波形和频率曲线
- 创建 GainNode 实现音量包络（attack → sustain → release）
- 可选 BiquadFilterNode 用于音色修饰
- 最大同时播放数限制（`maxConcurrent=8`），超出时停止最早的音效

三级 GainNode 链路：
```
OscillatorNode → filterNode(可选) → sfxGainNode → masterGainNode → destination
                                     bgmGainNode → masterGainNode → destination
```

#### Scenario: Frequency sweep effect
- **WHEN** 播放 freq=[800, 200], duration=0.1 的音效
- **THEN** 音频从 800Hz 线性滑动到 200Hz，持续 0.1 秒后自动停止

#### Scenario: Max concurrent limit
- **WHEN** 已有 8 个音效同时播放，再播放第 9 个
- **THEN** 最早的音效被停止，新音效正常播放
