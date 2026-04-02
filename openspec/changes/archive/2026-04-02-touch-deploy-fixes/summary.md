# 触屏适配 & 部署修复 & 物理防卡墙

**日期**: 2026-04-02
**类型**: 功能增强 + Bug 修复

## Unity 兼容性 ✅

**所有改动均不影响 Unity 侧转化**：
- 事件监听方式（JS `click/touchend`）→ Unity 用自己的 EventSystem
- CSS 触屏属性 → Unity 不使用
- 服务端经验公式 → Unity 有独立后端
- 物理碰撞检查 → Unity 用 Physics2D
- 核心架构（ECS、数据格式、组件模式）未变动

## 修复清单

### 1. 触屏适配（7 文件）
- **新增** `src/utils/addClickOrTouch.js` — 统一处理 `click + touchend`，防重复触发
- **修改** CharacterSelectScene、LobbyScene、BattleScene、SkillSelectUI、GameOverUI、LevelCompleteUI、KeybindSettingsUI
- **修改** `index.html` — 添加 `touch-action: none` 等 CSS 属性

### 2. GitHub Pages 部署修复
- **新增** `.nojekyll` — 禁用 Jekyll 构建，防止 JS 文件 404
- **修复** `SkillSelectUI.js` — 删除引用不存在的 `SkillDatabase.js` 的 import
- **更新** `DEPLOY.md` — 补充 `.nojekyll`、Custom domain 说明、白屏排查、触屏 FAQ

### 3. 物理系统防卡墙
- **修改** `PhysicsSystem.js` — 新增 `setTilemapData()` + `_canPushTo()` 方法
- 碰撞推开前检查目标位置是否在墙壁内，防止怪物将玩家推入墙壁

## 受影响文件

| 文件 | 变更类型 |
|------|---------|
| `src/utils/addClickOrTouch.js` | 新增 |
| `src/scenes/CharacterSelectScene.js` | 修改 |
| `src/scenes/LobbyScene.js` | 修改 |
| `src/scenes/BattleScene.js` | 修改 |
| `src/ui/SkillSelectUI.js` | 修改 |
| `src/ui/GameOverUI.js` | 修改 |
| `src/ui/LevelCompleteUI.js` | 修改 |
| `src/ui/KeybindSettingsUI.js` | 修改 |
| `src/systems/PhysicsSystem.js` | 修改 |
| `index.html` | 修改 |
| `.nojekyll` | 新增 |
| `DEPLOY.md` | 修改 |
