## ADDED Requirements

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
