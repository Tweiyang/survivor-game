# 多人模式热修复合集

**日期**: 2026-04-02
**类型**: Bug 修复（联网模式稳定性）

## 修复清单

### 1. 双份实体（LobbyScene 事件泄漏）
- **文件**: `LobbyScene.js`, `StateSynchronizer.js`
- **根因**: `init()` 用匿名函数注册 EventSystem 监听，`destroy()` 的 `off` 引用不匹配导致静默失败；NetworkManager 消息回调也从未清理
- **修复**: 预绑定回调引用 + `destroy()` 中清理 `offMessage` + `_startBattle()` 防重入

### 2. 本地伤害越权（投射物 + LevelManager）
- **文件**: `ProjectileComponent.js`, `LevelManager.js`
- **根因**: 联网模式下客户端 `ProjectileComponent` 仍在本地做碰撞伤害，导致客户端杀了 Boss 但服务端不知道
- **修复**: 联网模式下 `_checkHit()` 只做视觉碰撞（销毁子弹），不造成伤害；`LevelManager` 联网模式跳过本地 `onDeath` 监听

### 3. 受击效果 + 血条同步
- **文件**: `StateSynchronizer.js`
- **根因**: `healthComp.hp` 应为 `healthComp.currentHp`；`maxHp` 未同步导致血条比例异常；受击闪烁依赖本地 `takeDamage` 未触发
- **修复**: 属性名修正 + 每次 HP 变化同步 `maxHp` + `_onDamageEvent` 中调用 `_startFlash()`

### 4. 经验系统对齐
- **文件**: `ServerCombat.ts`
- **根因**: ① 双重经验（`_awardExp` + 经验球拾取）② 升级公式用错字段名（`baseExp=30` vs 配置的 `baseExpToLevel=50`）③ 经验球 value 过高
- **修复**: 移除 `_awardExp` 调用，只保留经验球拾取；升级公式读 `formulas.json`；经验球每球 5 exp

### 5. HUD 数据同步
- **文件**: `BattleScene.js`
- **根因**: 联网模式下 `ExperienceSystem` 和 `LevelManager` 的本地数据未被服务端状态更新
- **修复**: 监听 `player.exp/level/kills` + `levelState.totalKills` 桥接到本地系统；联网模式禁用本地 `onPickup` 监听

### 6. 自动化测试框架
- **文件**: `server/src/tests/GameFlowTest.ts`
- **新增**: 9 组 35 个断言的服务端集成测试，覆盖怪物生成、Boss 门、关卡切换、通关流程、玩家死亡、多人计数、难度缩放
- **用法**: `cd server && npm test`

## 受影响文件

| 文件 | 变更类型 |
|------|---------|
| `src/scenes/LobbyScene.js` | 修改 |
| `src/scenes/BattleScene.js` | 修改 |
| `src/systems/StateSynchronizer.js` | 修改 |
| `src/systems/LevelManager.js` | 修改 |
| `src/components/ProjectileComponent.js` | 修改 |
| `server/src/systems/ServerCombat.ts` | 修改 |
| `server/src/tests/GameFlowTest.ts` | 新增 |
| `server/package.json` | 修改（添加 test 脚本）|
