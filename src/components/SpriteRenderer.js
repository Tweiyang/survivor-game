import { Component } from '../core/Component.js';

/**
 * SpriteRenderer — Canvas 2D 精灵渲染组件
 * Unity equivalent: public class SpriteRenderer : Renderer
 * 
 * Phase 0 使用简单几何图形（rect/circle/triangle）绘制
 * 预留 sprite 字段供后续 PNG 精灵图使用
 */
export class SpriteRenderer extends Component {
    /**
     * @param {object} config
     * @param {number} [config.width=32] - 绘制宽度
     * @param {number} [config.height=32] - 绘制高度
     * @param {string} [config.color='#FFFFFF'] - 填充颜色
     * @param {string} [config.shape='rect'] - 形状: 'rect' | 'circle' | 'triangle'
     * @param {number} [config.sortingLayer=2] - 渲染层级
     * @param {number} [config.sortingOrder=0] - 同层排序值
     * @param {boolean} [config.visible=true] - 是否可见
     * @param {number} [config.opacity=1] - 透明度 0~1
     * @param {string} [config.strokeColor=null] - 描边颜色
     * @param {number} [config.strokeWidth=0] - 描边宽度
     */
    constructor(config = {}) {
        super(config);

        /** @type {number} 绘制宽度 */
        this.width = config.width || 32;

        /** @type {number} 绘制高度 */
        this.height = config.height || 32;

        /** @type {string} 填充颜色 Unity: SpriteRenderer.color */
        this.color = config.color || '#FFFFFF';

        /** @type {string} 形状类型 */
        this.shape = config.shape || 'rect';

        /** @type {number} 渲染层级 Unity: SpriteRenderer.sortingLayerID */
        this.sortingLayer = config.sortingLayer !== undefined ? config.sortingLayer : 2;

        /** @type {number} 同层排序值 Unity: SpriteRenderer.sortingOrder */
        this.sortingOrder = config.sortingOrder || 0;

        /** @type {boolean} 是否可见 Unity: Renderer.enabled */
        this.visible = config.visible !== undefined ? config.visible : true;

        /** @type {number} 透明度 Unity: SpriteRenderer.color.a */
        this.opacity = config.opacity !== undefined ? config.opacity : 1;

        /** @type {string|null} 描边颜色 */
        this.strokeColor = config.strokeColor || null;

        /** @type {number} 描边宽度 */
        this.strokeWidth = config.strokeWidth || 0;

        /** @type {Image|null} 精灵图（预留，Phase 0 不使用）Unity: SpriteRenderer.sprite */
        this.sprite = config.sprite || null;

        /** @type {{x: number, y: number}} 渲染锚点偏移（0.5,0.5 为中心）*/
        this.anchor = config.anchor || { x: 0.5, y: 0.5 };
    }

    /**
     * 在 Canvas 上绘制
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} camera - 摄像机信息 {x, y}
     */
    render(ctx, camera) {
        if (!this.visible || !this.entity || !this.entity.active) return;

        const transform = this.entity.transform;
        const screenX = transform.position.x - camera.x;
        const screenY = transform.position.y - camera.y;

        ctx.save();

        // 透明度
        ctx.globalAlpha = this.opacity;

        // 变换：平移到位置 → 旋转 → 缩放
        ctx.translate(screenX, screenY);
        if (transform.rotation !== 0) {
            ctx.rotate(transform.rotation);
        }
        if (transform.scale.x !== 1 || transform.scale.y !== 1) {
            ctx.scale(transform.scale.x, transform.scale.y);
        }

        // 如果有精灵图，优先使用
        if (this.sprite && this.sprite.complete) {
            ctx.drawImage(
                this.sprite,
                -this.width * this.anchor.x,
                -this.height * this.anchor.y,
                this.width,
                this.height
            );
        } else {
            // 使用几何图形绘制
            ctx.fillStyle = this.color;

            switch (this.shape) {
                case 'rect':
                    this._drawRect(ctx);
                    break;
                case 'circle':
                    this._drawCircle(ctx);
                    break;
                case 'triangle':
                    this._drawTriangle(ctx);
                    break;
                case 'diamond':
                    this._drawDiamond(ctx);
                    break;
                default:
                    this._drawRect(ctx);
            }
        }

        ctx.restore();
    }

    /** @private 绘制矩形 */
    _drawRect(ctx) {
        const x = -this.width * this.anchor.x;
        const y = -this.height * this.anchor.y;

        ctx.fillRect(x, y, this.width, this.height);

        if (this.strokeColor && this.strokeWidth > 0) {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.strokeRect(x, y, this.width, this.height);
        }
    }

    /** @private 绘制圆形 */
    _drawCircle(ctx) {
        const radius = Math.min(this.width, this.height) / 2;

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.strokeColor && this.strokeWidth > 0) {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.stroke();
        }
    }

    /** @private 绘制三角形（朝上） */
    _drawTriangle(ctx) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;

        ctx.beginPath();
        ctx.moveTo(0, -halfH);           // 顶点
        ctx.lineTo(-halfW, halfH);       // 左下
        ctx.lineTo(halfW, halfH);        // 右下
        ctx.closePath();
        ctx.fill();

        if (this.strokeColor && this.strokeWidth > 0) {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.stroke();
        }
    }

    /** @private 绘制菱形 */
    _drawDiamond(ctx) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;

        ctx.beginPath();
        ctx.moveTo(0, -halfH);           // 上
        ctx.lineTo(halfW, 0);            // 右
        ctx.lineTo(0, halfH);            // 下
        ctx.lineTo(-halfW, 0);           // 左
        ctx.closePath();
        ctx.fill();

        if (this.strokeColor && this.strokeWidth > 0) {
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.stroke();
        }
    }
}
