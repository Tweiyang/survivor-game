import { IActiveSkill } from './IActiveSkill.js';

/**
 * NanoHealSkill — 纳米修复（医疗绑定）
 * Unity equivalent: ScriptableObject implements IActiveSkill
 *
 * 立即恢复 healPercent 比例的最大生命值。
 */
export class NanoHealSkill extends IActiveSkill {
    /**
     * @param {import('../core/Entity.js').Entity} owner
     * @param {object} systems
     * @param {object} config — { healPercent }
     */
    execute(owner, systems, config) {
        const healPercent = config.healPercent || 0.3;

        // 查找 HealthComponent
        let healthComp = null;
        for (const comp of owner._components) {
            if (comp.constructor.name === 'HealthComponent') {
                healthComp = comp;
                break;
            }
        }
        if (!healthComp) return;

        const healAmount = Math.floor(healthComp.maxHp * healPercent);
        const oldHp = healthComp.currentHp;
        healthComp.currentHp = Math.min(healthComp.currentHp + healAmount, healthComp.maxHp);
        const actualHeal = healthComp.currentHp - oldHp;

        console.log(`[NanoHealSkill] Healed ${actualHeal} HP (${oldHp} → ${healthComp.currentHp})`);
    }

    /**
     * 无持续效果，不需要 updateEffect
     * @param {number} deltaTime
     */
    updateEffect(deltaTime) {
        // 瞬发技能，无持续效果
    }

    getDescription() {
        return '立即恢复30%最大生命值';
    }
}
