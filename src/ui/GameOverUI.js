import { AudioManager } from '../systems/AudioManager.js';
import { addClickOrTouch } from '../utils/addClickOrTouch.js';

/**
 * GameOverUI — 死亡结算界面
 * Unity equivalent: Canvas (Overlay) + Panel + Button
 *
 * 监听玩家 onDeath，显示遮罩 + 统计 + 重新开始按钮
 */
export class GameOverUI {
    /**
     * @param {object} config
     * @param {CanvasRenderingContext2D} config.ctx
     * @param {HTMLCanvasElement} config.canvas
     * @param {import('../core/EventSystem.js').EventSystem} config.eventSystem
     * @param {import('../systems/ExperienceSystem.js').ExperienceSystem} config.experienceSystem
     * @param {import('../core/GameLoop.js').GameLoop} config.gameLoop
     * @param {import('../core/SceneManager.js').SceneManager} config.sceneManager
     */
    constructor(config = {}) {
        this.ctx = config.ctx;
        this.canvas = config.canvas;
        this.eventSystem = config.eventSystem;
        this.experienceSystem = config.experienceSystem;
        this.gameLoop = config.gameLoop;
        this.sceneManager = config.sceneManager;

        /** @type {boolean} 是否显示 */
        this.isShowing = false;

        /** @type {number} 存活时间（秒）*/
        this.survivalTime = 0;

        /** @type {{x:number, y:number, w:number, h:number}} 重新开始按钮区域 */
        this._btnRect = { x: 0, y: 0, w: 0, h: 0 };

        // 绑定事件
        this._onDeath = this._onDeath.bind(this);
        this._onClick = this._onClick.bind(this);

        if (this.eventSystem) {
            this.eventSystem.on('onDeath', this._onDeath);
        }
    }

    /** @private 玩家死亡回调 */
    _onDeath(data) {
        // data 就是 entity 本身（HealthComponent.die() 直接 emit entity）
        const entity = data.entity || data;
        // 只响应玩家死亡
        if (entity && entity.tag !== 'player') return;

        this.isShowing = true;

        // 暂停游戏循环
        if (this.gameLoop) {
            this.gameLoop.stop();
        }

        // 停止 BGM（1 秒淡出）
        const audioMgr = AudioManager.getInstance();
        if (audioMgr) {
            audioMgr.stopBGM(1.0);
        }

        // 绑定点击事件（兼容触屏）
        if (this.canvas) {
            this._cleanupClick = addClickOrTouch(this.canvas, (pos) => this._onClick(pos));
        }

        // 立即绘制一次
        this.render();
    }

    /** @private 点击回调 */
    _onClick(pos) {
        if (!this.isShowing) return;

        const mx = pos.x;
        const my = pos.y;

        const btn = this._btnRect;
        if (mx >= btn.x && mx <= btn.x + btn.w &&
            my >= btn.y && my <= btn.y + btn.h) {
            this._restart();
        }
    }

    /** @private 重新开始 */
    _restart() {
        this.isShowing = false;

        // 移除点击监听
        if (this.canvas) {
            this.canvas.removeEventListener('click', this._onClick);
        }

        // 重置经验系统
        if (this.experienceSystem) {
            this.experienceSystem.reset();
        }

        // 重启场景
        if (this.sceneManager) {
            this.sceneManager.restart();
        }

        // 恢复游戏循环
        if (this.gameLoop) {
            this.gameLoop.start();
        }
    }

    /**
     * 更新存活时间（BattleScene 每帧调用）
     * @param {number} deltaTime
     */
    updateSurvivalTime(deltaTime) {
        if (!this.isShowing) {
            this.survivalTime += deltaTime;
        }
    }

    /**
     * 渲染死亡界面
     */
    render() {
        if (!this.isShowing || !this.ctx) return;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.save();

        // 半透明黑色遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, cw, ch);

        // GAME OVER 标题
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = '#E74C3C';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', cw / 2, ch / 2 - 80);

        // 统计信息
        const expSys = this.experienceSystem;
        const stats = [
            `Survival: ${this._formatTime(this.survivalTime)}`,
            `Kills: ${expSys ? expSys.killCount : 0}`,
            `Level: ${expSys ? expSys.level : 1}`
        ];

        ctx.font = '18px monospace';
        ctx.fillStyle = '#CCCCCC';
        let sy = ch / 2 - 20;
        for (const line of stats) {
            ctx.fillText(line, cw / 2, sy);
            sy += 30;
        }

        // 重新开始按钮
        const btnW = 200;
        const btnH = 44;
        const btnX = cw / 2 - btnW / 2;
        const btnY = ch / 2 + 60;

        this._btnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        // 按钮背景
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        // 按钮边框
        ctx.strokeStyle = '#27AE60';
        ctx.lineWidth = 2;
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        // 按钮文字
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('RESTART', cw / 2, btnY + btnH / 2);

        ctx.restore();
    }

    /**
     * 格式化秒数为 mm:ss
     * @private
     */
    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /** 清理 */
    dispose() {
        if (this.eventSystem) {
            this.eventSystem.off('onDeath', this._onDeath);
        }
        if (this.canvas) {
            this.canvas.removeEventListener('click', this._onClick);
        }
    }
}