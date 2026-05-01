/**
 * GameLoop — 游戏主循环
 * Unity equivalent: Unity PlayerLoop（Update → LateUpdate → Render）
 * 
 * 基于 requestAnimationFrame 驱动
 * 每帧按 Input → Update → Physics → Cleanup → Render 顺序执行
 */
export class GameLoop {
    /**
     * @param {object} config
     * @param {import('../systems/InputManager.js').InputManager} config.inputManager
     * @param {import('./EntityManager.js').EntityManager} config.entityManager
     * @param {import('../systems/PhysicsSystem.js').PhysicsSystem} config.physicsSystem
     * @param {import('../systems/RenderSystem.js').RenderSystem} config.renderSystem
     * @param {import('../systems/CameraSystem.js').CameraSystem} config.camera
     * @param {import('./SceneManager.js').SceneManager} config.sceneManager
     * @param {import('../map/TilemapRenderer.js').TilemapRenderer} config.tilemapRenderer
     * @param {CanvasRenderingContext2D} config.ctx
     * @param {HTMLCanvasElement} config.canvas
     */
    constructor(config) {
        this._inputManager = config.inputManager;
        this._entityManager = config.entityManager;
        this._physicsSystem = config.physicsSystem;
        this._renderSystem = config.renderSystem;
        this._camera = config.camera;
        this._sceneManager = config.sceneManager;
        this._tilemapRenderer = config.tilemapRenderer;
        this._ctx = config.ctx;
        this._canvas = config.canvas;

        /** @type {boolean} 是否正在运行 */
        this._running = false;

        /** @type {boolean} 是否暂停（暂停时 update 不执行，render 仍绘制） */
        this._paused = false;

        /** @type {number} 上一帧时间戳 */
        this._lastTime = 0;

        /** @type {number} 帧率计数 */
        this._frameCount = 0;
        this._fpsTime = 0;
        this._fps = 0;

        /** @type {number} requestAnimationFrame ID */
        this._rafId = 0;

        /** @type {Function|null} 调试信息绘制回调 */
        this.onDebugRender = null;

        // 绑定循环方法
        this._loop = this._loop.bind(this);
    }

    /**
     * 启动游戏循环
     * Unity: Application.isPlaying = true
     */
    start() {
        if (this._running) return;
        this._running = true;
        this._lastTime = performance.now();
        this._rafId = requestAnimationFrame(this._loop);
        console.log('[GameLoop] Started');
    }

    /**
     * 停止游戏循环
     */
    stop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = 0;
        }
        console.log('[GameLoop] Stopped');
    }

    /**
     * 暂停（update 停止，render 继续）
     * Unity: Time.timeScale = 0
     */
    pause() {
        this._paused = true;
        console.log('[GameLoop] Paused');
    }

    /**
     * 恢复
     * Unity: Time.timeScale = 1
     */
    resume() {
        this._paused = false;
        this._lastTime = performance.now();
        console.log('[GameLoop] Resumed');
    }

    /**
     * 获取当前 FPS
     * @returns {number}
     */
    get fps() {
        return this._fps;
    }

    /**
     * 游戏是否暂停
     * @returns {boolean}
     */
    get isPaused() {
        return this._paused;
    }

    /**
     * 主循环
     * @private
     * @param {number} timestamp
     */
    _loop(timestamp) {
        if (!this._running) return;

        // 计算 deltaTime（秒），clamp 到最大 0.1s
        let deltaTime = (timestamp - this._lastTime) / 1000;
        deltaTime = Math.min(deltaTime, 0.1);
        this._lastTime = timestamp;

        // FPS 计算
        this._frameCount++;
        this._fpsTime += deltaTime;
        if (this._fpsTime >= 1.0) {
            this._fps = this._frameCount;
            this._frameCount = 0;
            this._fpsTime -= 1.0;
        }

        // ======== UPDATE PHASE ========
        if (!this._paused) {
            // 1. 输入采集
            this._inputManager.update();

            // 2. 场景级更新
            this._sceneManager.update(deltaTime);

            // 3. 实体组件更新
            this._entityManager.updateAll(deltaTime);

            // 4. 物理检测
            this._physicsSystem.update();

            // 5. 摄像机更新
            this._camera.update(deltaTime);

            // 6. 延迟销毁
            this._entityManager.cleanup();
        }

        // ======== RENDER PHASE ========
        // 1. 清屏
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._ctx.fillStyle = '#1a1a2e';
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

        // 2. 绘制瓦片地图
        if (this._tilemapRenderer) {
            this._tilemapRenderer.render(this._camera);
        }

        // 3. 绘制精灵（按排序）
        this._renderSystem.render();

        // 4. 调试信息叠加层
        if (this.onDebugRender) {
            this.onDebugRender(this._ctx, deltaTime);
        }

        // 请求下一帧
        this._rafId = requestAnimationFrame(this._loop);
    }
}
