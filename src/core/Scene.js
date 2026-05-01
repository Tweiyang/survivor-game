/**
 * Scene — 场景基类
 * Unity equivalent: Scene + 场景初始化脚本
 * 
 * 每个关卡/场景继承此类，实现 init/update/destroy
 */
export class Scene {
    /**
     * @param {string} name - 场景名称
     * @param {object} systems - 游戏系统引用
     * @param {import('./EntityManager.js').EntityManager} systems.entityManager
     * @param {import('../systems/PhysicsSystem.js').PhysicsSystem} systems.physicsSystem
     * @param {import('../systems/CameraSystem.js').CameraSystem} systems.camera
     * @param {import('../systems/InputManager.js').InputManager} systems.inputManager
     * @param {import('./EventSystem.js').EventSystem} systems.eventSystem
     */
    constructor(name, systems) {
        /** @type {string} 场景名称 */
        this.name = name;

        /** @type {object} 系统引用 */
        this.systems = systems;
    }

    /**
     * 场景初始化 — 创建实体、设置地图等
     * Unity: Awake() / Start() 阶段
     */
    init() {
        // 子类重写
    }

    /**
     * 场景级逻辑更新（波次控制、胜负判定等）
     * Unity: Update() 中的场景管理逻辑
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // 子类重写
    }

    /**
     * 场景销毁 — 清理所有资源
     * Unity: OnDestroy()
     */
    destroy() {
        // 子类重写
    }
}
