/**
 * CameraSystem — 摄像机系统
 * Unity equivalent: public class Camera : Behaviour
 * 
 * 支持跟随目标、平滑插值、坐标转换
 */
export class CameraSystem {
    /**
     * @param {number} viewportWidth - 视口宽度（Canvas 宽度）
     * @param {number} viewportHeight - 视口高度（Canvas 高度）
     */
    constructor(viewportWidth, viewportHeight) {
        /** @type {{x: number, y: number}} 摄像机世界坐标（中心点）Unity: Camera.main.transform.position */
        this.position = { x: 0, y: 0 };

        /** @type {number} 视口宽度 */
        this.viewportWidth = viewportWidth;

        /** @type {number} 视口高度 */
        this.viewportHeight = viewportHeight;

        /** @type {import('../core/Entity.js').Entity|null} 跟随目标 */
        this._target = null;

        /** @type {number} 平滑跟随速度 (0~1, 越大跟随越快) */
        this.smoothSpeed = 0.1;

        /** @type {{minX: number, minY: number, maxX: number, maxY: number}|null} 边界限制 */
        this.bounds = null;
    }

    /**
     * 设置跟随目标
     * @param {import('../core/Entity.js').Entity} entity
     */
    setTarget(entity) {
        this._target = entity;
    }

    /**
     * 设置摄像机边界（防止超出地图）
     * @param {number} minX
     * @param {number} minY
     * @param {number} maxX
     * @param {number} maxY
     */
    setBounds(minX, minY, maxX, maxY) {
        this.bounds = { minX, minY, maxX, maxY };
    }

    /**
     * 更新视口尺寸（窗口大小改变时调用）
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }

    /**
     * 每帧更新摄像机位置
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (!this._target || !this._target.active) return;

        const targetPos = this._target.transform.position;

        // 平滑插值跟随 (Lerp)
        // Unity: Vector3.Lerp(camera.position, target.position, smoothSpeed)
        this.position.x += (targetPos.x - this.position.x) * this.smoothSpeed;
        this.position.y += (targetPos.y - this.position.y) * this.smoothSpeed;

        // 边界限制
        if (this.bounds) {
            const halfW = this.viewportWidth / 2;
            const halfH = this.viewportHeight / 2;

            const mapW = this.bounds.maxX - this.bounds.minX;
            const mapH = this.bounds.maxY - this.bounds.minY;

            if (mapW <= this.viewportWidth) {
                // 地图比视口窄 → 锁定到地图中心
                this.position.x = this.bounds.minX + mapW / 2;
            } else {
                this.position.x = Math.max(this.bounds.minX + halfW,
                    Math.min(this.bounds.maxX - halfW, this.position.x));
            }

            if (mapH <= this.viewportHeight) {
                // 地图比视口矮 → 锁定到地图中心
                this.position.y = this.bounds.minY + mapH / 2;
            } else {
                this.position.y = Math.max(this.bounds.minY + halfH,
                    Math.min(this.bounds.maxY - halfH, this.position.y));
            }
        }
    }

    /**
     * 世界坐标转屏幕坐标
     * Unity: Camera.main.WorldToScreenPoint(worldPos)
     * @param {{x: number, y: number}} worldPos
     * @returns {{x: number, y: number}}
     */
    worldToScreen(worldPos) {
        return {
            x: worldPos.x - this.position.x + this.viewportWidth / 2,
            y: worldPos.y - this.position.y + this.viewportHeight / 2
        };
    }

    /**
     * 屏幕坐标转世界坐标
     * Unity: Camera.main.ScreenToWorldPoint(screenPos)
     * @param {{x: number, y: number}} screenPos
     * @returns {{x: number, y: number}}
     */
    screenToWorld(screenPos) {
        return {
            x: screenPos.x + this.position.x - this.viewportWidth / 2,
            y: screenPos.y + this.position.y - this.viewportHeight / 2
        };
    }

    /**
     * 判断世界坐标是否在视口内
     * @param {{x: number, y: number}} worldPos
     * @param {number} [margin=0] - 边距
     * @returns {boolean}
     */
    isInView(worldPos, margin = 0) {
        const screen = this.worldToScreen(worldPos);
        return screen.x >= -margin && screen.x <= this.viewportWidth + margin &&
               screen.y >= -margin && screen.y <= this.viewportHeight + margin;
    }

    /**
     * 立即移动摄像机到目标位置（无平滑）
     */
    snapToTarget() {
        if (this._target && this._target.active) {
            this.position.x = this._target.transform.position.x;
            this.position.y = this._target.transform.position.y;
        }
    }
}
