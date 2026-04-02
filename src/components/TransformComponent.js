import { Component } from '../core/Component.js';

/**
 * TransformComponent — 管理实体的空间信息
 * Unity equivalent: public class Transform : Component
 * 
 * 每个 Entity 创建时自动包含一个 TransformComponent
 */
export class TransformComponent extends Component {
    /**
     * @param {object} config
     * @param {number} [config.x=0] - 初始 X 坐标
     * @param {number} [config.y=0] - 初始 Y 坐标
     * @param {number} [config.rotation=0] - 旋转角度（弧度）
     * @param {number} [config.scaleX=1] - X 缩放
     * @param {number} [config.scaleY=1] - Y 缩放
     */
    constructor(config = {}) {
        super(config);

        /** @type {{x: number, y: number}} 世界坐标 Unity: transform.position */
        this.position = {
            x: config.x || 0,
            y: config.y || 0
        };

        /** @type {number} 旋转角度（弧度）Unity: transform.rotation */
        this.rotation = config.rotation || 0;

        /** @type {{x: number, y: number}} 缩放 Unity: transform.localScale */
        this.scale = {
            x: config.scaleX || 1,
            y: config.scaleY || 1
        };
    }

    /**
     * 设置位置
     * Unity: transform.position = new Vector3(x, y, 0)
     * @param {number} x
     * @param {number} y
     */
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
    }

    /**
     * 按增量移动
     * Unity: transform.Translate(dx, dy, 0)
     * @param {number} dx
     * @param {number} dy
     */
    translate(dx, dy) {
        this.position.x += dx;
        this.position.y += dy;
    }

    /**
     * 计算到另一个位置的距离
     * Unity: Vector3.Distance(a, b)
     * @param {{x: number, y: number}} otherPos
     * @returns {number}
     */
    distanceTo(otherPos) {
        const dx = this.position.x - otherPos.x;
        const dy = this.position.y - otherPos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 计算朝向另一个位置的角度（弧度）
     * Unity: Mathf.Atan2(dy, dx)
     * @param {{x: number, y: number}} otherPos
     * @returns {number}
     */
    angleTo(otherPos) {
        return Math.atan2(
            otherPos.y - this.position.y,
            otherPos.x - this.position.x
        );
    }
}
