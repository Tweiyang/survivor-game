import { SkillComponent } from '../components/SkillComponent.js';
import { SkillDatabase } from '../skills/SkillDatabase.js';
import { addClickOrTouch } from '../utils/addClickOrTouch.js';

/**
 * SkillSelectUI — 升级技能三选一弹窗
 * Unity equivalent: Canvas UI Panel（Overlay）
 *
 * 监听 onLevelUp 事件，暂停游戏，展示 3 个候选技能卡片供玩家选择。
 */
export class SkillSelectUI {
    /**
     * @param {object} config
     * @param {CanvasRenderingContext2D} config.ctx
     * @param {HTMLCanvasElement} config.canvas
     * @param {import('../core/EventSystem.js').EventSystem} config.eventSystem
     * @param {import('../core/GameLoop.js').GameLoop} config.gameLoop
     */
    constructor(config = {}) {
        this.ctx = config.ctx;
        this.canvas = config.canvas;
        this.eventSystem = config.eventSystem;
        this.gameLoop = config.gameLoop;

        /** @type {boolean} 是否显示 */
        this.isShowing = false;

        /** @type {SkillComponent|null} 当前玩家的 SkillComponent */
        this.skillComponent = null;

        /** @type {Array} 当前候选技能列表 */
        this.candidates = [];

        /** @type {Array<{x:number,y:number,w:number,h:number}>} 卡片点击区域 */
        this._cardRects = [];

        // 绑定
        this._onClick = this._onClick.bind(this);
    }

    /**
     * 设置玩家 SkillComponent 引用
     * @param {SkillComponent} skillComp
     */
    setSkillComponent(skillComp) {
        this.skillComponent = skillComp;
    }

    /**
     * 显示选择界面
     * @param {Array} [candidates] — 可选，不传则自动从 SkillComponent 获取
     */
    show(candidates) {
        if (!this.skillComponent) return;

        this.candidates = candidates || this.skillComponent.getAvailableSkills(3);

        if (this.candidates.length === 0) {
            // 没有可选技能，直接跳过
            console.log('[SkillSelectUI] No available skills to choose from');
            return;
        }

        this.isShowing = true;

        // 暂停游戏
        if (this.gameLoop) {
            this.gameLoop.pause();
        }

        // 绑定点击（兼容触屏）
        if (this.canvas) {
            this._cleanupClick = addClickOrTouch(this.canvas, (pos) => this._onClick(pos));
        }

        // 渲染一帧
        this.render();
    }

    /** @private */
    _onClick(pos) {
        if (!this.isShowing) return;

        const mx = pos.x;
        const my = pos.y;

        for (let i = 0; i < this._cardRects.length; i++) {
            const card = this._cardRects[i];
            if (mx >= card.x && mx <= card.x + card.w &&
                my >= card.y && my <= card.y + card.h) {
                this._selectSkill(i);
                return;
            }
        }
    }

    /** @private */
    _selectSkill(index) {
        const candidate = this.candidates[index];
        if (!candidate || !this.skillComponent) return;

        // 添加/升级技能
        this.skillComponent.addSkill(candidate.skillId);

        // 关闭界面
        this.hide();
    }

    /**
     * 隐藏界面并恢复游戏
     */
    hide() {
        this.isShowing = false;
        this.candidates = [];
        this._cardRects = [];

        if (this.canvas) {
            this.canvas.removeEventListener('click', this._onClick);
        }

        // 恢复游戏
        if (this.gameLoop) {
            this.gameLoop.resume();
        }
    }

    /**
     * 渲染选择界面
     */
    render() {
        if (!this.isShowing || !this.ctx) return;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.save();

        // 半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, cw, ch);

        // 标题
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LEVEL UP! 选择一个技能', cw / 2, ch / 2 - 160);

        // 卡片布局
        const cardW = 180;
        const cardH = 240;
        const gap = 20;
        const totalW = this.candidates.length * cardW + (this.candidates.length - 1) * gap;
        const startX = (cw - totalW) / 2;
        const cardY = ch / 2 - cardH / 2 + 10;

        this._cardRects = [];

        for (let i = 0; i < this.candidates.length; i++) {
            const candidate = this.candidates[i];
            const cardX = startX + i * (cardW + gap);

            this._cardRects.push({ x: cardX, y: cardY, w: cardW, h: cardH });

            this._renderCard(ctx, cardX, cardY, cardW, cardH, candidate);
        }

        ctx.restore();
    }

    /**
     * 渲染单张技能卡片
     * @private
     */
    _renderCard(ctx, x, y, w, h, candidate) {
        const config = candidate.config;
        const isUpgrade = candidate.isUpgrade;
        const currentLevel = candidate.currentLevel;
        const nextLevel = currentLevel + 1;

        // 卡片背景
        const isWeapon = config.type === 'weapon';
        ctx.fillStyle = isWeapon ? 'rgba(60, 40, 20, 0.9)' : 'rgba(20, 40, 60, 0.9)';
        ctx.fillRect(x, y, w, h);

        // 卡片边框
        ctx.strokeStyle = isUpgrade ? '#FFD700' : '#88CCFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // NEW! 标签 或 升级标签
        if (!isUpgrade) {
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#00FF88';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText('NEW!', x + w - 8, y + 6);
        } else {
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`Lv.${currentLevel}→${nextLevel}`, x + w - 8, y + 6);
        }

        // 图标
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.icon || '?', x + w / 2, y + 50);

        // 名称
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(config.name, x + w / 2, y + 80);

        // 类型标签
        ctx.font = '11px monospace';
        ctx.fillStyle = isWeapon ? '#FF8844' : '#44AAFF';
        ctx.fillText(isWeapon ? '武器' : '被动', x + w / 2, y + 100);

        // 描述
        ctx.font = '11px monospace';
        ctx.fillStyle = '#CCCCCC';
        ctx.textAlign = 'center';
        // 简单换行
        const desc = config.description || '';
        const maxChars = 10;
        for (let j = 0; j < desc.length; j += maxChars) {
            const line = desc.substring(j, j + maxChars);
            ctx.fillText(line, x + w / 2, y + 125 + (j / maxChars) * 16);
        }

        // 效果预览
        ctx.font = '11px monospace';
        ctx.fillStyle = '#88FF88';
        ctx.textAlign = 'center';
        const levelData = config.levels ? config.levels[nextLevel - 1] : null;
        if (levelData) {
            if (config.type === 'weapon') {
                const info = `伤害:${levelData.damage} 射速:${levelData.fireRate}s ×${levelData.count}`;
                ctx.fillText(info, x + w / 2, y + h - 45);
            } else {
                const valStr = config.modType === 'percentAdd'
                    ? `+${Math.round(levelData.value * 100)}%`
                    : `+${levelData.value}`;
                ctx.fillText(`${config.stat}: ${valStr}`, x + w / 2, y + h - 45);
            }
        }

        // 底部提示
        ctx.font = '10px monospace';
        ctx.fillStyle = '#666666';
        ctx.fillText('点击选择', x + w / 2, y + h - 15);
    }

    /** 清理 */
    dispose() {
        if (this.canvas) {
            this.canvas.removeEventListener('click', this._onClick);
        }
    }
}