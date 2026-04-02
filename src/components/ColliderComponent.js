import { Component } from '../core/Component.js';

/**
 * ColliderComponent — 碰撞体组件
 * Unity equivalent: BoxCollider2D / CircleCollider2D
 * 
 * 定义实体的碰撞区域，支持 AABB 和 Circle 两种类型
 */
export class ColliderComponent extends Component {
    /**
     * @param {object} config
     * @param {string} [config.type='aabb'] - 碰撞体类型: 'aabb' | 'circle'
     * @param {number} [config.width=32] - AABB 宽度
     * @param {number} [config.height=32] - AABB 高度
     * @param {number} [config.radius=16] - Circle 半径
     * @param {number} [config.offsetX=0] - X 偏移
     * @param {number} [config.offsetY=0] - Y 偏移
     * @param {boolean} [config.isTrigger=false] - 是否为触发器
     * @param {string} [config.layer='default'] - 碰撞层
     */
    constructor(config = {}) {
        super(config);

        /** @type {string} 碰撞体类型 Unity: BoxCollider2D / CircleCollider2D */
        this.type = config.type || 'aabb';

        /** @type {number} AABB 宽度 Unity: BoxCollider2D.size.x */
        this.width = config.width || 32;

        /** @type {number} AABB 高度 Unity: BoxCollider2D.size.y */
        this.height = config.height || 32;

        /** @type {number} Circle 半径 Unity: CircleCollider2D.radius */
        this.radius = config.radius || 16;

        /** @type {{x: number, y: number}} 相对 Transform 的偏移 Unity: Collider2D.offset */
        this.offset = {
            x: config.offsetX || 0,
            y: config.offsetY || 0
        };

        /** @type {boolean} 是否为触发器 Unity: Collider2D.isTrigger */
        this.isTrigger = config.isTrigger || false;

        /** @type {string} 碰撞层标识 Unity: gameObject.layer */
        this.layer = config.layer || 'default';
    }

    /**
     * 获取碰撞体的世界坐标中心
     * @returns {{x: number, y: number}}
     */
    getWorldCenter() {
        if (!this.entity) return { x: 0, y: 0 };
        const pos = this.entity.transform.position;
        return {
            x: pos.x + this.offset.x,
            y: pos.y + this.offset.y
        };
    }

    /**
     * 获取 AABB 碰撞体的边界
     * @returns {{left: number, right: number, top: number, bottom: number}}
     */
    getBounds() {
        const center = this.getWorldCenter();

        if (this.type === 'aabb') {
            const halfW = this.width / 2;
            const halfH = this.height / 2;
            return {
                left: center.x - halfW,
                right: center.x + halfW,
                top: center.y - halfH,
                bottom: center.y + halfH
            };
        } else {
            // circle 也返回 AABB 包围盒
            return {
                left: center.x - this.radius,
                right: center.x + this.radius,
                top: center.y - this.radius,
                bottom: center.y + this.radius
            };
        }
    }
}
