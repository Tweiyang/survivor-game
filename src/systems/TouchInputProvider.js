import { VirtualJoystick } from '../ui/VirtualJoystick.js';
import { VirtualButton } from '../ui/VirtualButton.js';

/**
 * TouchInputProvider — 触屏输入实现
 * Unity equivalent: TouchInputModule / On-Screen Controls
 *
 * 管理虚拟摇杆和虚拟按钮，实现 InputProvider 接口。
 * 支持多点触控：每个 touch.identifier 绑定到一个控件。
 */
export class TouchInputProvider {
    /**
     * @param {HTMLCanvasElement} canvas — 游戏画布（用于注册 touch 事件）
     */
    constructor(canvas) {
        /** @type {string} 设备类型标识 */
        this.deviceType = 'touch';

        /** @type {HTMLCanvasElement} */
        this._canvas = canvas;

        // ---- 创建虚拟控件（默认布局） ----
        const cw = canvas.width;
        const ch = canvas.height;

        /** @type {VirtualJoystick} 移动摇杆（左下角） */
        this.joystick = new VirtualJoystick({
            baseX: 30 + 60,
            baseY: ch - 30 - 60,
            baseRadius: 60,
            thumbRadius: 24
        });
        this.joystick.updateLayout(cw, ch);

        /** @type {VirtualButton[]} 虚拟按钮列表 */
        this.buttons = [];

        // 右下角：主动技能按钮
        this._skillButton = new VirtualButton({
            x: cw - 80,
            y: ch - 80,
            radius: 35,
            icon: '⚡',
            actionName: 'activeSkill',
            color: '#E67E22'
        });
        this.buttons.push(this._skillButton);

        // 右上角：暂停按钮
        this._pauseButton = new VirtualButton({
            x: cw - 40,
            y: 40,
            radius: 22,
            icon: '⏸',
            actionName: 'pause',
            color: '#7F8C8D'
        });
        this.buttons.push(this._pauseButton);

        /** @type {Map<number, object>} touchId → 绑定的控件 */
        this._touchTracker = new Map();

        // ---- 注册 touch 事件 ----
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        this._onTouchCancel = this._onTouchCancel.bind(this);

        canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
        canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', this._onTouchCancel, { passive: false });
    }

    // ============================================================
    // InputProvider 接口实现
    // ============================================================

    /** 每帧刷新帧状态 */
    update() {
        for (const btn of this.buttons) {
            btn.update();
        }
    }

    /**
     * 获取轴值
     * @param {string} axisName — 'horizontal' | 'vertical'
     * @returns {number}
     */
    getAxis(axisName) {
        if (axisName === 'horizontal') return this.joystick.axisX;
        if (axisName === 'vertical') return this.joystick.axisY;
        return 0;
    }

    /**
     * 触屏不支持裸 keyCode 查询，总是返回 false
     * @param {string} keyCode
     * @returns {boolean}
     */
    getKey(keyCode) {
        return false;
    }

    /** @param {string} keyCode @returns {boolean} */
    getKeyDown(keyCode) {
        return false;
    }

    /** @param {string} keyCode @returns {boolean} */
    getKeyUp(keyCode) {
        return false;
    }

    /**
     * 获取 action 是否激活（按住）
     * @param {string} actionName
     * @returns {boolean}
     */
    getAction(actionName) {
        for (const btn of this.buttons) {
            if (btn.actionName === actionName) return btn.isPressed;
        }
        return false;
    }

    /**
     * 本帧 action 是否刚触发
     * @param {string} actionName
     * @returns {boolean}
     */
    getActionDown(actionName) {
        for (const btn of this.buttons) {
            if (btn.actionName === actionName) return btn.wasJustPressed;
        }
        return false;
    }

    /**
     * 本帧 action 是否刚结束
     * @param {string} actionName
     * @returns {boolean}
     */
    getActionUp(actionName) {
        for (const btn of this.buttons) {
            if (btn.actionName === actionName) return btn.wasJustReleased;
        }
        return false;
    }

    /**
     * 渲染所有虚拟控件
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        this.joystick.render(ctx);
        for (const btn of this.buttons) {
            btn.render(ctx);
        }
    }

    // ============================================================
    // 布局更新（resize 时调用）
    // ============================================================

    /**
     * 更新所有控件位置
     * @param {number} cw — canvas 宽度
     * @param {number} ch — canvas 高度
     */
    updateLayout(cw, ch) {
        this.joystick.updateLayout(cw, ch);
        // 技能按钮 — 右下角
        this._skillButton.x = cw - 80;
        this._skillButton.y = ch - 80;
        // 暂停按钮 — 右上角
        this._pauseButton.x = cw - 40;
        this._pauseButton.y = 40;
    }

    // ============================================================
    // 多点触控处理
    // ============================================================

    /**
     * @private
     * @param {TouchEvent} e
     */
    _onTouchStart(e) {
        e.preventDefault();
        const rect = this._canvas.getBoundingClientRect();

        for (const touch of e.changedTouches) {
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            const id = touch.identifier;

            // 尝试命中按钮（优先于摇杆）
            let handled = false;
            for (const btn of this.buttons) {
                if (btn.hitTest(tx, ty)) {
                    btn.onTouchStart();
                    this._touchTracker.set(id, btn);
                    handled = true;
                    break;
                }
            }

            // 尝试命中摇杆
            if (!handled && this.joystick.hitTest(tx, ty)) {
                this.joystick.onTouchStart(tx, ty);
                this._touchTracker.set(id, this.joystick);
            }
        }
    }

    /**
     * @private
     * @param {TouchEvent} e
     */
    _onTouchMove(e) {
        e.preventDefault();
        const rect = this._canvas.getBoundingClientRect();

        for (const touch of e.changedTouches) {
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
            const id = touch.identifier;

            const control = this._touchTracker.get(id);
            if (control && control.onTouchMove) {
                control.onTouchMove(tx, ty);
            }
        }
    }

    /**
     * @private
     * @param {TouchEvent} e
     */
    _onTouchEnd(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            const id = touch.identifier;
            const control = this._touchTracker.get(id);
            if (control) {
                control.onTouchEnd();
                this._touchTracker.delete(id);
            }
        }
    }

    /**
     * @private
     * @param {TouchEvent} e
     */
    _onTouchCancel(e) {
        // 全部重置
        this.joystick.onTouchEnd();
        for (const btn of this.buttons) {
            btn.onTouchEnd();
        }
        this._touchTracker.clear();
    }

    // ============================================================
    // 键位绑定（触屏模式不支持，空实现）
    // ============================================================

    setBinding() {}
    resetToDefault() {}
    getBindings() { return {}; }
    setActionBinding() {}
    getActionBindings() { return {}; }

    /** 清理 touch 事件监听 */
    dispose() {
        this._canvas.removeEventListener('touchstart', this._onTouchStart);
        this._canvas.removeEventListener('touchmove', this._onTouchMove);
        this._canvas.removeEventListener('touchend', this._onTouchEnd);
        this._canvas.removeEventListener('touchcancel', this._onTouchCancel);
    }
}
