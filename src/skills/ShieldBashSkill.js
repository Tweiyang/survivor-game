import { IActiveSkill } from './IActiveSkill.js';

/**
 * ShieldBashSkill — 能量护盾（先锋绑定）
 * Unity equivalent: ScriptableObject implements IActiveSkill
 *
 * 释放后给予 duration 秒无敌 + 击退周围敌人。
 */
export class ShieldBashSkill extends IActiveSkill {
    constructor() {
        super();
        /** @type {number} 无敌剩余时间 */
        this._remainingTime = 0;
        /** @type {object|null} HealthComponent 引用 */
        this._healthComp = null;
    }

    /**
     * @param {import('../core/Entity.js').Entity} owner
     * @param {object} systems
     * @param {object} config — { duration, pushRange, pushForce }
     */
    execute(owner, systems, config) {
        const duration = config.duration || 3;
        const pushRange = config.pushRange || 150;
        const pushForce = config.pushForce || 200;

        // 设置无敌状态
        let healthComp = null;
        for (const comp of owner._components) {
            if (comp.constructor.name === 'HealthComponent') {
                healthComp = comp;
                break;
            }
        }
        if (healthComp) {
            healthComp.isInvincible = true;
            this._healthComp = healthComp;
            this._remainingTime = duration;
        }

        // 击退周围敌人
        if (systems.physicsSystem) {
            const pos = owner.transform.position;
            const hits = systems.physicsSystem.overlapCircle({ x: pos.x, y: pos.y }, pushRange);

            for (const hit of hits) {
                if (hit === owner || !hit.active) continue;

                // 检查是否为敌方
                let hitCombat = null;
                for (const comp of hit._components) {
                    if (comp.constructor.name === 'CombatComponent') {
                        hitCombat = comp;
                        break;
                    }
                }
                if (!hitCombat || hitCombat.faction === 'player') continue;

                // 计算推开方向
                const dx = hit.transform.position.x - pos.x;
                const dy = hit.transform.position.y - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) continue;

                // 推开敌人
                hit.transform.position.x += (dx / dist) * pushForce;
                hit.transform.position.y += (dy / dist) * pushForce;
            }
        }

        console.log(`[ShieldBashSkill] Activated! Invincible for ${duration}s, knocked back enemies`);
    }

    /**
     * 每帧由 ActiveSkillComponent 调用
     * @param {number} deltaTime
     */
    updateEffect(deltaTime) {
        if (this._remainingTime <= 0) return;

        this._remainingTime -= deltaTime;
        if (this._remainingTime <= 0) {
            // 解除无敌
            if (this._healthComp) {
                this._healthComp.isInvincible = false;
                console.log('[ShieldBashSkill] Shield expired');
            }
            this._healthComp = null;
            this._remainingTime = 0;
        }
    }

    getDescription() {
        return '短时间内无敌并击退周围敌人';
    }
}
