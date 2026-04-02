## 1. 数据配置

- [x] 1.1 创建 `assets/data/characters.json` — 定义 3 个角色（游侠-脉冲、先锋-泰坦、医疗-纳米）的完整配置：stats、外观、初始武器、主动技能。验证：JSON 格式合法，字段覆盖 spec 定义的所有属性

## 2. 场景管理改造

- [x] 2.1 改造 `src/core/SceneManager.js`
- [ ] 2.2 封装 `sceneData: object` 属性和 `clearSceneData()` 方法，loadScene 时不清空 sceneData。验证：场景切换后 sceneData 保持

## 3. 主动技能框架

- [x] 3.1 创建 `src/skills/IActiveSkill.js` — 主动技能策略接口，声明 execute() 和 getDescription()。验证：文件存在，接口定义完整
- [x] 3.2 创建 `src/skills/OverchargeSkill.js` — 超频弹幕实现：临时增加攻速 modifier，duration 结束后移除。验证：3 秒内攻速翻倍，3 秒后恢复
- [x] 3.3 创建 `src/skills/ShieldBashSkill.js` — 能量护盾实现：设置 isInvincible + 击退周围敌人。验证：护盾期间不受伤害
- [x] 3.4 创建 `src/skills/NanoHealSkill.js` — 纳米修复实现：恢复 30% maxHp。验证：恢复量正确且不超过 maxHp
- [x] 3.5 创建 `src/components/ActiveSkillComponent.js` — 主动技能组件：冷却管理、tryActivate()、getCooldownPercent()。验证：冷却正确递减，就绪时可释放

## 4. 战斗组件改造

- [x] 4.1 改造 `src/components/HealthComponent.js` — 新增 `isInvincible` 属性，takeDamage() 中检查无敌状态。验证：isInvincible=true 时不扣血
- [x] 4.2 改造 `src/entities/PlayerFactory.js` — 支持 characterId 参数，从 characters.json 加载角色配置，移除 AutoAttackComponent，通过 SkillComponent.addSkill 添加初始武器，挂载 ActiveSkillComponent。验证：不同 characterId 创建出不同属性的玩家

## 5. 输入与控制改造

- [x] 5.1 改造 `src/components/PlayerController.js` — 监听空格键，按下时调用 ActiveSkillComponent.tryActivate()。验证：空格键触发主动技能

## 6. 选角场景

- [x] 6.1 创建 `src/scenes/CharacterSelectScene.js` — 选角场景：加载 characters.json、绘制角色卡片（属性条+技能描述）、点击选择、确认按钮 → 存 characterId 到 sceneData → loadScene('battle')。验证：点击选角后正确跳转战斗场景
- [x] 6.2 改造 `src/main.js` — 注册 CharacterSelectScene，将初始场景改为 'character-select'。验证：启动游戏进入选角界面

## 7. 战斗场景适配

- [x] 7.1 改造 `src/scenes/BattleScene.js` — 从 sceneManager.sceneData 读取 characterId，加载 characters.json，将 characterId 传给 PlayerFactory.create()。验证：不同角色选择创建不同玩家

## 8. HUD 改造

- [x] 8.1 改造 `src/ui/HUD.js` — 新增主动技能冷却显示区域（底部中央：图标 + 冷却遮罩 + 剩余秒数 + SPACE 提示）。验证：冷却中显示遮罩和秒数，就绪时显示金色边框