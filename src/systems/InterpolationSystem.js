/**
 * InterpolationSystem — 远程实体插值系统
 * Unity equivalent: NetworkTransform (Interpolation Mode)
 *
 * 为远程玩家、怪物等非本地实体提供平滑的位置插值。
 * Server 以 20Hz (50ms) 发送状态更新，客户端以 60fps 渲染，
 * 通过在两个快照之间做线性插值实现平滑移动。
 *
 * 渲染延迟默认 100ms：始终渲染"过去"的状态，
 * 保证缓冲区中有足够数据做插值。
 */

/** 状态缓冲区容量 */
const SNAPSHOT_BUFFER_SIZE = 6;

/** 默认渲染延迟 (毫秒) */
const DEFAULT_RENDER_DELAY = 100;

/**
 * 单个实体的状态快照
 * @typedef {{ x: number, y: number, timestamp: number, [key: string]: any }} Snapshot
 */

export class InterpolationSystem {
    constructor() {
        /**
         * 实体ID → 快照缓冲区
         * @type {Map<string, Snapshot[]>}
         */
        this._buffers = new Map();

        /** 渲染延迟 (ms) */
        this._renderDelay = DEFAULT_RENDER_DELAY;

        /** 是否激活 */
        this._active = false;

        /** Server 时间基准（用于同步时间戳） */
        this._serverTimeOffset = 0;
    }

    // ============================================================
    // 生命周期
    // ============================================================

    /** 激活插值系统 */
    activate() {
        this._active = true;
        this._buffers.clear();
        console.log('[InterpolationSystem] Activated');
    }

    /** 停用插值系统 */
    deactivate() {
        this._active = false;
        this._buffers.clear();
        console.log('[InterpolationSystem] Deactivated');
    }

    /**
     * 设置渲染延迟
     * @param {number} delayMs - 延迟毫秒数
     */
    setRenderDelay(delayMs) {
        this._renderDelay = delayMs;
    }

    // ============================================================
    // 快照推送（Server 状态更新时调用）
    // ============================================================

    /**
     * 推送一个实体的新状态快照
     * @param {string} entityId - 网络实体 ID（与 Server Schema key 对应）
     * @param {number} x - X 坐标
     * @param {number} y - Y 坐标
     * @param {number} [timestamp] - Server 时间戳 (ms)，不传则用本地时间
     * @param {object} [extraData] - 附加数据（hp, alive, direction 等）
     */
    pushSnapshot(entityId, x, y, timestamp, extraData) {
        if (!this._active) return;

        // 获取或创建缓冲区
        let buffer = this._buffers.get(entityId);
        if (!buffer) {
            buffer = [];
            this._buffers.set(entityId, buffer);
        }

        const snapshot = {
            x,
            y,
            timestamp: timestamp || performance.now(),
            ...extraData
        };

        buffer.push(snapshot);

        // 保持缓冲区大小
        while (buffer.length > SNAPSHOT_BUFFER_SIZE) {
            buffer.shift();
        }
    }

    // ============================================================
    // 插值计算（每帧渲染前调用）
    // ============================================================

    /**
     * 获取实体在当前渲染时间的插值位置
     * @param {string} entityId - 网络实体 ID
     * @returns {{ x: number, y: number, found: boolean, extraData: object|null }}
     */
    getInterpolatedPosition(entityId) {
        if (!this._active) {
            return { x: 0, y: 0, found: false, extraData: null };
        }

        const buffer = this._buffers.get(entityId);
        if (!buffer || buffer.length === 0) {
            return { x: 0, y: 0, found: false, extraData: null };
        }

        // 1 个快照：直接 snap
        if (buffer.length === 1) {
            const snap = buffer[0];
            return {
                x: snap.x,
                y: snap.y,
                found: true,
                extraData: this._extractExtra(snap)
            };
        }

        // 渲染时间 = 当前时间 - 渲染延迟
        const renderTime = performance.now() - this._renderDelay;

        // 找到两个包围 renderTime 的快照
        let prev = null;
        let next = null;

        for (let i = 0; i < buffer.length - 1; i++) {
            if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
                prev = buffer[i];
                next = buffer[i + 1];
                break;
            }
        }

        // 没有找到包围的快照
        if (!prev || !next) {
            // renderTime 在所有快照之前：snap 到最早快照
            if (renderTime < buffer[0].timestamp) {
                const snap = buffer[0];
                return {
                    x: snap.x,
                    y: snap.y,
                    found: true,
                    extraData: this._extractExtra(snap)
                };
            }

            // renderTime 在所有快照之后（buffer underrun）：
            // 停在最后已知位置，不做外推
            const snap = buffer[buffer.length - 1];
            return {
                x: snap.x,
                y: snap.y,
                found: true,
                extraData: this._extractExtra(snap)
            };
        }

        // 线性插值
        const totalTime = next.timestamp - prev.timestamp;
        const t = totalTime > 0 ? (renderTime - prev.timestamp) / totalTime : 0;
        const clampedT = Math.max(0, Math.min(1, t));

        const interpX = prev.x + (next.x - prev.x) * clampedT;
        const interpY = prev.y + (next.y - prev.y) * clampedT;

        // extraData 取 next 的（更新的状态）
        return {
            x: interpX,
            y: interpY,
            found: true,
            extraData: this._extractExtra(next)
        };
    }

    /**
     * 批量更新所有被追踪实体的本地实体位置
     * @param {import('../core/EntityManager.js').EntityManager} entityManager
     * @param {string} [tagFilter] - 仅更新带有此 tag 的实体（如 'remote_player', 'monster'）
     */
    updateEntities(entityManager, tagFilter) {
        if (!this._active) return;

        this._buffers.forEach((buffer, entityId) => {
            // 查找本地实体
            const entity = entityManager.findByTag(entityId) || entityManager.findById(entityId);
            if (!entity) return;

            // 可选 tag 过滤
            if (tagFilter && !entity.tags?.includes(tagFilter)) return;

            const result = this.getInterpolatedPosition(entityId);
            if (result.found) {
                entity.transform.position.x = result.x;
                entity.transform.position.y = result.y;
            }
        });
    }

    // ============================================================
    // 实体管理
    // ============================================================

    /**
     * 移除实体的快照缓冲区
     * @param {string} entityId
     */
    removeEntity(entityId) {
        this._buffers.delete(entityId);
    }

    /**
     * 清空所有缓冲区
     */
    clear() {
        this._buffers.clear();
    }

    /**
     * 获取被追踪的实体数量
     * @returns {number}
     */
    getTrackedCount() {
        return this._buffers.size;
    }

    /**
     * 获取指定实体的缓冲区快照数量
     * @param {string} entityId
     * @returns {number}
     */
    getBufferSize(entityId) {
        const buffer = this._buffers.get(entityId);
        return buffer ? buffer.length : 0;
    }

    // ============================================================
    // 内部辅助
    // ============================================================

    /**
     * 从快照中提取附加数据（排除 x, y, timestamp）
     * @param {Snapshot} snapshot
     * @returns {object|null}
     * @private
     */
    _extractExtra(snapshot) {
        const { x, y, timestamp, ...extra } = snapshot;
        return Object.keys(extra).length > 0 ? extra : null;
    }

    /**
     * 是否处于激活状态
     * @returns {boolean}
     */
    get isActive() {
        return this._active;
    }
}
