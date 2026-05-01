import { TransformComponent } from '../components/TransformComponent.js';

/**
 * Entity — 游戏实体，组件的容器
 * Unity equivalent: public class GameObject
 * 
 * 每个 Entity 拥有唯一 id，自动包含 TransformComponent
 */

let _nextId = 1;

export class Entity {
    /**
     * @param {string} [name='Entity'] - 实体名称 Unity: gameObject.name
     * @param {string} [tag=''] - 标签 Unity: gameObject.tag
     */
    constructor(name = 'Entity', tag = '') {
        /** @type {number} 唯一标识符 Unity: gameObject.GetInstanceID() */
        this.id = _nextId++;

        /** @type {string} 实体名称 Unity: gameObject.name */
        this.name = name;

        /** @type {string} 标签 Unity: gameObject.tag */
        this.tag = tag;

        /** @type {boolean} 是否激活 Unity: gameObject.activeSelf */
        this.active = true;

        /** @type {boolean} 标记待销毁（内部使用） */
        this._pendingDestroy = false;

        /* Network: 联机时由服务器分配的全局唯一 ID */
        /** @type {string|null} 网络 ID */
        this.networkId = null;

        /* Network: 'local' 表示本机拥有，联机时为玩家 ID */
        /** @type {string} 实体所有者 */
        this.ownerId = 'local';

        /** @type {Component[]} 组件列表 */
        this._components = [];

        /** @type {TransformComponent} Transform 快捷引用 Unity: transform */
        this._transform = new TransformComponent();
        this.addComponent(this._transform);
    }

    /**
     * Transform 快捷访问
     * Unity: gameObject.transform
     * @returns {TransformComponent}
     */
    get transform() {
        return this._transform;
    }

    /**
     * 添加组件
     * Unity: gameObject.AddComponent<T>()
     * @param {import('./Component.js').Component} component
     * @returns {import('./Component.js').Component} 返回添加的组件
     */
    addComponent(component) {
        component.entity = this;
        this._components.push(component);
        return component;
    }

    /**
     * 按类型获取组件
     * Unity: gameObject.GetComponent<T>()
     * @param {Function} ComponentClass
     * @returns {import('./Component.js').Component|null}
     */
    getComponent(ComponentClass) {
        for (const comp of this._components) {
            if (comp instanceof ComponentClass) {
                return comp;
            }
        }
        return null;
    }

    /**
     * 获取所有指定类型的组件
     * Unity: gameObject.GetComponents<T>()
     * @param {Function} ComponentClass
     * @returns {import('./Component.js').Component[]}
     */
    getComponents(ComponentClass) {
        return this._components.filter(comp => comp instanceof ComponentClass);
    }

    /**
     * 检查是否拥有指定类型组件
     * @param {Function} ComponentClass
     * @returns {boolean}
     */
    hasComponent(ComponentClass) {
        return this.getComponent(ComponentClass) !== null;
    }

    /**
     * 移除指定类型组件
     * Unity: Destroy(gameObject.GetComponent<T>())
     * @param {Function} ComponentClass
     * @returns {boolean} 是否成功移除
     */
    removeComponent(ComponentClass) {
        // 不允许移除 TransformComponent
        if (ComponentClass === TransformComponent) {
            console.warn('[Entity] Cannot remove TransformComponent');
            return false;
        }

        const index = this._components.findIndex(comp => comp instanceof ComponentClass);
        if (index !== -1) {
            const comp = this._components[index];
            comp.onDestroy();
            comp.entity = null;
            this._components.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 更新所有组件（由 EntityManager 调用）
     * @param {number} deltaTime
     */
    updateComponents(deltaTime) {
        if (!this.active || this._pendingDestroy) return;

        for (const comp of this._components) {
            if (!comp.enabled) continue;

            // 确保 start() 在第一次 update() 前调用
            if (!comp._started) {
                comp.start();
                comp._started = true;
            }

            comp.update(deltaTime);
        }
    }

    /**
     * 销毁实体，调用所有组件的 onDestroy
     */
    destroy() {
        for (const comp of this._components) {
            comp.onDestroy();
            comp.entity = null;
        }
        this._components = [];
        this.active = false;
    }
}
