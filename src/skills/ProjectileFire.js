import { IFireStrategy } from './IFireStrategy.js';
import { CombatComponent } from '../components/CombatComponent.js';

/**
 * ProjectileFire — 投射物型开火策略
 * Unity equivalent: ScriptableObject 实现 IFireStrategy
 *
 * 适用于标准枪械：手枪、机关枪、散弹枪等。
 * 通过 count（弹幕量）和 spread（散射角度）支持多种弹幕模式。
 */
export class ProjectileFire extends IFireStrategy {
    /**
     * 发射投射物
     * @param {import('../core/Entity.js').Entity} owner
     * @param {import('../core/Entity.js').Entity} target
     * @param {object} config — {damage, count, spread, speed, color, size, range}
     * @param {object} systems — {projectileFactory, combatSystem, ...}
     * @returns {boolean}
     */
    tryFire(owner, target, config, systems) {
        if (!target || !target.active) return false;
        if (!systems.projectileFactory) return false;

        const ownerPos = owner.transform.position;
        const targetPos = target.transform.position;

        // 计算朝向目标的基础角度
        const dx = targetPos.x - ownerPos.x;
        const dy = targetPos.y - ownerPos.y;
        const baseAngle = Math.atan2(dy, dx);

        const count = config.count || 1;
        const spreadDeg = config.spread || 0;
        const spreadRad = (spreadDeg * Math.PI) / 180;

        // 获取攻击力 modifier 加成
        const combat = owner.getComponent(CombatComponent);
        const finalAttack = combat
            ? (typeof combat.getFinalAttack === 'function'
                ? combat.getFinalAttack()
                : combat.attack)
            : 10;

        // 子弹伤害 = 配置伤害 × (最终攻击力 / 基础攻击力) 的比率
        const baseAttack = combat ? combat.attack : 10;
        const attackRatio = baseAttack > 0 ? finalAttack / baseAttack : 1;
        const bulletDamage = Math.round(config.damage * attackRatio);

        const faction = combat ? combat.faction : 'player';

        for (let i = 0; i < count; i++) {
            // 计算每颗子弹的散射角度
            let angle = baseAngle;
            if (count > 1 && spreadRad > 0) {
                // 均匀分布在 [-spread/2, +spread/2]
                const step = spreadRad / (count - 1);
                angle = baseAngle - spreadRad / 2 + step * i;
            } else if (count === 1 && spreadRad > 0) {
                // 单颗子弹随机偏移
                angle += (Math.random() - 0.5) * spreadRad;
            }

            const direction = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };

            systems.projectileFactory.create({
                owner,
                position: { x: ownerPos.x, y: ownerPos.y },
                direction,
                speed: config.speed || 400,
                damage: bulletDamage,
                faction,
                color: config.color || '#FFDD44',
                size: config.size || 4
            });
        }

        // 射击音效（每次开火只播一次，不管弹幕数量）
        if (systems.eventSystem) {
            systems.eventSystem.emit('onSFX', { soundId: 'player_shoot' });
        }

        return true;
    }
}
