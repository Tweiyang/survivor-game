# Hotfix: 运行时 Bug 修复

**日期**: 2026-03-30
**类型**: Hotfix（直接修复，未走完整 OpenSpec 流程）
**触发**: Phase 2 实现后首次运行 index.html 发现的连锁问题

---

## 修复的 Bug 列表

### Bug 1: 游戏无法启动（白屏无反应）
- **症状**: 双击 index.html 或通过 HTTP 服务器访问，页面空白无输出
- **根因**: 3 个问题叠加
  1. 浏览器原生 ES Module 不支持 `import ... from '...json'`（4 处）
  2. `SceneManager.loadScene()` 未 await async `BattleScene.init()`
  3. `sceneManager.currentScene` getter 不存在（只有 `_currentScene`）
- **修复文件**: `BattleScene.js`, `SceneManager.js`, `main.js`, `index.html`
- **新增文件**: `start-game.bat`（一键启动 HTTP 服务器）

### Bug 2: Unexpected token '*' 语法错误
- **症状**: `Uncaught SyntaxError: Unexpected token '*'`
- **根因**: JSDoc `/** */` 块内嵌套了 `/* Network: ... */`，内层 `*/` 提前关闭注释
- **修复文件**: 10 个文件的 `/* Network: ... */` → `[Network] ...`
  - `ProjectileFactory.js`, `MonsterFactory.js`, `PlayerFactory.js`
  - `ChaseAI.js`, `HealthComponent.js`, `CombatSystem.js`
  - `AutoAttackComponent.js`, `ExperienceSystem.js`, `SkillComponent.js`

### Bug 3: this.entity.components is not iterable
- **症状**: `CombatComponent.js:41 Uncaught TypeError`
- **根因**: `CombatComponent.start()` 访问 `this.entity.components`，实际属性名为 `this.entity._components`
- **修复文件**: `CombatComponent.js`

### Bug 4: 击杀怪物直接 GameOver
- **症状**: 子弹击中怪物后立即弹出 GAME OVER
- **根因**: `HealthComponent.die()` emit `onDeath` 时直接传 entity，但 `GameOverUI._onDeath()` 按 `data.entity` 解构，`data.entity` 为 undefined 导致过滤条件失效
- **修复文件**: `GameOverUI.js`, `BattleScene.js`

### Bug 5: instanceof null 报错
- **症状**: `Entity.js:78 Uncaught TypeError: Right-hand side of 'instanceof' is not an object`
- **根因**: `PhysicsSystem._resolveCollision()` 中有两行废代码 `a.getComponent(null)`，`null` 不是构造函数
- **修复文件**: `PhysicsSystem.js`

### Bug 6: 新武器不开火
- **症状**: 通过技能选择获得的新武器（机关枪、散弹枪）没有自动攻击
- **根因**: `WeaponSkill._findNearestEnemy()` 调用 `overlapCircle(pos.x, pos.y, range)` — 传了 3 个散参数，但 API 签名是 `overlapCircle({x, y}, radius)`，导致 `center.x = undefined`，距离计算全为 NaN，永远找不到目标
- **修复文件**: `WeaponSkill.js`

---

## 同步到 rules.md 的经验

| 条目 | 内容 | 适用范围 |
|------|------|----------|
| 2.5.1 | ES Module 需要 HTTP 服务器 | HTML 试验方案专属 |
| 2.5.2 | 浏览器不支持 import JSON | HTML 试验方案专属 |
| 2.5.3 | async 场景初始化必须 await | HTML 试验方案专属 |
| 2.5.4 | 私有属性需提供 getter | HTML 试验方案专属 |
| 2.5.5 | 禁止 JSDoc 块内嵌套块注释 | **JS + C# 通用** |
| 8.5 | 联网注释统一用 `[Network]` 格式 | **JS + C# 通用** |
| 8.6 | 事件数据结构一致性 | **JS + C# 通用** |
