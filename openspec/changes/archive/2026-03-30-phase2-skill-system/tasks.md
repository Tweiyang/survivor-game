## 1. 技能配置数据

- [x] 1.1 创建 `assets/data/skills.json` — 技能配置表，包含 3 把武器（pistol/machineGun/shotgun）和 4 个被动（attackSpeedUp/critRateUp/maxHpUp/moveSpeedUp）。每个技能含 id/name/type/description/icon/maxLevel/selectWeight/levels[]。验证：JSON 格式正确，数值合理。

## 2. 被动技能与 Modifier 系统

- [x] 2.1 创建 `src/skills/PassiveEffect.js` — 被动属性技能类。含 skillId/level/stat/modType/value，提供 levelUp() 方法更新 value。验证：创建实例后属性正确，levelUp 后 value 更新为下一级配置值。
- [x] 2.2 改造 `src/components/CombatComponent.js` — 新增 getFinalAttack()/getFinalDefense()/getFinalCritRate()/getFinalAttackSpeed() 方法，查询 SkillComponent modifier 加成。start() 时缓存 SkillComponent 引用。无 SkillComponent 时返回 base 值。验证：有被动加成时 getFinal 返回正确计算值，怪物无 SkillComponent 时返回 base 值。
- [x] 2.3 改造 `src/systems/CombatSystem.js` — dealDamage 中使用 getFinalCritRate()/getFinalDefense() 替代直接读取 base 值。验证：被动加成后伤害/暴击率计算正确。

## 3. 武器技能与策略模式

- [x] 3.1 创建 `src/skills/IFireStrategy.js` — 开火策略接口基类，声明 tryFire(owner, target, config, systems)。验证：可被继承。
- [x] 3.2 创建 `src/skills/ProjectileFire.js` — 投射物型开火策略（implements IFireStrategy）。支持 count（弹幕量）和 spread（散射角度），调用 ProjectileFactory.create() 生成子弹。验证：count=1/spread=0 发射单颗直线弹；count=5/spread=30 发射 5 颗扇形分布弹。
- [x] 3.3 创建 `src/skills/WeaponSkill.js` — 武器技能类（extends Component）。含 weaponId/level/config/fireStrategy/cooldownTimer。update(dt) 中累加计时器，超过 fireRate（受攻速 modifier 影响）时锁定最近敌人调用 fireStrategy.tryFire()。提供 levelUp() 更新配置。验证：武器按配置间隔自动开火，攻速被动影响实际 fireRate。

## 4. SkillComponent 统管

- [x] 4.1 创建 `src/components/SkillComponent.js` — 技能管理组件（extends Component）。维护 weapons[]/passives[]/skillPool。提供 addSkill(skillId)（判断类型、新增或升级、武器≤4限制）、getStatModifier(statName)（汇总被动加成返回 {flatAdd, percentAdd}）、getAvailableSkills(count)（加权随机抽取、过滤已满级/武器满载）。验证：addSkill 正确判断新增/升级，getStatModifier 汇总正确，武器满 4 时过滤新武器。

## 5. 改造现有组件适配

- [x] 5.1 改造 `src/components/AutoAttackComponent.js` — 攻击间隔改为使用 CombatComponent.getFinalAttackSpeed()。验证：获得攻速被动后实际攻击间隔缩短。
- [x] 5.2 改造 `src/entities/PlayerFactory.js` — 初始化时挂载 SkillComponent，加载 skills.json 技能池，将 AutoAttackComponent 注册为默认武器（weapons[0]）。验证：创建玩家后 SkillComponent 存在且 weapons[0] 为默认手枪。
- [x] 5.3 改造 `src/entities/PlayerFactory.js` 中的 `PlayerController` — moveSpeed 改为读取 getFinalMoveSpeed()（通过 SkillComponent modifier 计算）。验证：获得移速被动后角色实际移动更快。

## 6. 升级技能选择 UI

- [x] 6.1 创建 `src/ui/SkillSelectUI.js` — 升级技能三选一弹窗。Canvas 绘制半透明遮罩 + 3 张卡片（图标/名称/等级/描述/下一级效果）。新技能显示"NEW!"，已有技能显示"Lv.X→Lv.Y"。点击检测选中后调用 SkillComponent.addSkill()。验证：升级时弹出 3 个卡片，点击选中后技能正确添加/升级。

## 7. HUD 与场景集成

- [x] 7.1 改造 `src/ui/HUD.js` — 新增左下角武器槽位（4 格）和被动技能图标区。从 SkillComponent 读取数据渲染。验证：持有武器和被动后 HUD 正确显示图标和等级。
- [x] 7.2 改造 `src/scenes/BattleScene.js` — 集成技能选择流程：监听 onLevelUp → pause → SkillSelectUI.show() → 选择后 resume。初始化时加载 skills.json 传给 SkillComponent。验证：升级时游戏暂停弹出选择界面，选择后恢复，技能生效。