## Why

游戏当前完全没有音频反馈——没有射击音效、受击反馈、Boss 战音乐或背景 BGM。音频是提升游戏体验的关键要素，需要建立一个**抽象音频层**，在 JS 端通过 Web Audio API 实现基础功能，同时保证架构能无缝迁移到 Unity 的 AudioSource/AudioClip 体系。该变更属于 **P5 阶段**。

## What Changes

- 新增 `AudioManager` 单例系统，提供统一的音频播放 API（play/stop/volume/loop）
- 新增 `SoundBank` 数据驱动配置（`sounds.json`），将音效 ID 映射到音频资源路径
- 当前阶段使用 Web Audio API + OscillatorNode **程序化合成**替代真实音频文件（无需额外资源），产出射击、受击、爆炸、拾取、Boss 战等音效
- 新增 `BGMController` 管理背景音乐的播放、切换和淡入淡出
- 在战斗场景关键节点（射击、受击、击杀、Boss 门开启、关卡通关等）接入音效触发
- 在 HUD 或暂停菜单中增加音量控制（主音量 / 音效 / 音乐）

## Capabilities

### New Capabilities
- `audio-manager`: 音频系统核心——AudioManager 单例、SoundBank 配置、Web Audio API 后端、程序化合成音效生成
- `bgm-controller`: 背景音乐管理——BGM 播放/暂停/切换、场景间淡入淡出过渡
- `audio-integration`: 音效触发集成——在现有系统（射击、战斗、UI）中接入音效调用

### Modified Capabilities
- `combat`: 新增战斗音效触发点（受击、击杀、Boss 死亡）
- `hud`: 新增音量控制 UI（主音量/音效/音乐滑块）

## Impact

- **新增文件**: `src/systems/AudioManager.js`, `src/systems/BGMController.js`, `src/systems/SynthSoundBank.js`, `assets/data/sounds.json`
- **修改文件**: `BattleScene.js`（接入音效触发）, `ProjectileComponent.js`（射击音效）, `CombatSystem.js`（受击/击杀音效）, `HUD.js`（音量控制）, `LevelManager.js`（Boss 门/通关音效）, `main.js`（AudioManager 初始化）
- **依赖**: Web Audio API（现代浏览器内置，无需外部库）
- **迁移注意**: AudioManager 的 API 设计对标 Unity AudioSource，接口层后续只需替换后端实现
