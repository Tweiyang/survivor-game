## 1. 音频核心系统

- [x] 1.1 创建 `src/systems/AudioManager.js` — 实现 AudioManager 单例，含 init/resume/playSFX/playBGM/stopBGM/setXxxVolume 接口，内部持有 WebAudioBackend 引用。验证：import 后可调用 AudioManager.playSFX() 不报错
- [x] 1.2 实现 `WebAudioBackend` — 在 AudioManager.js 内实现，含 AudioContext 懒初始化、三级 GainNode 链路(master→sfx/bgm)、OscillatorNode 合成播放、maxConcurrent=8 限制。验证：调用 synthPlay 能听到声音
- [x] 1.3 实现音量持久化 — masterVolume/sfxVolume/bgmVolume 存储到 localStorage，init 时恢复。验证：刷新页面后音量保持不变

## 2. 音效配置

- [x] 2.1 创建 `assets/data/sounds.json` — 定义全部 SFX 条目（player_shoot/player_hit/enemy_hit/enemy_kill/boss_kill/exp_pickup/level_up/gate_open/level_complete/skill_select/active_skill）和 BGM 条目（bgm_title/bgm_battle）。验证：JSON 格式有效，所有 ID 均有对应配置
- [x] 2.2 实现 SoundBank 加载 — AudioManager.init() 中 fetch sounds.json 并解析，注册到内部 Map。验证：init 后可通过 ID 查到音效定义

## 3. BGM 系统

- [x] 3.1 创建 `src/systems/BGMController.js` — 实现音序器模式 BGM 播放，含 play/stop/pause/resume/crossfade 方法。验证：调用 play('bgm_battle') 能听到循环旋律
- [x] 3.2 实现 crossfade 过渡 — 旧 BGM 淡出 + 新 BGM 淡入同时进行。验证：切换 BGM 时无突兀中断
- [x] 3.3 实现暂停联动 — 游戏暂停时 BGM 暂停，恢复时继续。验证：按 ESC 暂停后音乐停止，恢复后继续播放

## 4. 音效触发集成

- [x] 4.1 在 `BattleScene.init()` 中初始化 AudioManager，注册 onSFX 事件监听并调用 playSFX。验证：EventSystem 中发射 onSFX 事件能自动播放对应音效
- [x] 4.2 在 `ProjectileComponent` 中发射子弹时触发 player_shoot 音效。验证：玩家射击时能听到射击音
- [x] 4.3 在 `HealthComponent.takeDamage` 中触发受击音效（player_hit/enemy_hit）。验证：角色受击时有受击音
- [x] 4.4 在 `HealthComponent.die` 中触发击杀音效（enemy_kill/boss_kill）。验证：击杀怪物和 Boss 有不同音效
- [x] 4.5 在 `ExperienceSystem` 中触发 exp_pickup 和 level_up 音效。验证：捡经验球和升级有反馈音
- [x] 4.6 在 `LevelManager` 事件中触发 gate_open 和 level_complete 音效。验证：Boss 门开启和通关有提示音
- [x] 4.7 在 `ActiveSkillComponent.activate()` 中触发 active_skill 音效。验证：释放主动技能有音效

## 5. BGM 场景管理

- [x] 5.1 在 `CharacterSelectScene` 中播放 bgm_title。验证：角色选择界面有标题音乐
- [x] 5.2 在 `BattleScene` 中交叉淡入 bgm_battle。验证：进入战斗后标题音乐淡出、战斗音乐淡入
- [x] 5.3 在玩家死亡/通关时停止 BGM（淡出）。验证：死亡或通关后音乐逐渐消失

## 6. 音量控制 UI

- [x] 6.1 在暂停菜单中绘制音量控制面板（3 个 Canvas 手绘滑块：主音量/音效/音乐）。验证：暂停时看到三个音量条
- [x] 6.2 实现滑块交互（鼠标点击/拖动调整音量）。验证：拖动滑块实时改变音效/音乐音量
- [x] 6.3 AudioContext resume 触发点 — 在角色选择按钮点击时调用 audioManager.resume()。验证：首次点击后音频正常工作，无自动播放限制问题

## 7. 收尾

- [x] 7.1 更新 `rules.md` 第 3 节，新增音频系统规范（AudioManager API、音效 ID 列表、Unity 映射表）。验证：rules.md 中有完整的音频系统文档
- [x] 7.2 更新 `main.js` — AudioManager 全局初始化，传入 systems。验证：游戏启动时 AudioManager 自动初始化
