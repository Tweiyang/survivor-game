import { SpriteRenderer } from '../components/SpriteRenderer.js';

/**
 * RenderSystem — 渲染管线
 * Unity equivalent: Unity 内置渲染管线（Sorting Layer + Order in Layer）
 * 
 * 负责收集所有 SpriteRenderer，按层级排序后统一绘制
 */
export class RenderSystem {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('./CameraSystem.js').CameraSystem} camera
     * @param {import('../core/EntityManager.js').EntityManager} entityManager
     */
    constructor(ctx, camera, entityManager) {
        /** @type {CanvasRenderingContext2D} */
        this._ctx = ctx;

        /** @type {import('./CameraSystem.js').CameraSystem} */
        this._camera = camera;

        /** @type {import('../core/EntityManager.js').EntityManager} */
        this._entityManager = entityManager;
    }

    /**
     * 每帧渲染
     * Unity: 渲染管线自动按 Sorting Layer / Order 排序绘制
     */
    render() {
        const entities = this._entityManager.findByComponent(SpriteRenderer);

        // 收集所有需要渲染的 SpriteRenderer
        const renderables = [];
        for (const entity of entities) {
            if (!entity.active) continue;
            const sr = entity.getComponent(SpriteRenderer);
            if (sr && sr.visible && sr.enabled) {
                renderables.push({ entity, sr });
            }
        }

        // 排序: sortingLayer ASC → sortingOrder ASC → Y ASC（Y大的后绘制，实现伪深度）
        renderables.sort((a, b) => {
            if (a.sr.sortingLayer !== b.sr.sortingLayer) {
                return a.sr.sortingLayer - b.sr.sortingLayer;
            }
            if (a.sr.sortingOrder !== b.sr.sortingOrder) {
                return a.sr.sortingOrder - b.sr.sortingOrder;
            }
            return a.entity.transform.position.y - b.entity.transform.position.y;
        });

        // 计算摄像机偏移
        const cameraOffset = {
            x: this._camera.position.x - this._camera.viewportWidth / 2,
            y: this._camera.position.y - this._camera.viewportHeight / 2
        };

        // 绘制所有精灵
        for (const { sr } of renderables) {
            sr.render(this._ctx, cameraOffset);
        }
    }
}
