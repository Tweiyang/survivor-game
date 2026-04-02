import { Component } from '../core/Component.js';

/**
 * RigidbodyComponent — 速度驱动的运动组件
 * Unity equivalent: public class Rigidbody2D : Component
 * 
 * 管理实体的速度、摩擦力，每帧根据 velocity 更新 Transform
 */
export class RigidbodyComponent extends Component {
    /**
     * @param {object} config
     * @param {number} [config.maxSpeed=300] - 最大速度
     * @param {number} [config.friction=0] - 摩擦系数 (0~1)
     * @param {boolean} [config.isKinematic=false] - 是否运动学物体
     */
    constructor(config = {}) {
        super(config);

        /** @type {{x: number, y: number}} 速度 (像素/秒) Unity: Rigidbody2D.velocity */
        this.velocity = { x: 0, y: 0 };

        /** @type {number} 最大速度限制 */
        this.maxSpeed = config.maxSpeed || 300;

        /** @type {number} 摩擦系数 Unity: Rigidbody2D.drag */
        this.friction = config.friction || 0;

        /** @type {boolean} 运动学物体 Unity: Rigidbody2D.isKinematic */
        this.isKinematic = config.isKinematic || false;
    }

    /**
     * 每帧更新位置
     * Unity: FixedUpdate() 中 Rigidbody 自动更新
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (!this.entity) return;

        // 摩擦力衰减
        if (this.friction > 0) {
            const decay = 1 - this.friction * deltaTime;
            this.velocity.x *= decay;
            this.velocity.y *= decay;

            // 速度很小时归零
            if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
            if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
        }

        // 限速
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }

        // 更新位置
        const transform = this.entity.transform;
        transform.position.x += this.velocity.x * deltaTime;
        transform.position.y += this.velocity.y * deltaTime;
    }

    /**
     * 设置速度
     * Unity: rigidbody2D.velocity = new Vector2(x, y)
     * @param {number} x
     * @param {number} y
     */
    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }

    /**
     * 添加力（速度增量）
     * Unity: rigidbody2D.AddForce(force)
     * @param {number} fx
     * @param {number} fy
     */
    addForce(fx, fy) {
        if (this.isKinematic) return;
        this.velocity.x += fx;
        this.velocity.y += fy;
    }

    /**
     * 获取当前速度大小
     * @returns {number}
     */
    getSpeed() {
        return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    }
}
