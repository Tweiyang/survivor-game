/**
 * DeviceDetector — 设备类型自动检测
 * Unity equivalent: InputSystem.GetDevice<Touchscreen>()
 *
 * 启动时检测 + 运行时切换的双保险机制。
 */
export class DeviceDetector {
    constructor() {
        /** @type {'keyboard' | 'touch'} 当前设备类型 */
        this._deviceType = 'keyboard';

        /** @type {Function[]} 设备切换回调列表 */
        this._callbacks = [];

        /** @type {Function|null} */
        this._onFirstTouch = null;
        /** @type {Function|null} */
        this._onFirstMouse = null;
    }

    /**
     * 执行初始检测
     * @returns {'keyboard' | 'touch'}
     */
    detect() {
        const hasCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const hasTouchPoints = navigator.maxTouchPoints > 0;

        if (hasCoarsePointer && hasTouchPoints) {
            this._deviceType = 'touch';
        } else {
            this._deviceType = 'keyboard';
        }

        console.log(`[DeviceDetector] Initial detection: ${this._deviceType} (coarse=${hasCoarsePointer}, touchPoints=${navigator.maxTouchPoints})`);
        return this._deviceType;
    }

    /**
     * 注册运行时切换监听（双保险）
     * 监听首次 touchstart → 切换到 touch
     * 监听首次 mousemove → 切换到 keyboard
     */
    startRuntimeDetection() {
        this._onFirstTouch = () => {
            if (this._deviceType !== 'touch') {
                console.log('[DeviceDetector] Runtime switch: keyboard → touch');
                this._deviceType = 'touch';
                this._notifyCallbacks();
            }
            // 重新注册 mouse 监听（以支持反复切换）
            this._registerMouseListener();
        };

        this._onFirstMouse = () => {
            if (this._deviceType !== 'keyboard') {
                console.log('[DeviceDetector] Runtime switch: touch → keyboard');
                this._deviceType = 'keyboard';
                this._notifyCallbacks();
            }
            // 重新注册 touch 监听
            this._registerTouchListener();
        };

        this._registerTouchListener();
        this._registerMouseListener();
    }

    /** @private */
    _registerTouchListener() {
        if (this._onFirstTouch) {
            window.addEventListener('touchstart', this._onFirstTouch, { once: true, passive: true });
        }
    }

    /** @private */
    _registerMouseListener() {
        if (this._onFirstMouse) {
            window.addEventListener('mousemove', this._onFirstMouse, { once: true });
        }
    }

    /**
     * 注册设备切换回调
     * @param {function('keyboard' | 'touch'): void} callback
     */
    onDeviceChange(callback) {
        this._callbacks.push(callback);
    }

    /**
     * 获取当前设备类型
     * @returns {'keyboard' | 'touch'}
     */
    getCurrentType() {
        return this._deviceType;
    }

    /** @private */
    _notifyCallbacks() {
        for (const cb of this._callbacks) {
            try {
                cb(this._deviceType);
            } catch (e) {
                console.error('[DeviceDetector] Callback error:', e);
            }
        }
    }

    /** 清理监听 */
    dispose() {
        if (this._onFirstTouch) {
            window.removeEventListener('touchstart', this._onFirstTouch);
        }
        if (this._onFirstMouse) {
            window.removeEventListener('mousemove', this._onFirstMouse);
        }
        this._callbacks = [];
    }
}
