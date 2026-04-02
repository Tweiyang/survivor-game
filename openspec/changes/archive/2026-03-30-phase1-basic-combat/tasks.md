## 1. 配置数据与预留字段

- [x] 1.1 创建 `assets/data/player.json` — 玩家基础属性配置（maxHp, attack, defense, critRate, critMultiplier, moveSpeed, attackSpeed, attackRange, projectileSpeed, pickupRange）。验证：JSON 文件格式正确，数值与 design D6 一致。
- [x] 1.2 创建 `assets/data/monsters.json` — 怪物配置表，含 slime 和 bat 两种类型（name, maxHp, attack, defense, moveSpeed, detectionRange, attackRange, attackCooldown, expValue, color, size, shape）。验证：JSON 格式正确。
- [x] 1.3 创建 `assets/data/formulas.json` — 战斗公式参数（defenseRatio, baseCritMultiplier, levelScaling, expPerBall, baseExpToLevel, expLevelMultiplier）。验证：JSON 格式正确。
- [x] 1.4 修改 `src/core/Entity.js` — 新增 `networkId`（默认 null）和 `ownerId`（默认 'local'）预留字段，带 `/* Network: ... */` 注释。验证：创建 Entity 后有这两个字段。

## 2. 战斗核心组件

- [x] 2.1 创建 `src/components/HealthComponent.js` — 生命值管理组件，含 maxHp/currentHp/isDead、takeDamage()/heal()/die()/getHpRatio()。受击时触发 SpriteRenderer 白色闪烁 0.1 秒。die() 触发 EventSystem 'onDeath' 事件。验证：takeDamage 扣血正确，hp≤0 触发 onDeath，闪烁效果可见。
- [x] 2.2 创建 `src/components/CombatComponent.js` — 战斗属性组件，含 attack/defense/critRate/critMultiplier/attackSpeed/attackRange/projectileSpeed/faction。验证：从配置加载后属性正确。
- [x] 2.3 创建 `src/systems/CombatSystem.js` — 伤害计算系统，实现 dealDamage(attacker, target, baseDamage, skillMultiplier?)。按 rules.md 公式计算：baseDmg × critMult - defense × defenseRatio。加载 formulas.json。触发 'onDamage' 事件。带 Network 注释。验证：无暴击伤害计算正确，暴击伤害正确，最低伤害为 1。

## 3. 自动攻击与投射物

- [x] 3.1 创建 `src/components/AutoAttackComponent.js` — 自动锁敌组件。每隔 attackSpeed 秒触发攻击，用 overlapCircle 搜索 attackRange 内敌方实体，选最近目标，调用 ProjectileFactory 生成投射物。无目标不攻击。验证：玩家自动朝最近怪物发射投射物，攻击间隔正确。
- [x] 3.2 创建 `src/components/ProjectileComponent.js` — 投射物行为组件。每帧按 direction×speed 移动，trigger 碰撞到敌方时调用 CombatSystem.dealDamage() 后销毁，超过 maxLifetime(2s) 自动销毁。验证：投射物飞向目标，命中后消失并造成伤害，超时消失。
- [x] 3.3 创建 `src/entities/ProjectileFactory.js` — 投射物工厂。create({owner, position, direction, speed, damage, faction, color, size}) 创建投射物实体（SpriteRenderer 黄色小圆 + ColliderComponent trigger + ProjectileComponent）。验证：调用后生成可见投射物。

## 4. 怪物 AI 与工厂

- [x] 4.1 创建 `src/ai/ChaseAI.js` — 追踪型 AI 组件。IDLE/CHASE/ATTACK 三状态。CHASE 时朝玩家移动（含瓦片碰撞分轴检测防穿墙），ATTACK 时 overlapCircle 近身攻击。需要引用 tilemapData（通过 entity 注入或系统引用）。验证：怪物发现玩家后追踪，到近地点后停下攻击，碰墙不穿墙。
- [x] 4.2 创建 `src/entities/MonsterFactory.js` — 怪物工厂。create({type, position, systems}) 按 monsters.json 配置创建怪物实体（SpriteRenderer + ColliderComponent circle + RigidbodyComponent + HealthComponent + CombatComponent + ChaseAI）。验证：create('slime', pos) 生成绿色圆形怪物。
- [x] 4.3 创建 `src/entities/PlayerFactory.js` — 玩家工厂。create({position, systems}) 按 player.json 配置创建玩家实体（含所有组件 + PlayerController + AutoAttackComponent）。从 DemoScene 提取 PlayerController 到独立文件。验证：create 后生成带自动攻击的蓝色方块玩家。

## 5. 掉落物与经验系统

- [x] 5.1 创建 `src/components/DropComponent.js` — 掉落物行为组件。检测玩家距离 < pickupRange 时磁吸飞行，碰到玩家触发 'onPickup' 事件后销毁。验证：经验球在玩家靠近时飞向玩家，碰到后消失。
- [x] 5.2 创建 `src/entities/DropItemFactory.js` — 掉落物工厂。spawnDrops({position, expValue, expPerBall, entityManager, eventSystem}) 生成经验球。数量=ceil(expValue/expPerBall)上限5，从死亡位置散开。场上超过50个时直接加经验。验证：怪物死亡后地面出现绿色小点。
- [x] 5.3 创建 `src/systems/ExperienceSystem.js` — 经验值系统。监听 'onPickup' 事件收集经验，维护 currentExp/expToNextLevel/level。升级时触发 'onLevelUp' 事件。升级公式：expToNextLevel = baseExpToLevel × expLevelMultiplier^(level-1)。验证：拾取经验球后数值增加，达标后升级。

## 6. HUD 与 UI

- [x] 6.1 创建 `src/ui/HUD.js` — 战斗 HUD。Canvas 绘制玩家血条（红色）、经验条（蓝色）、等级 "Lv.N"、击杀数 "Kills: N"。每帧从 HealthComponent 和 ExperienceSystem 读取。绘制怪物头顶小血条（满血不显示，受击后显示 3 秒淡出）。验证：左上角显示血条和经验条，怪物受击后头顶出现血条。
- [x] 6.2 创建 `src/ui/GameOverUI.js` — 死亡界面。监听玩家 'onDeath' 事件，显示半透明遮罩 + "GAME OVER" + 统计（存活时间/击杀数/等级）+ "重新开始" 按钮。点击按钮调用 SceneManager.restart()。显示时暂停 GameLoop。验证：玩家死亡后弹出死亡界面，点击重新开始恢复游戏。

## 7. 战斗场景整合

- [x] 7.1 重构 `src/scenes/DemoScene.js` → `src/scenes/BattleScene.js`。使用 PlayerFactory 创建玩家，实现怪物持续生成逻辑（maxMonsters=15, spawnInterval=3s, 玩家周围 300-500px 可行走位置随机生成）。扩展地图为 30×30。集成 HUD、GameOverUI、ExperienceSystem。监听 'onDeath'（怪物死亡时调 DropItemFactory、增加击杀计数）。验证：启动后看到 30×30 地图，玩家自动射击怪物，怪物追踪玩家，击杀掉经验球，拾取后经验条增长，被怪物打死后出现 Game Over。
- [x] 7.2 更新 `src/main.js` — 注册 BattleScene 替换 DemoScene 为默认场景，集成 CombatSystem 和 ExperienceSystem 到系统引用。更新调试 HUD 显示更多信息（等级/击杀数）。验证：打开 index.html 直接进入战斗场景，所有系统正常工作。