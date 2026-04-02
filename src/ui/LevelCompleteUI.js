import { addClickOrTouch } from '../utils/addClickOrTouch.js';

/**
 * LevelCompleteUI — 关卡通关覆盖层
 * Unity equivalent: Level Complete Panel UI
 */
export class LevelCompleteUI {
    constructor(config = {}) {
        this.ctx = config.ctx;
        this.canvas = config.canvas;
        this.sceneManager = config.sceneManager;
        this.gameLoop = config.gameLoop;

        /** @type {boolean} */
        this.isShowing = false;

        /** @type {object|null} 通关数据 */
        this._data = null;

        /** @type {Function|null} */
        this._onClick = null;

        /** @type {Array} 按钮区域 */
        this._btnRects = [];
    }

    /**
     * 显示通关 UI
     * @param {object} data — { levelId, levelName, nextLevelId, killCount }
     */
    show(data) {
        this._data = data;
        this.isShowing = true;

        // 联网模式不暂停游戏循环（需要继续接收网络消息）
        if (this.gameLoop && !data?.isOnline) {
            this.gameLoop.pause();
        }

        // 注册点击（兼容触屏）
        if (this.canvas && !this._cleanupClick) {
            this._cleanupClick = addClickOrTouch(this.canvas, (pos) => this._handleClick(pos));
        }
    }

    /**
     * 渲染
     * @param {CanvasRenderingContext2D} [ctxOverride]
     */
    render(ctxOverride) {
        if (!this.isShowing || !this._data) return;
        const ctx = ctxOverride || this.ctx;
        if (!ctx) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.save();

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, cw, ch);

        // 面板
        const panelW = 400;
        const panelH = 280;
        const px = (cw - panelW) / 2;
        const py = (ch - panelH) / 2;

        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(px, py, panelW, panelH);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(px, py, panelW, panelH);

        // 标题
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎉 关卡完成！', cw / 2, py + 40);

        // 关卡名
        ctx.font = '18px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this._data.levelName || '', cw / 2, py + 75);

        // 统计
        ctx.font = '14px monospace';
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText(`击杀数: ${this._data.killCount || 0}`, cw / 2, py + 110);

        // 按钮
        this._btnRects = [];
        const btnW = 160;
        const btnH = 42;

        const isAutoTransition = this._data.nextLevelId === '__auto__';

        if (isAutoTransition) {
            // 联网中间关卡：服务端自动切关，显示等待提示
            ctx.font = '16px monospace';
            ctx.fillStyle = '#AAFFAA';
            ctx.fillText('⏳ 即将进入下一关...', cw / 2, py + 150);
        } else if (this._data.nextLevelId) {
            // 下一关按钮（单人模式）
            const nx = cw / 2 - btnW - 10;
            const ny = py + panelH - 70;
            ctx.fillStyle = '#2ECC71';
            ctx.fillRect(nx, ny, btnW, btnH);
            ctx.font = 'bold 15px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('▶ 下一关', nx + btnW / 2, ny + btnH / 2);
            this._btnRects.push({ x: nx, y: ny, w: btnW, h: btnH, action: 'next' });

            // 返回选角
            const rx = cw / 2 + 10;
            ctx.fillStyle = '#3498DB';
            ctx.fillRect(rx, ny, btnW, btnH);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('🏠 返回选角', rx + btnW / 2, ny + btnH / 2);
            this._btnRects.push({ x: rx, y: ny, w: btnW, h: btnH, action: 'select' });
        } else {
            // 全部通关
            ctx.font = 'bold 20px monospace';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('✨ 全部通关！', cw / 2, py + 150);

            const rx = (cw - btnW) / 2;
            const ry = py + panelH - 70;
            ctx.fillStyle = '#3498DB';
            ctx.fillRect(rx, ry, btnW, btnH);
            ctx.font = 'bold 15px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('🏠 返回选角', rx + btnW / 2, ry + btnH / 2);
            this._btnRects.push({ x: rx, y: ry, w: btnW, h: btnH, action: 'select' });
        }

        ctx.restore();
    }

    /** @private */
    async _handleClick(pos) {
        if (!this.isShowing) return;

        const mx = pos.x;
        const my = pos.y;

        for (const btn of this._btnRects) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                if (btn.action === 'next' && this.sceneManager) {
                    this.sceneManager.sceneData.levelId = this._data.nextLevelId;
                    this.isShowing = false;
                    if (this.gameLoop) this.gameLoop.resume();
                    this.sceneManager.loadScene('battle');
                } else if (btn.action === 'select' && this.sceneManager) {
                    this.isShowing = false;
                    if (this.gameLoop) this.gameLoop.resume();
                    // 清除残留关卡数据，防止下局从错误关卡开始
                    delete this.sceneManager.sceneData.levelId;
                    // 联网模式：断开连接
                    if (this._data?.isOnline) {
                        try {
                            const { NetworkManager } = await import('../systems/NetworkManager.js');
                            NetworkManager.getInstance().disconnect();
                        } catch(e) { /* ignore */ }
                    }
                    this.sceneManager.loadScene('character-select');
                }
                return;
            }
        }
    }

    dispose() {
        if (this.canvas && this._onClick) {
            this.canvas.removeEventListener('click', this._onClick);
            this._onClick = null;
        }
    }
}