/**
 * SceneManager — 场景管理器（单例）
 * Unity equivalent: UnityEngine.SceneManagement.SceneManager
 * 
 * 管理场景的注册、加载和切换
 */
export class SceneManager {
    /**
     * @param {object} systems - 游戏系统引用（传递给场景）
     */
    constructor(systems) {
        /** @type {object} 系统引用 */
        this._systems = systems;

        /** @type {Map<string, Function>} 注册的场景类 */
        this._scenes = new Map();

        /** @type {import('./Scene.js').Scene|null} 当前活跃场景 */
        this._currentScene = null;

        /** @type {string|null} 当前场景名称 */
        this._currentSceneName = null;

        /**
         * 场景间共享数据（Unity: DontDestroyOnLoad 单例 / ScriptableObject 数据容器）
         * loadScene 时不清空，由场景自行读取
         * @type {object}
         */
        this.sceneData = {};
    }

    /**
     * 注册场景类
     * @param {string} sceneName
     * @param {Function} SceneClass - Scene 子类的构造函数
     */
    register(sceneName, SceneClass) {
        this._scenes.set(sceneName, SceneClass);
    }

    /**
     * 加载指定场景（支持 async init）
     * Unity: SceneManager.LoadScene(sceneName)
     * @param {string} sceneName
     */
    async loadScene(sceneName) {
        const SceneClass = this._scenes.get(sceneName);
        if (!SceneClass) {
            console.error(`[SceneManager] Scene '${sceneName}' not registered`);
            return;
        }

        // 销毁当前场景
        if (this._currentScene) {
            this._currentScene.destroy();
        }

        // 清空所有实体
        this._systems.entityManager.clear();

        // 创建并初始化新场景
        this._currentSceneName = sceneName;
        this._currentScene = new SceneClass(sceneName, this._systems);

        // 支持异步 init（如 fetch 加载配置）
        try {
            await this._currentScene.init();
        } catch (e) {
            console.error(`[SceneManager] Scene '${sceneName}' init failed:`, e);
        }

        console.log(`[SceneManager] Loaded scene: ${sceneName}`);
    }

    /**
     * 获取当前活跃场景
     * Unity: SceneManager.GetActiveScene()
     * @returns {import('./Scene.js').Scene|null}
     */
    get currentScene() {
        return this._currentScene;
    }

    /**
     * 获取当前活跃场景（兼容旧代码）
     * @returns {import('./Scene.js').Scene|null}
     */
    getCurrentScene() {
        return this._currentScene;
    }

    /**
     * 获取当前场景名称
     * @returns {string|null}
     */
    getCurrentSceneName() {
        return this._currentSceneName;
    }

    /**
     * 重新加载当前场景
     */
    restart() {
        if (this._currentSceneName) {
            this.loadScene(this._currentSceneName);
        }
    }

    /**
     * 清空场景间共享数据
     */
    clearSceneData() {
        this.sceneData = {};
    }

    /**
     * 更新当前场景
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (this._currentScene) {
            this._currentScene.update(deltaTime);
        }
    }
}
