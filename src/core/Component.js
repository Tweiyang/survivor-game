/**
 * Component 基类 — 所有游戏组件的父类
 * Unity equivalent: public abstract class MonoBehaviour : Behaviour
 * 
 * 生命周期:
 *   constructor(config) → Awake() + [SerializeField]
 *   start()            → Start()
 *   update(deltaTime)  → Update()
 *   onDestroy()        → OnDestroy()
 */
export class Component {
    /**
     * @param {object} config - 配置参数，模拟 Unity 的 [SerializeField] 字段
     */
    constructor(config = {}) {
        /** @type {import('./Entity.js').Entity|null} 所属实体引用 Unity: gameObject */
        this.entity = null;

        /** @type {boolean} 是否启用，disabled 时不调用 update() Unity: enabled */
        this.enabled = true;

        /** @type {boolean} start() 是否已调用（内部标记） */
        this._started = false;
    }

    /**
     * 首帧前调用一次，可安全引用其他组件
     * Unity: void Start()
     */
    start() {
        // 子类重写
    }

    /**
     * 每帧调用
     * Unity: void Update()
     * @param {number} deltaTime - 帧间隔时间（秒）
     */
    update(deltaTime) {
        // 子类重写
    }

    /**
     * 组件/实体被销毁时调用
     * Unity: void OnDestroy()
     */
    onDestroy() {
        // 子类重写
    }

    /**
     * 碰撞回调 — 首次碰撞
     * Unity: void OnCollisionEnter2D(Collision2D)
     * @param {import('./Entity.js').Entity} other
     */
    onCollisionEnter(other) {
        // 子类重写
    }

    /**
     * 碰撞回调 — 持续碰撞
     * Unity: void OnCollisionStay2D(Collision2D)
     * @param {import('./Entity.js').Entity} other
     */
    onCollisionStay(other) {
        // 子类重写
    }

    /**
     * 碰撞回调 — 离开碰撞
     * Unity: void OnCollisionExit2D(Collision2D)
     * @param {import('./Entity.js').Entity} other
     */
    onCollisionExit(other) {
        // 子类重写
    }

    /**
     * 触发器回调 — 首次进入
     * Unity: void OnTriggerEnter2D(Collider2D)
     * @param {import('./Entity.js').Entity} other
     */
    onTriggerEnter(other) {
        // 子类重写
    }

    /**
     * 触发器回调 — 持续停留
     * Unity: void OnTriggerStay2D(Collider2D)
     * @param {import('./Entity.js').Entity} other
     */
    onTriggerStay(other) {
        // 子类重写
    }

    /**
     * 触发器回调 — 离开触发区域
     * Unity: void OnTriggerExit2D(Collider2D)
     * @param {import('./Entity.js').Entity} other
     */
    onTriggerExit(other) {
        // 子类重写
    }

    /**
     * 获取同实体上的其他组件（快捷方法）
     * Unity: GetComponent<T>()
     * @param {Function} ComponentClass
     * @returns {Component|null}
     */
    getComponent(ComponentClass) {
        /* Unity: GetComponent<T>() */
        return this.entity ? this.entity.getComponent(ComponentClass) : null;
    }

    /**
     * 获取 Transform 快捷访问
     * Unity: transform
     */
    get transform() {
        /* Unity: this.transform */
        return this.entity ? this.entity.transform : null;
    }
}
