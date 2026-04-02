import { Component } from '../core/Component.js';
import { CombatComponent } from './CombatComponent.js';

/**
 * AutoAttackComponent — 自动锁敌并发射投射物
 * Unity equivalent: 自动攻击控制脚本
 * [Network] 攻击事件应通过 NetworkManager 广播
 */
export class AutoAttackComponent extends Component {
    constructor(config = {}) {
        super(config);
        /** @type {number} 攻击间隔计时器 */
        this._attackTimer = 0;
        /** @type {object|null} 物理系统引用 */
        this.physicsSystem = config.physicsSystem || null;
        /** @type {object|null} ProjectileFactory 引用 */
        this.projectileFactory = config.projectileFactory || null;
        /** @type {object|null} 实体管理器 */
        this.entityManager = config.entityManager || null;
    }

    update(deltaTime) {
        this._attackTimer -= deltaTime;
        if (this._attackTimer > 0) return;

        const combat = this.getComponent(CombatComponent);
        if (!combat) return;

        // 重置计时器（P2: 使用 getFinalAttackSpeed 受被动加成影响）
        this._attackTimer = typeof combat.getFinalAttackSpeed === 'function'
            ? combat.getFinalAttackSpeed()
            : combat.attackSpeed;

        // 查找范围内的敌方实体
        const target = this._findNearestEnemy(combat);
        if (!target) return;

        // 计算朝向
        const pos = this.entity.transform.position;
        const targetPos = target.transform.position;
        const dx = targetPos.x - pos.x;
        const dy = targetPos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const direction = { x: dx / dist, y: dy / dist };

        // 发射投射物
        if (this.projectileFactory) {
            this.projectileFactory.create({
                owner: this.entity,
                position: { x: pos.x, y: pos.y },
                direction,
                speed: combat.projectileSpeed,
                damage: typeof combat.getFinalAttack === 'function'
                    ? combat.getFinalAttack()
                    : combat.attack,
                faction: combat.faction,
                color: '#FFDD44',
                size: 6
            });

            // 射击音效
            if (this.eventSystem) {
                this.eventSystem.emit('onSFX', { soundId: 'player_shoot' });
            }
        }
    }

    /**
     * 查找最近的敌方实体
     * @private
     */
    _findNearestEnemy(combat) {
        if (!this.entityManager) return null;

        const pos = this.entity.transform.position;
        const enemyTag = combat.faction === 'player' ? 'enemy' : 'player';
        const enemies = this.entityManager.findAllByTag(enemyTag);

        let nearest = null;
        let nearestDist = combat.attackRange;

        for (const enemy of enemies) {
            if (!enemy.active || enemy._pendingDestroy) continue;
            const ep = enemy.transform.position;
            const dx = ep.x - pos.x;
            const dy = ep.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }
}
