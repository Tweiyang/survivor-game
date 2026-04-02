import { Component } from '../core/Component.js';

/**
 * HealthComponent — 生命值管理组件
 * Unity equivalent: 自定义 Health MonoBehaviour
 */
export class HealthComponent extends Component {
    /**
     * @param {object} config
     * @param {number} config.maxHp
     * @param {object} [config.eventSystem] - 事件系统引用
     * @param {object} [config.entityManager] - 实体管理器引用
     */
    constructor(config = {}) {
        super(config);
        /** @type {number} 最大生命值 */
        this.maxHp = config.maxHp || 100;
        /** @type {number} 当前生命值 */
        this.currentHp = this.maxHp;
        /** @type {boolean} 是否已死亡 */
        this.isDead = false;

        /** @type {object|null} 事件系统 */
        this.eventSystem = config.eventSystem || null;
        /** @type {object|null} 实体管理器 */
        this.entityManager = config.entityManager || null;

        // 受击闪烁
        /** @type {number} 闪烁剩余时间 */
        this._flashTimer = 0;
        /** @type {string|null} 闪烁前的原始颜色 */
        this._originalColor = null;
        /** @type {boolean} 血条显示计时器（怪物头顶血条用） */
        this.showBarTimer = 0;

        /** @type {boolean} 是否无敌状态（P3: ShieldBashSkill 使用） */
        this.isInvincible = false;
    }

    /**
     * 受到伤害
     * @param {number} amount - 伤害量
     */
    takeDamage(amount) {
        if (this.isDead) return;
        if (this.isInvincible) return; // P3: 无敌状态免疫伤害

        this.currentHp = Math.max(0, this.currentHp - amount);
        this.showBarTimer = 3.0; // 显示血条 3 秒

        // 受击闪烁效果
        this._startFlash();

        // 受击音效
        if (this.eventSystem && this.entity) {
            const tag = this.entity.tag;
            if (tag === 'player') {
                this.eventSystem.emit('onSFX', { soundId: 'player_hit' });
            } else if (tag === 'enemy' || tag === 'boss') {
                this.eventSystem.emit('onSFX', { soundId: 'enemy_hit' });
            }
        }

        if (this.currentHp <= 0) {
            this.die();
        }
    }

    /**
     * 恢复生命值
     * @param {number} amount
     */
    heal(amount) {
        if (this.isDead) return;
        this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    }

    /**
     * 死亡处理
     * [Network] 死亡判定应由服务器权威
     */
    die() {
        if (this.isDead) return;
        this.isDead = true;

        // 击杀音效
        if (this.eventSystem && this.entity) {
            const tag = this.entity.tag;
            if (tag === 'boss') {
                this.eventSystem.emit('onSFX', { soundId: 'boss_kill' });
            } else if (tag === 'enemy') {
                this.eventSystem.emit('onSFX', { soundId: 'enemy_kill' });
            }
        }

        if (this.eventSystem) {
            this.eventSystem.emit('onDeath', this.entity);
        }

        if (this.entityManager) {
            this.entityManager.remove(this.entity);
        }
    }

    /**
     * 获取血量比例 0~1
     * @returns {number}
     */
    getHpRatio() {
        return this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
    }

    /**
     * 触发受击闪烁
     * @private
     */
    _startFlash() {
        if (!this.entity) return;
        const sr = this._getSpriteRenderer();
        if (!sr) return;

        if (!this._originalColor) {
            this._originalColor = sr.color;
        }
        sr.color = '#FFFFFF';
        this._flashTimer = 0.1; // 0.1 秒闪烁
    }

    /**
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // 闪烁恢复
        if (this._flashTimer > 0) {
            this._flashTimer -= deltaTime;
            if (this._flashTimer <= 0) {
                this._flashTimer = 0;
                const sr = this._getSpriteRenderer();
                if (sr && this._originalColor) {
                    sr.color = this._originalColor;
                    this._originalColor = null;
                }
            }
        }

        // 血条显示计时器
        if (this.showBarTimer > 0) {
            this.showBarTimer -= deltaTime;
        }
    }

    /** @private */
    _getSpriteRenderer() {
        if (!this.entity) return null;
        for (const comp of this.entity._components) {
            if (comp.constructor.name === 'SpriteRenderer') return comp;
        }
        return null;
    }
}
