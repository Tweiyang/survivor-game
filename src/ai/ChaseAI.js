import { Component } from '../core/Component.js';
import { CombatComponent } from '../components/CombatComponent.js';
import { ColliderComponent } from '../components/ColliderComponent.js';

/**
 * ChaseAI — 追踪型怪物 AI
 * Unity equivalent: 自定义 AI 状态机 MonoBehaviour
 * [Network] 怪物 AI 应只在 Host 端执行，Client 端播放表现
 */

const STATE = { IDLE: 0, CHASE: 1, ATTACK: 2 };

export class ChaseAI extends Component {
    constructor(config = {}) {
        super(config);
        this.moveSpeed = config.moveSpeed || 60;
        this.detectionRange = config.detectionRange || 200;
        this.attackRange = config.attackRange || 30;
        this.attackCooldown = config.attackCooldown || 1.0;

        this.state = STATE.IDLE;
        this._attackTimer = 0;

        /** @type {object|null} 实体管理器 */
        this.entityManager = config.entityManager || null;
        /** @type {object|null} CombatSystem */
        this.combatSystem = config.combatSystem || null;
        /** @type {object|null} TilemapData */
        this.tilemapData = config.tilemapData || null;
    }

    update(deltaTime) {
        const player = this.entityManager ? this.entityManager.findByTag('player') : null;
        if (!player || !player.active) {
            this.state = STATE.IDLE;
            return;
        }

        const pos = this.entity.transform.position;
        const ppos = player.transform.position;
        const dx = ppos.x - pos.x;
        const dy = ppos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 状态转换
        if (dist > this.detectionRange) {
            this.state = STATE.IDLE;
        } else if (dist <= this.attackRange) {
            this.state = STATE.ATTACK;
        } else {
            this.state = STATE.CHASE;
        }

        switch (this.state) {
            case STATE.IDLE:
                // 静止
                break;

            case STATE.CHASE:
                this._chase(dx, dy, dist, deltaTime);
                break;

            case STATE.ATTACK:
                this._attack(player, deltaTime);
                break;
        }
    }

    /** @private */
    _chase(dx, dy, dist, deltaTime) {
        if (dist === 0) return;

        // 归一化方向
        const nx = dx / dist;
        const ny = dy / dist;

        const moveX = nx * this.moveSpeed * deltaTime;
        const moveY = ny * this.moveSpeed * deltaTime;

        const pos = this.entity.transform.position;
        // 动态碰撞半径：基于实体碰撞器尺寸
        const collider = this.entity.getComponent(ColliderComponent);
        const halfSize = collider && collider.radius ? Math.floor(collider.radius * 0.6) : 16;

        // 分轴碰撞检测（防穿墙）
        if (this.tilemapData) {
            const newX = pos.x + moveX;
            const canMoveX = this.tilemapData.isWalkable(newX - halfSize, pos.y - halfSize) &&
                             this.tilemapData.isWalkable(newX + halfSize, pos.y - halfSize) &&
                             this.tilemapData.isWalkable(newX - halfSize, pos.y + halfSize) &&
                             this.tilemapData.isWalkable(newX + halfSize, pos.y + halfSize);

            const newY = pos.y + moveY;
            const canMoveY = this.tilemapData.isWalkable(pos.x - halfSize, newY - halfSize) &&
                             this.tilemapData.isWalkable(pos.x + halfSize, newY - halfSize) &&
                             this.tilemapData.isWalkable(pos.x - halfSize, newY + halfSize) &&
                             this.tilemapData.isWalkable(pos.x + halfSize, newY + halfSize);

            if (canMoveX) pos.x = newX;
            if (canMoveY) pos.y = newY;
        } else {
            pos.x += moveX;
            pos.y += moveY;
        }
    }

    /** @private */
    _attack(player, deltaTime) {
        this._attackTimer -= deltaTime;
        if (this._attackTimer > 0) return;

        this._attackTimer = this.attackCooldown;

        // 近身攻击：直接对玩家造成伤害
        const combat = this.entity.getComponent(CombatComponent);
        if (combat && this.combatSystem) {
            this.combatSystem.dealDamage(this.entity, player, combat.attack);
        }
    }
}
