## Why

**Phase: P1 — 基础战斗**

Phase 0 已搭建完引擎核心骨架，但游戏还没有任何"游戏性"——没有攻击、没有敌人、没有伤害。Phase 1 的目标是让游戏能"玩起来"：玩家可以移动并自动攻击怪物，怪物会追踪玩家并造成伤害，击杀怪物后有掉落物。这是整个游戏体验的基石。

## What Changes

- 新建 `HealthComponent` — 生命值管理（受伤、死亡、血条显示数据）
- 新建 `CombatComponent` — 战斗属性（攻击力、防御力、暴击率、攻击速度、攻击范围等）
- 新建 `CombatSystem` — 战斗公式计算（伤害 = 攻击 × 技能倍率 × 暴击 - 防御减伤）
- 新建 `AutoAttackComponent` — 自动锁定最近敌人 + 自动发射投射物
- 新建 `ProjectileComponent` — 投射物（子弹）行为：飞行、碰撞检测、命中伤害、存活时间
- 新建 `ProjectileFactory` — 投射物实体工厂
- 新建 `MonsterAI` — 怪物 AI 基类 + `ChaseAI` 追踪型 AI（朝玩家移动并近身攻击）
- 新建 `MonsterFactory` — 怪物实体工厂（按配置生成怪物）
- 新建 `PlayerFactory` — 玩家实体工厂（从 DemoScene 中提取，支持多玩家预留）
- 新建 `DropComponent` — 掉落物行为（经验球、磁吸拾取）
- 新建 `DropItemFactory` — 掉落物实体工厂
- 新建 `ExperienceSystem` — 经验值收集与升级判定（P1 只做基础经验收集，升级奖励留给 P2）
- 新建 `HUD.js` — 玩家血条、经验条、击杀数 UI 覆盖层
- 新建 `GameOverUI.js` — 死亡界面（重新开始按钮）
- 新建配置文件 `assets/data/player.json` — 玩家基础属性
- 新建配置文件 `assets/data/monsters.json` — 怪物属性表
- 新建配置文件 `assets/data/formulas.json` — 战斗公式参数
- 重构 `DemoScene` → `BattleScene` — 从验证场景升级为战斗场景，含怪物生成逻辑
- 扩展地图为 30×30，增加更多地形变化

## Capabilities

### New Capabilities
- `combat`: 战斗系统——伤害计算、自动攻击、投射物、生命值管理
- `monsters`: 怪物系统——AI 行为、工厂生成、属性配置
- `drops`: 掉落物系统——经验球掉落、磁吸拾取
- `hud`: 战斗 HUD——血条、经验条、击杀计数、死亡界面

### Modified Capabilities
- `engine-core`: Entity 新增 `networkId` / `ownerId` 预留字段
- `scene-management`: DemoScene 升级为 BattleScene

## Impact

- **新建文件**：约 12-15 个 JS 模块 + 3 个 JSON 配置
- **修改文件**：Entity.js（加联网预留字段）、main.js（注册新场景）
- **依赖**：全部依赖 Phase 0 的引擎核心
- **验证标准**：玩家在地图上移动，自动射击最近的怪物，怪物被击杀后掉落经验球，拾取后经验条增长，玩家被怪物攻击后扣血，血量归零显示死亡界面
