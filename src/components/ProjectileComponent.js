import { Component } from '../core/Component.js';
import { SpriteRenderer } from './SpriteRenderer.js';
import { NetworkManager } from '../systems/NetworkManager.js';

/**
 * ProjectileComponent — 投射物行为组件
 * Unity equivalent: 子弹/投射物脚本
 *
 * [Network] 联网模式下本地投射物仅做视觉表现，伤害由服务端权威结算
 */
export class ProjectileComponent extends Component {
    constructor(config = {}) {
        super(config);
        /** @type {{x:number,y:number}} 飞行方向（归一化） */
        this.direction = config.direction || { x: 1, y: 0 };
        /** @type {number} 飞行速度 */
        this.speed = config.speed || 400;
        /** @type {number} 基础伤害 */
        this.damage = config.damage || 10;
        /** @type {string} 所属阵营 */
        this.faction = config.faction || 'player';
        /** @type {number} 最大存活时间(秒) */
        this.maxLifetime = config.maxLifetime || 2.0;
        /** @type {number} 已存活时间 */
        this._lifetime = 0;
        /** @type {import('../core/Entity.js').Entity|null} 发射者 */
        this.owner = config.owner || null;
        /** @type {object|null} CombatSystem 引用 */
        this.combatSystem = config.combatSystem || null;
        /** @type {object|null} EntityManager 引用 */
        this.entityManager = config.entityManager || null;
        /** @type {object|null} TilemapData 引用 */
        this.tilemapData = config.tilemapData || null;
    }

    update(deltaTime) {
        // 存活时间检测
        this._lifetime += deltaTime;
        if (this._lifetime >= this.maxLifetime) {
            if (this.entityManager) this.entityManager.remove(this.entity);
            return;
        }

        // 移动
        const transform = this.entity.transform;
        transform.position.x += this.direction.x * this.speed * deltaTime;
        transform.position.y += this.direction.y * this.speed * deltaTime;

        // 瓦片碰撞（碰墙销毁）
        if (this.tilemapData && !this.tilemapData.isWalkable(transform.position.x, transform.position.y)) {
            if (this.entityManager) this.entityManager.remove(this.entity);
            return;
        }

        // 碰撞检测（手动检测，不依赖 PhysicsSystem 的自动碰撞）
        this._checkHit();
    }

    /**
     * @private 检测是否命中敌方
     * [Network] 联网模式下仅做视觉碰撞（销毁子弹），不造成伤害
     */
    _checkHit() {
        if (!this.entityManager) return;

        const isOnline = NetworkManager.getInstance().isOnline;

        const pos = this.entity.transform.position;
        // 玩家子弹命中 enemy 和 boss；敌方子弹命中 player
        const enemyTags = this.faction === 'player' ? ['enemy', 'boss'] : ['player'];
        let enemies = [];
        for (const tag of enemyTags) {
            enemies = enemies.concat(this.entityManager.findAllByTag(tag));
        }

        for (const enemy of enemies) {
            if (!enemy.active || enemy._pendingDestroy) continue;
            const ep = enemy.transform.position;
            const dx = ep.x - pos.x;
            const dy = ep.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 圆形碰撞检测（投射物半径 + 敌方碰撞半径）
            const sr = enemy.getComponent ? enemy.getComponent(SpriteRenderer) : null;
            const enemyRadius = sr ? Math.max(sr.width, sr.height) / 2 : 20;
            const hitRadius = 6 + enemyRadius; // 子弹半径(~6) + 敌方半径
            if (dist < hitRadius) {
                // [Network] 联网模式：仅销毁子弹（视觉效果），伤害由服务端权威处理
                // 离线模式：造成本地伤害
                if (!isOnline && this.combatSystem && this.owner) {
                    this.combatSystem.dealDamage(this.owner, enemy, this.damage);
                }
                // 销毁投射物（P1 不穿透）
                if (this.entityManager) this.entityManager.remove(this.entity);
                return;
            }
        }
    }
}
