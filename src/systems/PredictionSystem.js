/**
 * PredictionSystem — 客户端预测 & 服务器校正系统
 * Unity equivalent: ClientNetworkTransform (Prediction Mode)
 *
 * 核心流程：
 * 1. 每帧将本地输入立即应用到本地玩家位置（无延迟感）
 * 2. 同时将输入发送给 Server
 * 3. Server 确认后比对位置偏差，偏差过大则回滚+重放
 *
 * 详见 Gabriel Gambetta 系列文章:
 *   https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
 */

import { NetworkManager } from './NetworkManager.js';

/** 输入缓冲区大小（环形数组） */
const BUFFER_SIZE = 128;

/** 位置偏差阈值 (px)，超过则触发回滚 */
const CORRECTION_THRESHOLD = 4;

/** 回滚后平滑插值因子（0=不插值直接跳, 1=完全跟随预测）*/
const SMOOTH_FACTOR = 0.3;

export class PredictionSystem {
    /**
     * @param {import('./PhysicsSystem.js').PhysicsSystem} physicsSystem - 本地物理系统（用于重放碰撞）
     */
    constructor(physicsSystem) {
        /** @type {import('./PhysicsSystem.js').PhysicsSystem} */
        this._physics = physicsSystem;

        /** 当前序列号 */
        this._seq = 0;

        /**
         * 输入缓冲区（环形数组）
         * 每条记录: { seq, dx, dy, dt, predictedX, predictedY }
         * @type {Array<{seq:number, dx:number, dy:number, dt:number, predictedX:number, predictedY:number}|null>}
         */
        this._buffer = new Array(BUFFER_SIZE).fill(null);

        /** 最后一个 server 确认的 seq */
        this._lastConfirmedSeq = -1;

        /** 是否激活（online 模式才激活） */
        this._active = false;

        /** 本地玩家实体引用 */
        this._localEntity = null;

        /** 本地玩家移动速度 */
        this._moveSpeed = 200;

        /** 平滑修正：当前渲染偏移量 */
        this._smoothOffsetX = 0;
        this._smoothOffsetY = 0;

        /** 统计：总回滚次数 */
        this.reconciliationCount = 0;
    }

    // ============================================================
    // 生命周期
    // ============================================================

    /**
     * 激活预测系统（进入 online 模式时调用）
     * @param {object} localEntity - 本地玩家实体（必须有 transform.position）
     * @param {number} moveSpeed - 移动速度
     */
    activate(localEntity, moveSpeed) {
        this._active = true;
        this._localEntity = localEntity;
        this._moveSpeed = moveSpeed;
        this._seq = 0;
        this._lastConfirmedSeq = -1;
        this._buffer.fill(null);
        this._smoothOffsetX = 0;
        this._smoothOffsetY = 0;
        this.reconciliationCount = 0;

        console.log('[PredictionSystem] Activated');
    }

    /**
     * 停用预测系统（回到 offline 模式时调用）
     */
    deactivate() {
        this._active = false;
        this._localEntity = null;
        this._buffer.fill(null);
        console.log('[PredictionSystem] Deactivated');
    }

    /**
     * 重置缓冲区（关卡切换时调用，保持 active 状态）
     */
    reset() {
        this._buffer.fill(null);
        this._seq = 0;
        this._lastConfirmedSeq = 0;
        this._smoothOffsetX = 0;
        this._smoothOffsetY = 0;
        this.reconciliationCount = 0;
        console.log('[PredictionSystem] Reset (level change)');
    }

    // ============================================================
    // 每帧更新（由 BattleScene 在 update 中调用）
    // ============================================================

    /**
     * 处理本地玩家输入：预测 + 发送
     * @param {number} dx - 归一化方向 X (-1~1)
     * @param {number} dy - 归一化方向 Y (-1~1)
     * @param {number} dt - 帧时间 (秒)
     */
    processInput(dx, dy, dt) {
        if (!this._active || !this._localEntity) return;

        const entity = this._localEntity;
        const pos = entity.transform.position;

        // 1. 递增序列号
        this._seq++;
        const seq = this._seq;

        // 2. 本地预测：立即应用输入
        let predictedX = pos.x + dx * this._moveSpeed * dt;
        let predictedY = pos.y + dy * this._moveSpeed * dt;

        // 3. 应用本地物理碰撞（与 Server 端逻辑一致）
        if (this._physics && typeof this._physics.resolveMovement === 'function') {
            const resolved = this._physics.resolveMovement(
                pos.x, pos.y, predictedX, predictedY, entity
            );
            predictedX = resolved.x;
            predictedY = resolved.y;
        }

        // 4. 更新本地实体位置
        pos.x = predictedX;
        pos.y = predictedY;

        // 5. 存入输入缓冲区
        const idx = seq % BUFFER_SIZE;
        this._buffer[idx] = {
            seq,
            dx,
            dy,
            dt,
            predictedX,
            predictedY
        };

        // 6. 发送给 Server
        const netMgr = NetworkManager.getInstance();
        netMgr.send('input', { seq, dx, dy, dt });
    }

    // ============================================================
    // Server 校正（收到 state update 时调用）
    // ============================================================

    /**
     * 执行 Server Reconciliation
     * 当 Server 的 PlayerState 更新时调用此方法
     *
     * @param {number} confirmedSeq - Server 最后处理的输入序号 (PlayerState.inputSeq)
     * @param {number} confirmedX - Server 确认的 X 位置
     * @param {number} confirmedY - Server 确认的 Y 位置
     */
    reconcile(confirmedSeq, confirmedX, confirmedY) {
        if (!this._active || !this._localEntity) return;

        // 服务端从未处理过 input（inputSeq 仍为初始值 0），跳过
        if (confirmedSeq === 0) return;

        // 忽略旧的确认（可能乱序）
        if (confirmedSeq <= this._lastConfirmedSeq) return;
        this._lastConfirmedSeq = confirmedSeq;

        // 1. 找到对应的缓冲记录
        const confirmedIdx = confirmedSeq % BUFFER_SIZE;
        const confirmedInput = this._buffer[confirmedIdx];

        // 2. 检查偏差
        let needsCorrection = false;
        if (confirmedInput && confirmedInput.seq === confirmedSeq) {
            const diffX = Math.abs(confirmedInput.predictedX - confirmedX);
            const diffY = Math.abs(confirmedInput.predictedY - confirmedY);

            if (diffX > CORRECTION_THRESHOLD || diffY > CORRECTION_THRESHOLD) {
                needsCorrection = true;
                this.reconciliationCount++;
                console.warn(`[Prediction] Correction #${this.reconciliationCount}: seq=${confirmedSeq} diff=(${diffX.toFixed(1)}, ${diffY.toFixed(1)}) predicted=(${confirmedInput.predictedX.toFixed(1)},${confirmedInput.predictedY.toFixed(1)}) server=(${confirmedX.toFixed(1)},${confirmedY.toFixed(1)}) local=(${this._localEntity.transform.position.x.toFixed(1)},${this._localEntity.transform.position.y.toFixed(1)})`);
            }
        } else {
            // 缓冲区已覆盖，直接修正
            needsCorrection = true;
            this.reconciliationCount++;
            console.warn(`[Prediction] Correction (buffer miss) #${this.reconciliationCount}: seq=${confirmedSeq} server=(${confirmedX.toFixed(1)},${confirmedY.toFixed(1)}) local=(${this._localEntity.transform.position.x.toFixed(1)},${this._localEntity.transform.position.y.toFixed(1)})`);
        }

        // 3. 丢弃已确认的输入
        for (let i = 0; i < BUFFER_SIZE; i++) {
            const entry = this._buffer[i];
            if (entry && entry.seq <= confirmedSeq) {
                this._buffer[i] = null;
            }
        }

        // 4. 如果需要修正：回滚到 Server 位置 + 重放未确认输入
        if (needsCorrection) {
            this._rollbackAndReplay(confirmedX, confirmedY, confirmedSeq);
        }
    }

    /**
     * 回滚到 Server 确认位置，并重放所有未确认的输入
     * @private
     */
    _rollbackAndReplay(serverX, serverY, confirmedSeq) {
        if (!this._localEntity) return;

        const pos = this._localEntity.transform.position;

        // 保存当前预测位置（用于平滑过渡）
        const prevPredictedX = pos.x;
        const prevPredictedY = pos.y;

        // 回滚到 Server 位置
        let replayX = serverX;
        let replayY = serverY;

        // 收集所有未确认的输入，按 seq 排序
        const pendingInputs = [];
        for (let i = 0; i < BUFFER_SIZE; i++) {
            const entry = this._buffer[i];
            if (entry && entry.seq > confirmedSeq) {
                pendingInputs.push(entry);
            }
        }
        pendingInputs.sort((a, b) => a.seq - b.seq);

        // 重放每个未确认的输入
        for (const input of pendingInputs) {
            let newX = replayX + input.dx * this._moveSpeed * input.dt;
            let newY = replayY + input.dy * this._moveSpeed * input.dt;

            // 应用物理碰撞
            if (this._physics && typeof this._physics.resolveMovement === 'function') {
                const resolved = this._physics.resolveMovement(
                    replayX, replayY, newX, newY, this._localEntity
                );
                newX = resolved.x;
                newY = resolved.y;
            }

            // 更新缓冲记录的预测位置
            input.predictedX = newX;
            input.predictedY = newY;

            replayX = newX;
            replayY = newY;
        }

        // 应用平滑修正：不直接跳到重放结果，而是用 smooth 过渡
        // smoothOffset = 上一帧渲染位置 - 新的逻辑位置
        this._smoothOffsetX = prevPredictedX - replayX;
        this._smoothOffsetY = prevPredictedY - replayY;

        // 更新实体到重放后的逻辑位置
        pos.x = replayX;
        pos.y = replayY;
    }

    // ============================================================
    // 渲染平滑（每帧在渲染前调用）
    // ============================================================

    /**
     * 获取渲染偏移量（用于平滑修正过渡）
     * 每帧将偏移量衰减，实现视觉上的平滑过渡
     * @param {number} dt - 帧时间 (秒)
     * @returns {{ offsetX: number, offsetY: number }}
     */
    getRenderOffset(dt) {
        if (!this._active) {
            return { offsetX: 0, offsetY: 0 };
        }

        // 指数衰减平滑
        const decay = Math.pow(SMOOTH_FACTOR, dt * 60);
        this._smoothOffsetX *= decay;
        this._smoothOffsetY *= decay;

        // 足够小则归零
        if (Math.abs(this._smoothOffsetX) < 0.5) this._smoothOffsetX = 0;
        if (Math.abs(this._smoothOffsetY) < 0.5) this._smoothOffsetY = 0;

        return {
            offsetX: this._smoothOffsetX,
            offsetY: this._smoothOffsetY
        };
    }

    // ============================================================
    // 工具方法
    // ============================================================

    /**
     * 获取当前缓冲区中未确认的输入数量
     * @returns {number}
     */
    getPendingInputCount() {
        let count = 0;
        for (let i = 0; i < BUFFER_SIZE; i++) {
            if (this._buffer[i] !== null) count++;
        }
        return count;
    }

    /**
     * 获取当前序列号
     * @returns {number}
     */
    getCurrentSeq() {
        return this._seq;
    }

    /**
     * 是否处于激活状态
     * @returns {boolean}
     */
    get isActive() {
        return this._active;
    }
}
