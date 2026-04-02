/**
 * VirtualButton — 虚拟按钮 UI 组件
 * Unity equivalent: On-Screen Button (UI Canvas)
 *
 * 在 Canvas 上绘制可点按的圆形按钮，支持 touch 命中检测和冷却遮罩。
 */
export class VirtualButton {
    /**
     * @param {object} config
     * @param {number} config.x — 按钮中心 X
     * @param {number} config.y — 按钮中心 Y
     * @param {number} [config.radius=30] — 按钮半径
     * @param {string} [config.icon='?'] — 显示图标/文字
     * @param {string} config.actionName — 对应的 action 名称
     * @param {string} [config.color='#3498DB'] — 按钮颜色
     */
    constructor(config = {}) {
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.radius = config.radius || 30;
        this.icon = config.icon || '?';
        this.actionName = config.actionName || '';
        this.color = config.color || '#3498DB';

        /** @type {boolean} 当前是否按下 */
        this.isPressed = false;
        /** @type {boolean} 本帧刚按下 */
        this.wasJustPressed = false;
        /** @type {boolean} 本帧刚释放 */
        this.wasJustReleased = false;

        /** @type {number} 冷却百分比 0~1（外部设置，用于渲染遮罩） */
        this.cooldownPercent = 0;

        // 内部帧同步状态
        this._pendingPress = false;
        this._pendingRelease = false;
    }

    /**
     * 更新按钮位置（窗口 resize 时调用）
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    updateLayout(canvasWidth, canvasHeight) {
        // 由 TouchInputProvider 在创建时配置位置计算逻辑
        // 默认不自动调整（子类或外部调用时覆盖）
    }

    /**
     * 每帧刷新按下/释放状态
     */
    update() {
        this.wasJustPressed = this._pendingPress;
        this.wasJustReleased = this._pendingRelease;
        this._pendingPress = false;
        this._pendingRelease = false;
    }

    /**
     * 检测触摸点是否命中按钮
     * @param {number} tx
     * @param {number} ty
     * @returns {boolean}
     */
    hitTest(tx, ty) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        return (dx * dx + dy * dy) <= this.radius * this.radius;
    }

    /**
     * 触摸开始
     */
    onTouchStart() {
        if (!this.isPressed) {
            this._pendingPress = true;
        }
        this.isPressed = true;
    }

    /**
     * 触摸结束
     */
    onTouchEnd() {
        if (this.isPressed) {
            this._pendingRelease = true;
        }
        this.isPressed = false;
    }

    /**
     * 渲染按钮
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.isPressed ? 0.7 : 0.5;

        // 按钮底圈
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isPressed ? this._lightenColor(this.color) : this.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 冷却遮罩（扇形）
        if (this.cooldownPercent > 0) {
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + Math.PI * 2 * this.cooldownPercent;
            ctx.arc(this.x, this.y, this.radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fill();
        }

        // 图标
        ctx.globalAlpha = this.cooldownPercent > 0 ? 0.4 : 0.9;
        ctx.font = `${Math.round(this.radius * 0.8)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.icon, this.x, this.y);

        ctx.restore();
    }

    /**
     * 简单的颜色变亮
     * @private
     * @param {string} hex
     * @returns {string}
     */
    _lightenColor(hex) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 0xFF) + 40);
        const g = Math.min(255, ((num >> 8) & 0xFF) + 40);
        const b = Math.min(255, (num & 0xFF) + 40);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
}
