## Purpose
背景音乐管理模块，负责 BGM 的播放、暂停、切换和场景间淡入淡出过渡。

## Requirements

### Requirement: BGMController plays looping background music
系统 SHALL 提供 `BGMController` 类管理背景音乐播放（Unity: AudioSource with loop=true）。
BGMController SHALL 支持：
- `play(bgmId)` — 开始播放指定 BGM，自动循环
- `stop(fadeOutDuration?)` — 停止播放，可选淡出（默认 0.5 秒）
- `pause()` / `resume()` — 暂停/恢复 BGM
- `isPlaying` — 当前是否在播放

BGMController SHALL 使用音序器模式，根据 sounds.json 中的 `bgm` 配置，按 BPM 和 notes 序列循环生成音符。

#### Scenario: Start battle BGM
- **WHEN** 调用 `bgmController.play('bgm_battle')`
- **THEN** 按配置的 BPM 和音符序列开始循环播放背景音乐

#### Scenario: Stop with fadeout
- **WHEN** 调用 `bgmController.stop(1.0)`
- **THEN** BGM 在 1 秒内线性淡出到静音后停止

### Requirement: BGMController supports crossfade between tracks
BGMController SHALL 提供 `crossfade(newBgmId, duration)` 方法。
当从一首 BGM 切换到另一首时：
- 当前 BGM SHALL 在 `duration` 时间内淡出
- 新 BGM SHALL 同时淡入
- 过渡完成后旧 BGM 资源 SHALL 被释放

#### Scenario: Crossfade from title to battle
- **WHEN** 从角色选择进入战斗场景
- **THEN** 标题 BGM 淡出、战斗 BGM 淡入，过渡时长约 1 秒

### Requirement: BGMController pauses with game
BGMController SHALL 在游戏暂停时自动暂停 BGM。
BGMController SHALL 在游戏恢复时自动恢复 BGM。

#### Scenario: Pause menu opens
- **WHEN** 玩家按 ESC 暂停游戏
- **THEN** BGM 暂停播放，恢复后继续从暂停位置播放
