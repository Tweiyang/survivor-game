/**
 * VirtualJoystick — 虚拟摇杆 UI 组件
 * Unity equivalent: On-Screen Stick (UI Canvas)
 *
 * 在 Canvas 上绘制左下角摇杆，支持 touch 拖拽，
 * 输出归一化轴值 axisX/axisY（-1~1）。
 */
export class VirtualJoystick {
    /**
     * @param {object} config
     * @param {number} config.baseX — 底盘中心 X
     * @param {number} config.baseY — 底盘中心 Y
     * @param {number} [config.baseRadius=60] — 底盘半径
     * @param {number} [config.thumbRadius=24] — 拇指圆半径
     */
    constructor(config = {}) {
        this.baseX = config.baseX || 100;
        this.baseY = config.baseY || 100;
        this.baseRadius = config.baseRadius || 60;
        this.thumbRadius = config.thumbRadius || 24;

        /** @type {number} 归一化 X 轴值 -1~1 */
        this.axisX = 0;
        /** @type {number} 归一化 Y 轴值 -1~1 */
        this.axisY = 0;

        /** @type {number} 拇指当前 X */
        this._thumbX = this.baseX;
        /** @type {number} 拇指当前 Y */
        this._thumbY = this.baseY;

        /** @type {boolean} 是否正在拖拽 */
        this._active = false;
    }

    /**
     * 更新底盘位置（窗口 resize 时调用）
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    updateLayout(canvasWidth, canvasHeight) {
        this.baseX = 30 + this.baseRadius;
        this.baseY = canvasHeight - 30 - this.baseRadius;
        if (!this._active) {
            this._thumbX = this.baseX;
            this._thumbY = this.baseY;
        }
    }

    /**
     * 检测触摸点是否命中摇杆区域
     * @param {number} tx — 触摸 X（Canvas 坐标）
     * @param {number} ty — 触摸 Y（Canvas 坐标）
     * @returns {boolean}
     */
    hitTest(tx, ty) {
        const dx = tx - this.baseX;
        const dy = ty - this.baseY;
        // 扩大命中区域到底盘半径的 1.5 倍，便于操作
        return (dx * dx + dy * dy) <= (this.baseRadius * 1.5) * (this.baseRadius * 1.5);
    }

    /**
     * 开始拖拽
     * @param {number} tx
     * @param {number} ty
     */
    onTouchStart(tx, ty) {
        this._active = true;
        this._updateThumb(tx, ty);
    }

    /**
     * 拖拽移动
     * @param {number} tx
     * @param {number} ty
     */
    onTouchMove(tx, ty) {
        if (!this._active) return;
        this._updateThumb(tx, ty);
    }

    /**
     * 释放
     */
    onTouchEnd() {
        this._active = false;
        this._thumbX = this.baseX;
        this._thumbY = this.baseY;
        this.axisX = 0;
        this.axisY = 0;
    }

    /**
     * 更新拇指位置和轴值
     * @private
     */
    _updateThumb(tx, ty) {
        let dx = tx - this.baseX;
        let dy = ty - this.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.baseRadius) {
            // 限制在底盘半径内
            dx = (dx / dist) * this.baseRadius;
            dy = (dy / dist) * this.baseRadius;
        }

        this._thumbX = this.baseX + dx;
        this._thumbY = this.baseY + dy;

        // 归一化
        this.axisX = dx / this.baseRadius;
        this.axisY = dy / this.baseRadius;
    }

    /**
     * 渲染摇杆
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.4;

        // 底盘
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#333333';
        ctx.fill();
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 拇指
        ctx.globalAlpha = this._active ? 0.7 : 0.5;
        ctx.beginPath();
        ctx.arc(this._thumbX, this._thumbY, this.thumbRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#AAAAAA';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}
