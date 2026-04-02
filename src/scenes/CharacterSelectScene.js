import { Scene } from '../core/Scene.js';
import { AudioManager } from '../systems/AudioManager.js';
import { BGMController } from '../systems/BGMController.js';

const DATA_BASE_PATH = './assets/data';

/**
 * CharacterSelectScene — 选角场景
 * Unity equivalent: 独立 Scene + Canvas UI
 *
 * 展示所有可选角色，玩家选择后进入战斗。
 */
export class CharacterSelectScene extends Scene {
    constructor(name, systems) {
        super(name, systems);

        /** @type {object} 全部角色配置 */
        this.characters = {};
        /** @type {string[]} 角色 ID 列表 */
        this.characterIds = [];
        /** @type {number} 当前选中索引 */
        this.selectedIndex = 0;

        /** @type {{x:number,y:number,w:number,h:number}[]} 卡片点击区域 */
        this._cardRects = [];
        /** @type {{x:number,y:number,w:number,h:number}} 确认按钮区域 */
        this._btnRect = { x: 0, y: 0, w: 0, h: 0 };

        /** @type {Function} 点击处理器 */
        this._onClick = null;
        /** @type {boolean} 数据已加载 */
        this._loaded = false;
    }

    async init() {
        try {
            const res = await fetch(`${DATA_BASE_PATH}/characters.json`);
            this.characters = await res.json();
        } catch (e) {
            console.error('[CharacterSelectScene] Failed to load characters.json:', e);
            this.characters = {};
        }

        this.characterIds = Object.keys(this.characters);
        this.selectedIndex = 0;
        this._loaded = true;

        // 绑定点击事件
        const canvas = this.systems.canvas;
        if (canvas) {
            this._onClick = (e) => this._handleClick(e);
            canvas.addEventListener('click', this._onClick);
        }

        console.log(`[CharacterSelectScene] Loaded ${this.characterIds.length} characters`);

        // 初始化音频系统 + 播放标题 BGM
        this._audioManager = AudioManager.getInstance();
        await this._audioManager.init(DATA_BASE_PATH);
        this._audioManager.applyPendingVolumes();

        // 确保 BGMController 已创建
        if (!this._audioManager.bgmController) {
            const backend = this._audioManager.backend;
            this._audioManager.bgmController = new BGMController(backend.context, backend.bgmGain);
        }
        this._audioManager.playBGM('bgm_title');
    }

    update(deltaTime) {
        // 选角场景不需要游戏逻辑更新
    }

    /**
     * 渲染选角 UI
     */
    renderUI(deltaTime) {
        if (!this._loaded) return;

        const ctx = this.systems.ctx;
        const canvas = this.systems.canvas;
        if (!ctx || !canvas) return;

        const cw = canvas.width;
        const ch = canvas.height;

        ctx.save();

        // 背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, cw, ch);

        // 标题
        ctx.font = 'bold 36px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('选择角色', cw / 2, 50);

        ctx.font = '14px monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText('SELECT YOUR CHARACTER', cw / 2, 78);

        // 计算卡片布局
        const cardCount = this.characterIds.length;
        const cardW = 200;
        const cardH = 320;
        const gap = 30;
        const totalW = cardCount * cardW + (cardCount - 1) * gap;
        const startX = (cw - totalW) / 2;
        const startY = 110;

        this._cardRects = [];

        // 收集属性最大值用于归一化
        const maxStats = { maxHp: 0, attack: 0, moveSpeed: 0, defense: 0 };
        for (const id of this.characterIds) {
            const s = this.characters[id].stats;
            if (s.maxHp > maxStats.maxHp) maxStats.maxHp = s.maxHp;
            if (s.attack > maxStats.attack) maxStats.attack = s.attack;
            if (s.moveSpeed > maxStats.moveSpeed) maxStats.moveSpeed = s.moveSpeed;
            if (s.defense > maxStats.defense) maxStats.defense = s.defense;
        }

        // 绘制每张角色卡片
        for (let i = 0; i < cardCount; i++) {
            const x = startX + i * (cardW + gap);
            const y = startY;
            const charId = this.characterIds[i];
            const char = this.characters[charId];
            const isSelected = i === this.selectedIndex;

            this._cardRects.push({ x, y, w: cardW, h: cardH });
            this._drawCard(ctx, x, y, cardW, cardH, char, isSelected, maxStats);
        }

        // 确认按钮
        const btnW = 220;
        const btnH = 50;
        const btnX = (cw - btnW) / 2;
        const btnY = startY + cardH + 30;
        this._btnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        // 按钮背景
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#27AE60';
        ctx.lineWidth = 2;
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        // 按钮文字
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ 开始战斗', btnX + btnW / 2, btnY + btnH / 2);

        ctx.restore();
    }

    /**
     * 绘制单张角色卡片
     * @private
     */
    _drawCard(ctx, x, y, w, h, char, isSelected, maxStats) {
        // 卡片背景
        ctx.fillStyle = isSelected ? '#2a2a4e' : '#16213e';
        ctx.fillRect(x, y, w, h);

        // 边框
        ctx.strokeStyle = isSelected ? '#FFD700' : '#333355';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.strokeRect(x, y, w, h);

        // 角色图标
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char.icon || '?', x + w / 2, y + 40);

        // 角色名称
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = char.color || '#FFFFFF';
        ctx.fillText(char.name, x + w / 2, y + 75);

        // 角色描述
        ctx.font = '11px monospace';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(char.description || '', x + w / 2, y + 95);

        // 属性条
        const barX = x + 20;
        const barW = w - 40;
        const barH = 10;
        let barY = y + 118;

        const statBars = [
            { label: 'HP', value: char.stats.maxHp, max: maxStats.maxHp, color: '#E74C3C' },
            { label: 'ATK', value: char.stats.attack, max: maxStats.attack, color: '#E67E22' },
            { label: 'SPD', value: char.stats.moveSpeed, max: maxStats.moveSpeed, color: '#2ECC71' },
            { label: 'DEF', value: char.stats.defense, max: maxStats.defense, color: '#3498DB' }
        ];

        for (const bar of statBars) {
            // 标签
            ctx.font = '10px monospace';
            ctx.fillStyle = '#888888';
            ctx.textAlign = 'left';
            ctx.fillText(bar.label, barX, barY + barH / 2 + 1);

            // 背景条
            const valBarX = barX + 32;
            const valBarW = barW - 32;
            ctx.fillStyle = '#333344';
            ctx.fillRect(valBarX, barY - 2, valBarW, barH);

            // 值条
            const ratio = bar.max > 0 ? bar.value / bar.max : 0;
            ctx.fillStyle = bar.color;
            ctx.fillRect(valBarX, barY - 2, valBarW * ratio, barH);

            // 数值
            ctx.fillStyle = '#CCCCCC';
            ctx.textAlign = 'right';
            ctx.font = '9px monospace';
            ctx.fillText(String(bar.value), barX + barW, barY + barH / 2 + 1);

            barY += barH + 10;
        }

        // 分隔线
        barY += 5;
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 15, barY);
        ctx.lineTo(x + w - 15, barY);
        ctx.stroke();
        barY += 10;

        // 主动技能信息
        if (char.activeSkillConfig) {
            const asc = char.activeSkillConfig;

            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText(`${asc.icon || '⭐'} ${asc.name || '主动技能'}`, x + w / 2, barY + 5);

            ctx.font = '10px monospace';
            ctx.fillStyle = '#AAAAAA';
            ctx.fillText(asc.description || '', x + w / 2, barY + 22);

            ctx.font = '9px monospace';
            ctx.fillStyle = '#666666';
            ctx.fillText(`冷却: ${asc.cooldown || 10}s`, x + w / 2, barY + 38);
        }

        // 选中标记
        if (isSelected) {
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText('▶ SELECTED ◀', x + w / 2, y + h - 15);
        }
    }

    /**
     * 处理点击事件
     * @private
     */
    _handleClick(e) {
        const canvas = this.systems.canvas;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 检查角色卡片点击
        for (let i = 0; i < this._cardRects.length; i++) {
            const r = this._cardRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                this.selectedIndex = i;
                return;
            }
        }

        // 检查确认按钮点击
        const btn = this._btnRect;
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
            this._confirm();
        }
    }

    /**
     * 确认选择，进入战斗
     * @private
     */
    async _confirm() {
        const charId = this.characterIds[this.selectedIndex];
        if (!charId) return;

        // 首次用户交互：恢复 AudioContext（解除浏览器自动播放限制）
        if (this._audioManager) {
            await this._audioManager.resume();
            this._audioManager.playSFX('skill_select');
        }

        const sceneManager = this.systems.sceneManager;
        if (sceneManager) {
            // 清除上一局残留的关卡/模式数据
            delete sceneManager.sceneData.levelId;
            delete sceneManager.sceneData.isOnline;
            sceneManager.sceneData.characterId = charId;
            // P5: 跳转大厅场景（单人/多人选择）而非直接进入战斗
            sceneManager.loadScene('lobby');
        }

        console.log(`[CharacterSelectScene] Selected: ${charId}`);
    }

    destroy() {
        const canvas = this.systems.canvas;
        if (canvas && this._onClick) {
            canvas.removeEventListener('click', this._onClick);
        }
        this._onClick = null;
        console.log('[CharacterSelectScene] Destroyed');
    }
}
