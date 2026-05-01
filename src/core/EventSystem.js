/**
 * EventSystem — 全局事件总线（发布/订阅模式）
 * Unity equivalent: UnityEvent / C# event delegate
 * 
 * 用于解耦游戏系统间的通信
 */
export class EventSystem {
    constructor() {
        /** @type {Map<string, Function[]>} 事件订阅映射 */
        this._listeners = new Map();
    }

    /**
     * 订阅事件
     * Unity: UnityEvent.AddListener(callback)
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(eventName, callback) {
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, []);
        }
        this._listeners.get(eventName).push(callback);
    }

    /**
     * 取消订阅事件
     * Unity: UnityEvent.RemoveListener(callback)
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 要移除的回调
     */
    off(eventName, callback) {
        const listeners = this._listeners.get(eventName);
        if (!listeners) return;

        const index = listeners.indexOf(callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this._listeners.delete(eventName);
        }
    }

    /**
     * 触发事件，按注册顺序通知所有订阅者
     * Unity: UnityEvent.Invoke(args)
     * @param {string} eventName - 事件名称
     * @param {...*} args - 传递给回调的参数
     */
    emit(eventName, ...args) {
        const listeners = this._listeners.get(eventName);
        if (!listeners) return;

        // 复制数组防止在回调中修改订阅列表导致问题
        const snapshot = [...listeners];
        for (const callback of snapshot) {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[EventSystem] Error in '${eventName}' handler:`, error);
            }
        }
    }

    /**
     * 订阅一次性事件（触发后自动取消订阅）
     * @param {string} eventName
     * @param {Function} callback
     */
    once(eventName, callback) {
        const wrapper = (...args) => {
            this.off(eventName, wrapper);
            callback(...args);
        };
        this.on(eventName, wrapper);
    }

    /**
     * 移除指定事件的所有订阅者
     * @param {string} eventName
     */
    removeAll(eventName) {
        if (eventName) {
            this._listeners.delete(eventName);
        } else {
            this._listeners.clear();
        }
    }
}
