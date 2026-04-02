/**
 * InputManager — 统一输入管理器
 * Unity equivalent: UnityEngine.Input / 新 Input System
 * 
 * 抽象键盘和触屏输入，所有游戏逻辑通过此接口读取输入
 * 支持可配置键位绑定和 Provider 切换
 */

// ============================================================
// InputProvider 接口定义（供 Phase 4 触屏扩展）
// Unity: InputSystem.InputActionAsset
// ============================================================

/**
 * @typedef {object} InputProvider
 * @property {function(): void} update - 每帧刷新
 * @property {function(string): number} getAxis - 获取轴值 -1~1
 * @property {function(string): boolean} getKey - 是否按住
 * @property {function(string): boolean} getKeyDown - 本帧按下
 * @property {function(string): boolean} getKeyUp - 本帧松开
 */

// ============================================================
// KeyboardInputProvider — 键盘输入实现
// ============================================================

const DEFAULT_BINDINGS = {
    moveUp: 'KeyW',
    moveDown: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    pause: 'Escape'
};

/** @type {Object<string, string>} 默认 action → keyCode 绑定（Unity: InputAction bindings） */
const DEFAULT_ACTION_BINDINGS = {
    activeSkill: 'Space',
    pause: 'Escape'
};

const STORAGE_KEY = 'keyBindings';
const ACTION_STORAGE_KEY = 'actionBindings';

class KeyboardInputProvider {
    constructor() {
        /** @type {Map<string, boolean>} 当前帧按键状态 */
        this._keys = new Map();
        /** @type {Map<string, boolean>} 本帧刚按下 */
        this._keysDown = new Map();
        /** @type {Map<string, boolean>} 本帧刚松开 */
        this._keysUp = new Map();
        /** @type {Set<string>} 帧间新按下的键 */
        this._pendingDown = new Set();
        /** @type {Set<string>} 帧间新松开的键 */
        this._pendingUp = new Set();

        /** @type {object} 键位绑定 movement → keyCode */
        this._bindings = this._loadBindings();

        /** @type {object} action → keyCode 绑定（Unity: InputActionMap） */
        this._actionBindings = this._loadActionBindings();

        /** @type {string} 设备类型标识 */
        this.deviceType = 'keyboard';

        // 监听 DOM 事件
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    _onKeyDown(e) {
        if (!this._keys.get(e.code)) {
            this._pendingDown.add(e.code);
        }
        this._keys.set(e.code, true);
        // 阻止浏览器默认行为（如空格滚动页面）
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    }

    _onKeyUp(e) {
        this._keys.set(e.code, false);
        this._pendingUp.add(e.code);
    }

    /** 每帧开始时调用，刷新 keyDown/keyUp 状态 */
    update() {
        this._keysDown.clear();
        this._keysUp.clear();
        for (const key of this._pendingDown) {
            this._keysDown.set(key, true);
        }
        for (const key of this._pendingUp) {
            this._keysUp.set(key, true);
        }
        this._pendingDown.clear();
        this._pendingUp.clear();
    }

    /**
     * 获取轴值，支持对角归一化
     * Unity: Input.GetAxis("Horizontal") / Input.GetAxis("Vertical")
     * @param {string} axisName - 'horizontal' | 'vertical'
     * @returns {number} -1 ~ 1
     */
    getAxis(axisName) {
        let x = 0;
        let y = 0;

        const upKey = this._bindings.moveUp;
        const downKey = this._bindings.moveDown;
        const leftKey = this._bindings.moveLeft;
        const rightKey = this._bindings.moveRight;

        if (this._keys.get(leftKey)) x -= 1;
        if (this._keys.get(rightKey)) x += 1;
        if (this._keys.get(upKey)) y -= 1;    // 屏幕坐标系向上为负
        if (this._keys.get(downKey)) y += 1;

        // 对角归一化
        const len = Math.sqrt(x * x + y * y);
        if (len > 0) {
            x /= len;
            y /= len;
        }

        if (axisName === 'horizontal') return x;
        if (axisName === 'vertical') return y;
        return 0;
    }

    /**
     * 当前帧是否按住
     * Unity: Input.GetKey(keyCode)
     * @param {string} keyCode
     * @returns {boolean}
     */
    getKey(keyCode) {
        return this._keys.get(keyCode) || false;
    }

    /**
     * 本帧是否刚按下
     * Unity: Input.GetKeyDown(keyCode)
     * @param {string} keyCode
     * @returns {boolean}
     */
    getKeyDown(keyCode) {
        return this._keysDown.get(keyCode) || false;
    }

    /**
     * 本帧是否刚松开
     * Unity: Input.GetKeyUp(keyCode)
     * @param {string} keyCode
     * @returns {boolean}
     */
    getKeyUp(keyCode) {
        return this._keysUp.get(keyCode) || false;
    }

    // ---- 键位绑定管理 ----

    /**
     * 修改键位绑定
     * @param {string} action - 动作名 (moveUp/moveDown/moveLeft/moveRight/pause)
     * @param {string} keyCode - 新的按键代码
     */
    setBinding(action, keyCode) {
        if (action in this._bindings) {
            this._bindings[action] = keyCode;
            this._saveBindings();
        }
    }

    /**
     * 恢复默认键位
     */
    resetToDefault() {
        this._bindings = { ...DEFAULT_BINDINGS };
        this._saveBindings();
    }

    /**
     * 获取当前键位绑定（只读副本）
     * @returns {object}
     */
    getBindings() {
        return { ...this._bindings };
    }

    _loadBindings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_BINDINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('[InputManager] Failed to load key bindings:', e);
        }
        return { ...DEFAULT_BINDINGS };
    }

    _saveBindings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._bindings));
        } catch (e) {
            console.warn('[InputManager] Failed to save key bindings:', e);
        }
    }

    // ---- Action 接口（P4 新增 — Unity: InputAction） ----

    /**
     * 获取 action 是否激活（持续按住）
     * Unity: InputAction.IsPressed()
     * @param {string} actionName
     * @returns {boolean}
     */
    getAction(actionName) {
        const keyCode = this._actionBindings[actionName];
        if (!keyCode) return false;
        return this._keys.get(keyCode) || false;
    }

    /**
     * 本帧 action 是否刚触发
     * Unity: InputAction.WasPressedThisFrame()
     * @param {string} actionName
     * @returns {boolean}
     */
    getActionDown(actionName) {
        const keyCode = this._actionBindings[actionName];
        if (!keyCode) return false;
        return this._keysDown.get(keyCode) || false;
    }

    /**
     * 本帧 action 是否刚结束
     * Unity: InputAction.WasReleasedThisFrame()
     * @param {string} actionName
     * @returns {boolean}
     */
    getActionUp(actionName) {
        const keyCode = this._actionBindings[actionName];
        if (!keyCode) return false;
        return this._keysUp.get(keyCode) || false;
    }

    /**
     * 修改 action 绑定
     * @param {string} actionName
     * @param {string} keyCode
     */
    setActionBinding(actionName, keyCode) {
        if (actionName in this._actionBindings) {
            this._actionBindings[actionName] = keyCode;
            this._saveActionBindings();
        }
    }

    /**
     * 获取当前 action 绑定（只读副本）
     * @returns {object}
     */
    getActionBindings() {
        return { ...this._actionBindings };
    }

    /**
     * 恢复所有绑定为默认值（包括 movement + action）
     */
    resetToDefault() {
        this._bindings = { ...DEFAULT_BINDINGS };
        this._actionBindings = { ...DEFAULT_ACTION_BINDINGS };
        this._saveBindings();
        this._saveActionBindings();
    }

    /**
     * 键盘模式无需渲染 UI（空实现）
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        // 键盘模式不渲染虚拟控件
    }

    // ---- Action 绑定持久化 ----

    _loadActionBindings() {
        try {
            const stored = localStorage.getItem(ACTION_STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_ACTION_BINDINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('[InputManager] Failed to load action bindings:', e);
        }
        return { ...DEFAULT_ACTION_BINDINGS };
    }

    _saveActionBindings() {
        try {
            localStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(this._actionBindings));
        } catch (e) {
            console.warn('[InputManager] Failed to save action bindings:', e);
        }
    }

    /** 清理 DOM 监听（销毁时调用） */
    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}

// ============================================================
// InputManager 单例
// ============================================================

export class InputManager {
    constructor() {
        /** @type {InputProvider} 当前输入 Provider */
        this._provider = new KeyboardInputProvider();
    }

    /**
     * 每帧开始时调用
     */
    update() {
        this._provider.update();
    }

    /**
     * 获取轴值
     * Unity: Input.GetAxis(axisName)
     * @param {string} axisName
     * @returns {number}
     */
    getAxis(axisName) {
        return this._provider.getAxis(axisName);
    }

    /**
     * 当前是否按住
     * Unity: Input.GetKey(keyCode)
     * @param {string} keyCode
     * @returns {boolean}
     */
    getKey(keyCode) {
        return this._provider.getKey(keyCode);
    }

    /**
     * 本帧是否刚按下
     * Unity: Input.GetKeyDown(keyCode)
     * @param {string} keyCode
     * @returns {boolean}
     */
    getKeyDown(keyCode) {
        return this._provider.getKeyDown(keyCode);
    }

    /**
     * 本帧是否刚松开
     * Unity: Input.GetKeyUp(keyCode)
     * @param {string} keyCode
     * @returns {boolean}
     */
    getKeyUp(keyCode) {
        return this._provider.getKeyUp(keyCode);
    }

    // ---- P4 新增：Action 抽象层代理 ----

    /**
     * 获取 action 是否激活
     * Unity: InputAction.IsPressed()
     * @param {string} actionName
     * @returns {boolean}
     */
    getAction(actionName) {
        if (this._provider.getAction) {
            return this._provider.getAction(actionName);
        }
        return false;
    }

    /**
     * 本帧 action 是否刚触发
     * Unity: InputAction.WasPressedThisFrame()
     * @param {string} actionName
     * @returns {boolean}
     */
    getActionDown(actionName) {
        if (this._provider.getActionDown) {
            return this._provider.getActionDown(actionName);
        }
        return false;
    }

    /**
     * 本帧 action 是否刚结束
     * Unity: InputAction.WasReleasedThisFrame()
     * @param {string} actionName
     * @returns {boolean}
     */
    getActionUp(actionName) {
        if (this._provider.getActionUp) {
            return this._provider.getActionUp(actionName);
        }
        return false;
    }

    /**
     * 渲染触屏 UI（代理到 Provider）
     * 键盘模式下为空操作，触屏模式绘制摇杆和按钮
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (this._provider.render) {
            this._provider.render(ctx);
        }
    }

    /**
     * 获取当前设备类型
     * @returns {'keyboard' | 'touch'}
     */
    getCurrentDeviceType() {
        return this._provider.deviceType || 'keyboard';
    }

    // ---- Provider 管理 ----

    /**
     * 切换输入 Provider（Phase 4 触屏扩展时使用）
     * @param {InputProvider} provider
     */
    setProvider(provider) {
        if (this._provider.dispose) {
            this._provider.dispose();
        }
        this._provider = provider;
    }

    /**
     * 切换回键盘 Provider（便捷方法）
     */
    useKeyboard() {
        this.setProvider(new KeyboardInputProvider());
    }

    /**
     * 修改键位绑定（代理到 Provider）
     * @param {string} action
     * @param {string} keyCode
     */
    setBinding(action, keyCode) {
        if (this._provider.setBinding) {
            this._provider.setBinding(action, keyCode);
        }
    }

    /**
     * 修改 action 绑定（P4 新增）
     * @param {string} actionName
     * @param {string} keyCode
     */
    setActionBinding(actionName, keyCode) {
        if (this._provider.setActionBinding) {
            this._provider.setActionBinding(actionName, keyCode);
        }
    }

    /**
     * 恢复默认键位（包括 movement + action 绑定）
     */
    resetToDefault() {
        if (this._provider.resetToDefault) {
            this._provider.resetToDefault();
        }
    }

    /**
     * 获取当前键位绑定
     * @returns {object}
     */
    getBindings() {
        if (this._provider.getBindings) {
            return this._provider.getBindings();
        }
        return {};
    }

    /**
     * 获取当前 action 绑定
     * @returns {object}
     */
    getActionBindings() {
        if (this._provider.getActionBindings) {
            return this._provider.getActionBindings();
        }
        return {};
    }

    /** 清理资源 */
    dispose() {
        if (this._provider.dispose) {
            this._provider.dispose();
        }
    }
}
