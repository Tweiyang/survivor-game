# Hotfix：运行时稳定性修复归档

**日期**: 2026-04-09  
**类型**: Hotfix（稳定性与可用性）  
**范围**: 单人/多人模式切换、战斗伤害链路、Boss 门开启、启动脚本兼容性

---

## 本次归档内容

### 1) 第三关 Boss 门“提示已开但通路仍被堵”
- **症状**: 控制台打印 `Boss gate opened!`，但玩家仍被门口地形阻挡。
- **修复**: `BattleScene._openBossGate()` 在打开门本体后，额外清理门周围一圈 `wall` 层残留阻挡。
- **文件**: `src/scenes/BattleScene.js`

### 2) 选技能后偶发报错，命中不再掉血
- **症状**: 升级选择技能（武器/被动均可能）后，后续命中敌人不扣血。
- **修复**:
  - `CombatSystem.dealDamage()` 增加 `attacker/target` 空引用保护，避免异常中断伤害流程。
  - `ProjectileComponent` 命中时使用 `owner || projectileEntity` 兜底作为攻击者，避免 owner 缺失导致结算中断。
- **文件**: `src/systems/CombatSystem.js`, `src/components/ProjectileComponent.js`

### 3) 单人模式出现联机房间请求刷屏报错
- **症状**: 单人游玩期间持续出现 `GET /matchmake/battle ... ERR_CONNECTION_REFUSED`。
- **根因**: 大厅房间列表请求失败后未彻底阻断轮询与在线状态，导致继续请求 2567 端口。
- **修复**:
  - `NetworkManager.isOnline` 判定收紧为 `online + connected + room存在`。
  - `getAvailableRooms()` 失败时自动回退离线模式，避免在线残留。
  - `LobbyScene` 仅在在线模式下执行自动刷新；回主菜单/离开房间/返回选角/进入单人时统一停止刷新。
  - 修复 `LobbyScene.destroy()` 点击监听清理条件，确保场景销毁时监听器被正确移除。
- **文件**: `src/systems/NetworkManager.js`, `src/scenes/LobbyScene.js`

### 4) 网络告警误导（单机也提示 meta 缺失）
- **症状**: 单机流程中也出现 `No game-server meta tag found`，容易误判为致命故障。
- **修复**: 仅在实际尝试联机连接时打印该提示。
- **文件**: `src/systems/NetworkManager.js`

### 5) Windows 启动脚本跨设备不可用（编码/代码页问题）
- **症状**: 双击 `start-game.bat` 后出现 `'M'`、`'hon'`、`'ttp.server'` 等命令碎片错误。
- **根因**: 批处理在不同设备代码页下解析异常，命令被错误拆分。
- **修复**:
  - `start-game.bat` 重写为 ASCII 安全版本，加入 `cd /d "%~dp0"` 路径稳健处理，并按 `py/python3/python/npx` 依次回退。
  - `start-server.bat` 同步做稳健化处理。
- **文件**: `start-game.bat`, `start-server.bat`

---

## 影响与结论

- 单人模式下不会再因联机房间轮询导致控制台持续刷 `ERR_CONNECTION_REFUSED`。
- 即使联机请求失败，也会自动回退离线，不应再污染单机伤害流程。
- 选技能后的命中伤害链路具备空引用防护，不再因偶发实体引用缺失导致“打中不掉血”。
- 本地双击启动脚本在不同 Windows 设备上兼容性显著提升。
