/**
 * EntityManager — 全局实体管理器（单例）
 * Unity equivalent: Object.FindObjectsOfType / GameObject.Find 等静态方法的集合
 * 
 * 负责管理所有活跃实体的注册、查找、更新和延迟销毁
 */
export class EntityManager {
    constructor() {
        /** @type {import('./Entity.js').Entity[]} 所有活跃实体 */
        this._entities = [];

        /** @type {import('./Entity.js').Entity[]} 待销毁队列 */
        this._destroyQueue = [];
    }

    /**
     * 注册实体
     * Unity: Instantiate() 后自动注册
     * @param {import('./Entity.js').Entity} entity
     * @returns {import('./Entity.js').Entity}
     */
    add(entity) {
        this._entities.push(entity);
        return entity;
    }

    /**
     * 标记实体为待销毁（延迟到帧末）
     * Unity: Destroy(gameObject)
     * @param {import('./Entity.js').Entity} entity
     */
    remove(entity) {
        if (!entity._pendingDestroy) {
            entity._pendingDestroy = true;
            this._destroyQueue.push(entity);
        }
    }

    /**
     * 按 tag 查找第一个匹配的实体
     * Unity: GameObject.FindWithTag(tag)
     * @param {string} tag
     * @returns {import('./Entity.js').Entity|null}
     */
    findByTag(tag) {
        for (const entity of this._entities) {
            if (entity.tag === tag && entity.active && !entity._pendingDestroy) {
                return entity;
            }
        }
        return null;
    }

    /**
     * 按 tag 查找所有匹配的实体
     * Unity: GameObject.FindGameObjectsWithTag(tag)
     * @param {string} tag
     * @returns {import('./Entity.js').Entity[]}
     */
    findAllByTag(tag) {
        return this._entities.filter(
            e => e.tag === tag && e.active && !e._pendingDestroy
        );
    }

    /**
     * 按组件类型查找所有拥有该组件的实体
     * Unity: Object.FindObjectsOfType<T>()
     * @param {Function} ComponentClass
     * @returns {import('./Entity.js').Entity[]}
     */
    findByComponent(ComponentClass) {
        return this._entities.filter(
            e => e.active && !e._pendingDestroy && e.hasComponent(ComponentClass)
        );
    }

    /**
     * 按名称查找实体
     * Unity: GameObject.Find(name)
     * @param {string} name
     * @returns {import('./Entity.js').Entity|null}
     */
    findByName(name) {
        for (const entity of this._entities) {
            if (entity.name === name && entity.active && !entity._pendingDestroy) {
                return entity;
            }
        }
        return null;
    }

    /**
     * 更新所有实体的所有组件
     * @param {number} deltaTime
     */
    updateAll(deltaTime) {
        for (const entity of this._entities) {
            entity.updateComponents(deltaTime);
        }
    }

    /**
     * 执行延迟销毁，清理标记为待销毁的实体
     * 在每帧的 update 循环结束后调用
     */
    cleanup() {
        if (this._destroyQueue.length === 0) return;

        for (const entity of this._destroyQueue) {
            entity.destroy();
            const index = this._entities.indexOf(entity);
            if (index !== -1) {
                this._entities.splice(index, 1);
            }
        }
        this._destroyQueue = [];
    }

    /**
     * 清除所有实体（场景切换时使用）
     */
    clear() {
        for (const entity of this._entities) {
            entity.destroy();
        }
        this._entities = [];
        this._destroyQueue = [];
    }

    /**
     * 获取活跃实体数量
     * @returns {number}
     */
    get count() {
        return this._entities.filter(e => e.active && !e._pendingDestroy).length;
    }

    /**
     * 获取所有活跃实体（只读）
     * @returns {import('./Entity.js').Entity[]}
     */
    get entities() {
        return this._entities;
    }
}
