import { IActiveSkill } from './IActiveSkill.js';
import { PassiveEffect } from './PassiveEffect.js';

/**
 * OverchargeSkill — 超频弹幕（游侠绑定）
 * Unity equivalent: ScriptableObject implements IActiveSkill
 *
 * 释放后 duration 秒内攻速翻倍（临时 PassiveEffect），到期自动移除。
 */
export class OverchargeSkill extends IActiveSkill {
    constructor() {
        super();
        /** @type {PassiveEffect|null} 当前生效的临时被动 */
        this._tempEffect = null;
        /** @type {number} 剩余持续时间 */
        this._remainingTime = 0;
        /** @type {object|null} 缓存的 SkillComponent 引用 */
        this._skillComp = null;
    }

    /**
     * @param {import('../core/Entity.js').Entity} owner
     * @param {object} systems
     * @param {object} config — { duration, attackSpeedBonus }
     */
    execute(owner, systems, config) {
        const duration = config.duration || 3;
        const bonus = config.attackSpeedBonus || 1.0;

        // 查找 SkillComponent
        let skillComp = null;
        for (const comp of owner._components) {
            if (comp.constructor.name === 'SkillComponent') {
                skillComp = comp;
                break;
            }
        }
        if (!skillComp) return;

        // 如果上次效果还在，先移除
        if (this._tempEffect && this._skillComp) {
            this._removeEffect();
        }

        // 创建临时被动：攻速 percentAdd
        this._tempEffect = new PassiveEffect({
            id: '_overcharge_temp',
            name: '超频弹幕',
            icon: '⚡',
            maxLevel: 1,
            stat: 'attackSpeed',
            modType: 'percentAdd',
            levels: [{ value: bonus }]
        });
        this._skillComp = skillComp;
        this._remainingTime = duration;

        // 添加到 SkillComponent 的被动列表
        skillComp.passives.push(this._tempEffect);
        skillComp._modifierDirty = true;

        console.log(`[OverchargeSkill] Activated! +${bonus * 100}% ATK SPD for ${duration}s`);
    }

    /**
     * 每帧由 ActiveSkillComponent 调用（如果有持续效果）
     * @param {number} deltaTime
     */
    updateEffect(deltaTime) {
        if (this._remainingTime <= 0) return;

        this._remainingTime -= deltaTime;
        if (this._remainingTime <= 0) {
            this._removeEffect();
        }
    }

    /** @private 移除临时被动效果 */
    _removeEffect() {
        if (this._tempEffect && this._skillComp) {
            const idx = this._skillComp.passives.indexOf(this._tempEffect);
            if (idx >= 0) {
                this._skillComp.passives.splice(idx, 1);
                this._skillComp._modifierDirty = true;
            }
            console.log('[OverchargeSkill] Effect expired');
        }
        this._tempEffect = null;
        this._remainingTime = 0;
    }

    getDescription() {
        return '短时间内攻速翻倍';
    }
}
