import { HealthComponent } from '../components/HealthComponent.js';
import { CombatComponent } from '../components/CombatComponent.js';

/**
 * CombatSystem — 伤害计算系统
 * Unity equivalent: 战斗管理脚本
 * [Network] 伤害应由 Host/服务器计算
 */
export class CombatSystem {
    /**
     * @param {object} config
     * @param {object} config.eventSystem
     * @param {object} config.formulas - formulas.json 数据
     */
    constructor(config = {}) {
        this.eventSystem = config.eventSystem || null;
        this.formulas = config.formulas || {
            defenseRatio: 0.5,
            baseCritMultiplier: 1.5
        };
    }

    /**
     * 计算并施加伤害
     * [Network] 此方法在联机模式下应由服务器权威调用
     * @param {import('../core/Entity.js').Entity} attacker
     * @param {import('../core/Entity.js').Entity} target
     * @param {number} baseDamage
     * @param {number} [skillMultiplier=1]
     * @returns {{damage: number, isCrit: boolean}|null}
     */
    dealDamage(attacker, target, baseDamage, skillMultiplier = 1) {
        if (!target || typeof target.getComponent !== 'function') return null;
        const targetHealth = target.getComponent(HealthComponent);
        if (!targetHealth || targetHealth.isDead) return null;

        const attackerCombat =
            attacker && typeof attacker.getComponent === 'function'
                ? attacker.getComponent(CombatComponent)
                : null;

        // 1. 基础伤害 × 技能倍率
        let dmg = baseDamage * skillMultiplier;

        // 2. 暴击判定（P2: 使用 getFinalCritRate）
        let isCrit = false;
        const critRate = attackerCombat
            ? (typeof attackerCombat.getFinalCritRate === 'function'
                ? attackerCombat.getFinalCritRate()
                : attackerCombat.critRate)
            : 0;
        if (critRate > 0 && Math.random() < critRate) {
            isCrit = true;
            dmg *= (attackerCombat.critMultiplier || this.formulas.baseCritMultiplier);
        }

        // 3. 防御减伤（P2: 使用 getFinalDefense）
        const targetCombat = target.getComponent(CombatComponent);
        const defense = targetCombat
            ? (typeof targetCombat.getFinalDefense === 'function'
                ? targetCombat.getFinalDefense()
                : targetCombat.defense)
            : 0;
        const finalDmg = Math.max(1, Math.round(dmg - defense * this.formulas.defenseRatio));

        // 4. 施加伤害
        targetHealth.takeDamage(finalDmg);

        // 5. 触发事件
        if (this.eventSystem) {
            this.eventSystem.emit('onDamage', {
                attacker,
                target,
                damage: finalDmg,
                isCrit
            });
        }

        return { damage: finalDmg, isCrit };
    }
}
