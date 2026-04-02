import { HealthComponent } from '../components/HealthComponent.js';
import { SpriteRenderer } from '../components/SpriteRenderer.js';
import { SkillComponent } from '../components/SkillComponent.js';
import { NetworkManager } from '../systems/NetworkManager.js';

/**
 * HUD — 战斗界面 UI
 * Unity equivalent: Canvas + UI Elements (Overlay)
 *
 * 绘制玩家血条、经验条、等级、击杀数
 * 绘制怪物头顶血条（受击后显示 3 秒淡出）
 */
export class HUD {
    /**
     * @param {object} config
     * @param {CanvasRenderingContext2D} config.ctx
     * @param {import('../systems/CameraSystem.js').CameraSystem} config.camera
     * @param {import('../core/EntityManager.js').EntityManager} config.entityManager
     * @param {import('../systems/ExperienceSystem.js').ExperienceSystem} config.experienceSystem
     */
    constructor(config = {}) {
        this.ctx = config.ctx;
        this.camera = config.camera;
        this.entityManager = config.entityManager;
        this.experienceSystem = config.experienceSystem;

        /** @type {import('../core/Entity.js').Entity|null} 玩家实体引用 */
        this.playerEntity = null;

        /** @type {import('../systems/LevelManager.js').LevelManager|null} */
        this.levelManager = null;

        /** @type {import('../systems/InputManager.js').InputManager|null} */
        this.inputManager = config.inputManager || null;

        /** @type {number} Boss 门开启闪烁计时器 */
        this._gateOpenFlashTimer = 0;

        // --- HUD 布局常量 ---
        this.padding = 16;
        this.barWidth = 200;
        this.barHeight = 16;
        this.barGap = 6;
    }

    /**
     * 设置玩家实体引用
     * @param {import('../core/Entity.js').Entity} entity
     */
    setPlayer(entity) {
        this.playerEntity = entity;
    }

    /**
     * 每帧渲染 HUD（在世界渲染之后调用）
     * @param {number} deltaTime
     */
    render(deltaTime) {
        if (!this.ctx) return;

        // 1. 绘制怪物头顶血条（世界空间）
        this._renderMonsterBars(deltaTime);

        // 2. 绘制玩家 HUD（屏幕空间，固定左上角）
        this._renderPlayerHUD();

        // 3. P2: 绘制技能图标（左下角）
        this._renderSkillIcons();

        // 4. P3: 绘制主动技能冷却（底部中央）
        this._renderActiveSkill();

        // 5. 绘制关卡信息（关卡名 + Boss 门进度）
        this._renderLevelInfo(deltaTime);

        // 6. P5: 多人信息（队友状态栏 + 连接指示器）
        this._renderMultiplayerInfo();
    }

    // ========== 玩家 HUD ==========

    /** @private */
    _renderPlayerHUD() {
        const ctx = this.ctx;
        const x = this.padding;
        let y = this.padding;

        // 等级文本
        const expSys = this.experienceSystem;
        const level = expSys ? expSys.level : 1;
        ctx.save();
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        ctx.fillText(`Lv.${level}`, x, y);
        y += 20;

        // 血条
        const health = this.playerEntity
            ? this.playerEntity.getComponent(HealthComponent)
            : null;
        const hpRatio = health ? health.getHpRatio() : 1;
        this._drawBar(x, y, this.barWidth, this.barHeight, hpRatio, '#E74C3C', '#333333');

        // 血量数字
        if (health) {
            ctx.font = '11px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                `${Math.ceil(health.currentHp)} / ${health.maxHp}`,
                x + this.barWidth / 2,
                y + this.barHeight / 2
            );
        }
        y += this.barHeight + this.barGap;

        // 经验条
        const expRatio = expSys ? expSys.getExpRatio() : 0;
        this._drawBar(x, y, this.barWidth, this.barHeight - 4, expRatio, '#3498DB', '#222222');

        if (expSys) {
            ctx.font = '10px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                `${expSys.currentExp} / ${expSys.expToNextLevel}`,
                x + this.barWidth / 2,
                y + (this.barHeight - 4) / 2
            );
        }
        y += this.barHeight - 4 + this.barGap;

        // 击杀数
        const kills = expSys ? expSys.killCount : 0;
        ctx.font = '12px monospace';
        ctx.fillStyle = '#CCCCCC';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Kills: ${kills}`, x, y);

        ctx.restore();
    }

    /**
     * 绘制条形 UI
     * @private
     */
    _drawBar(x, y, width, height, ratio, fillColor, bgColor) {
        const ctx = this.ctx;
        // 背景
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, width, height);
        // 填充
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), height);
        // 边框
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    }

    // ========== P2: 技能图标 ==========

    /** @private 绘制武器槽位和被动技能图标 */
    _renderSkillIcons() {
        if (!this.playerEntity) return;

        const skillComp = this.playerEntity.getComponent(SkillComponent);
        if (!skillComp) return;

        const ctx = this.ctx;
        const ch = ctx.canvas.height;
        const slotSize = 36;
        const slotGap = 4;
        const startX = this.padding;
        const startY = ch - this.padding - slotSize;

        ctx.save();

        // --- 武器槽（4格）---
        for (let i = 0; i < skillComp.maxWeapons; i++) {
            const sx = startX + i * (slotSize + slotGap);
            const weapon = skillComp.weapons[i];

            // 槽位背景
            ctx.fillStyle = weapon ? 'rgba(60, 40, 20, 0.8)' : 'rgba(40, 40, 40, 0.5)';
            ctx.fillRect(sx, startY, slotSize, slotSize);

            // 边框
            ctx.strokeStyle = weapon ? '#FF8844' : '#555555';
            ctx.lineWidth = weapon ? 2 : 1;
            ctx.strokeRect(sx, startY, slotSize, slotSize);

            if (weapon) {
                // 图标
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(weapon.icon || '?', sx + slotSize / 2, startY + slotSize / 2 - 4);

                // 等级
                ctx.font = 'bold 9px monospace';
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${weapon.level}`, sx + slotSize - 3, startY + slotSize - 2);
            }
        }

        // --- 被动技能图标（武器槽右侧）---
        const passiveStartX = startX + skillComp.maxWeapons * (slotSize + slotGap) + 8;
        const passiveSize = 28;

        for (let i = 0; i < skillComp.passives.length; i++) {
            const passive = skillComp.passives[i];
            const px = passiveStartX + i * (passiveSize + 3);

            // 背景
            ctx.fillStyle = 'rgba(20, 40, 60, 0.8)';
            ctx.fillRect(px, startY + (slotSize - passiveSize) / 2, passiveSize, passiveSize);

            // 边框
            ctx.strokeStyle = '#44AAFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, startY + (slotSize - passiveSize) / 2, passiveSize, passiveSize);

            // 图标
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(passive.icon || '?', px + passiveSize / 2, startY + slotSize / 2 - 2);

            // 等级
            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = '#44AAFF';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${passive.level}`, px + passiveSize - 2, startY + (slotSize + passiveSize) / 2 - 1);
        }

        ctx.restore();
    }

    // ========== P3: 主动技能冷却 ==========

    /** @private 绘制主动技能图标 + 冷却遮罩 */
    _renderActiveSkill() {
        if (!this.playerEntity) return;

        // 通过 constructor.name 查找，避免 import 循环
        let activeSkill = null;
        for (const comp of this.playerEntity._components) {
            if (comp.constructor.name === 'ActiveSkillComponent') {
                activeSkill = comp;
                break;
            }
        }
        if (!activeSkill) return;

        const ctx = this.ctx;
        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;

        const size = 52;
        const x = cw / 2 - size / 2;
        const y = ch - this.padding - size;

        ctx.save();

        // 背景
        ctx.fillStyle = 'rgba(30, 30, 50, 0.85)';
        ctx.fillRect(x, y, size, size);

        // 图标
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeSkill.icon || '⭐', x + size / 2, y + size / 2 - 2);

        // 冷却遮罩
        const cdPercent = activeSkill.getCooldownPercent();
        if (cdPercent > 0) {
            // 灰色遮罩（从顶部往下覆盖）
            const maskH = size * cdPercent;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, size, maskH);

            // 冷却秒数
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${activeSkill.getCooldownSeconds()}`, x + size / 2, y + size / 2);

            // 普通边框
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);
        } else {
            // 就绪状态 — 金色边框
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, size, size);

            // 按键提示（从 InputManager 获取当前绑定）
            const keyLabel = this._getActiveSkillKeyLabel();
            ctx.font = '9px monospace';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(keyLabel, x + size / 2, y + size + 3);
        }

        // 技能名称
        ctx.font = '9px monospace';
        ctx.fillStyle = '#AAAAAA';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(activeSkill.name || '', x + size / 2, y - 3);

        ctx.restore();
    }

    // ========== 关卡信息 ==========

    /** @private 绘制关卡名和 Boss 门进度 */
    _renderLevelInfo(deltaTime) {
        if (!this.levelManager || !this.levelManager.currentLevel) return;

        const ctx = this.ctx;
        const cw = ctx.canvas.width;
        const level = this.levelManager.currentLevel;

        ctx.save();

        // 关卡名称（屏幕顶部中央）
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`📍 ${level.name}`, cw / 2, 8);

        // Boss 门进度（关卡名下方）
        const killCount = this.levelManager.killCount;
        const required = level.killsToOpenBoss;
        const gateOpen = this.levelManager.isBossGateOpen();

        if (gateOpen) {
            // 闪烁提示
            this._gateOpenFlashTimer += deltaTime;
            if (this._gateOpenFlashTimer < 3) {
                // 闪烁 3 秒
                const flashAlpha = Math.abs(Math.sin(this._gateOpenFlashTimer * 4));
                ctx.globalAlpha = 0.5 + flashAlpha * 0.5;
                ctx.font = 'bold 13px monospace';
                ctx.fillStyle = '#2ECC71';
                ctx.fillText('🔓 Boss 门已开启！', cw / 2, 28);
            } else {
                ctx.font = '12px monospace';
                ctx.fillStyle = '#2ECC71';
                ctx.fillText('🔓 Boss 门已开启', cw / 2, 28);
            }
        } else {
            // 进度条
            const ratio = Math.min(1, killCount / required);
            const barW = 120;
            const barH = 10;
            const bx = cw / 2 - barW / 2;
            const by = 28;

            ctx.fillStyle = '#333333';
            ctx.fillRect(bx, by, barW, barH);
            ctx.fillStyle = '#E67E22';
            ctx.fillRect(bx, by, barW * ratio, barH);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, barW, barH);

            ctx.font = '10px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`🚪 ${killCount}/${required}`, cw / 2, by + barH / 2);
        }

        ctx.restore();
    }

    /**
     * 获取主动技能的当前键位标签
     * @private
     * @returns {string}
     */
    _getActiveSkillKeyLabel() {
        if (!this.inputManager) return 'SPACE';

        // 优先从 action bindings 获取（包含用户自定义键位）
        const actionBindings = this.inputManager.getActionBindings
            ? this.inputManager.getActionBindings() : null;
        if (actionBindings && actionBindings.activeSkill) {
            return this._keyCodeToLabel(actionBindings.activeSkill);
        }

        // 备选：普通 bindings
        const bindings = this.inputManager.getBindings
            ? this.inputManager.getBindings() : null;
        if (bindings && bindings.activeSkill) {
            return this._keyCodeToLabel(bindings.activeSkill);
        }

        return 'SPACE';
    }

    /**
     * 将键码转为友好标签
     * @private
     */
    _keyCodeToLabel(code) {
        const map = {
            'Space': '空格',
            'ShiftLeft': 'L-Shift', 'ShiftRight': 'R-Shift',
            'ControlLeft': 'L-Ctrl', 'ControlRight': 'R-Ctrl',
            'AltLeft': 'L-Alt', 'AltRight': 'R-Alt',
            'Enter': '回车', 'Escape': 'ESC',
            'Tab': 'Tab', 'Backspace': '退格',
            'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→'
        };
        if (map[code]) return map[code];
        // KeyA → A, Digit1 → 1
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return code.slice(5);
        return code;
    }

    // ========== 怪物头顶血条 ==========

    /** @private */
    _renderMonsterBars(deltaTime) {
        if (!this.entityManager || !this.camera) return;

        // 查找所有 enemy 和 boss 标签的实体
        const enemies = this.entityManager.findAllByTag('enemy');
        const bosses = this.entityManager.findAllByTag('boss');
        const monsters = enemies.concat(bosses);
        const ctx = this.ctx;
        ctx.save();

        for (const monster of monsters) {
            if (!monster.active) continue;
            const health = monster.getComponent(HealthComponent);
            if (!health || health.isDead) continue;

            // 满血不显示，受击后显示 3 秒
            if (health.showBarTimer <= 0) continue;

            // 计算淡出 alpha
            let alpha = 1;
            if (health.showBarTimer < 1) {
                alpha = health.showBarTimer; // 最后 1 秒淡出
            }
            health.showBarTimer -= deltaTime;

            // 世界坐标转屏幕坐标
            const worldPos = monster.transform.position;
            const screenPos = this.camera.worldToScreen(worldPos);

            // 获取精灵尺寸来定位血条
            const sr = monster.getComponent(SpriteRenderer);
            const spriteH = sr ? sr.height : 16;

            const barW = 30;
            const barH = 4;
            const bx = screenPos.x - barW / 2;
            const by = screenPos.y - spriteH / 2 - 8;

            ctx.globalAlpha = alpha;

            // 背景
            ctx.fillStyle = '#333333';
            ctx.fillRect(bx, by, barW, barH);
            // 血量
            ctx.fillStyle = '#E74C3C';
            ctx.fillRect(bx, by, barW * health.getHpRatio(), barH);
            // 边框
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(bx, by, barW, barH);
        }

        ctx.restore();
    }

    // ========== P5: 多人信息 ==========

    /**
     * 绘制多人模式 HUD 元素：
     * - 右上角队友状态栏
     * - 右下角连接状态 + 延迟
     * - offline 模式不渲染
     * @private
     */
    _renderMultiplayerInfo() {
        const netMgr = NetworkManager.getInstance();
        if (!netMgr.isOnline) return; // offline 模式不显示

        const ctx = this.ctx;
        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;

        ctx.save();

        // ---- 右下角：连接状态 + Ping ----
        const statusX = cw - this.padding;
        const statusY = ch - this.padding;

        // 连接指示灯
        const isConnected = netMgr.isConnected;
        ctx.fillStyle = isConnected ? '#44FF88' : '#FF4444';
        ctx.beginPath();
        ctx.arc(statusX - 60, statusY - 6, 4, 0, Math.PI * 2);
        ctx.fill();

        // 状态文字
        ctx.font = '11px monospace';
        ctx.fillStyle = '#CCCCCC';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
            isConnected ? `🌐 ${Math.round(netMgr.ping)}ms` : '⚠ Disconnected',
            statusX,
            statusY
        );

        // ---- 右上角：队友状态栏 ----
        // 从 entityManager 获取远程玩家
        if (!this.entityManager) { ctx.restore(); return; }

        const allPlayers = this.entityManager.findAllByTag('player');
        // 过滤：远程玩家有 tags 包含 'remote_player'
        const remotePlayers = [];
        for (const entity of allPlayers) {
            if (entity.tags && entity.tags.includes('remote_player')) {
                remotePlayers.push(entity);
            }
        }
        // 还要检查通过 entity tag 直接标记的远程玩家
        // (StateSynchronizer 创建时 tag='player'，额外添加 'remote_player')

        if (remotePlayers.length === 0) { ctx.restore(); return; }

        const cardW = 140;
        const cardH = 36;
        const cardGap = 4;
        const startX = cw - this.padding - cardW;
        let startY = this.padding;

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#AAAAAA';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`队友 (${remotePlayers.length})`, cw - this.padding, startY);
        startY += 16;

        for (let i = 0; i < Math.min(remotePlayers.length, 3); i++) {
            const entity = remotePlayers[i];
            const health = entity.getComponent(HealthComponent);
            const y = startY + i * (cardH + cardGap);

            // 卡片背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(startX, y, cardW, cardH);

            // 角色名称
            ctx.font = '11px monospace';
            ctx.fillStyle = entity.active !== false ? '#FFFFFF' : '#FF6666';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const name = entity.name || entity.networkId?.substring(0, 6) || '???';
            ctx.fillText(name, startX + 6, y + 4);

            // 小血条
            if (health) {
                const barX = startX + 6;
                const barY = y + 20;
                const barW = cardW - 12;
                const barH = 8;

                ctx.fillStyle = '#333333';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = entity.active !== false ? '#E74C3C' : '#666666';
                ctx.fillRect(barX, barY, barW * health.getHpRatio(), barH);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(barX, barY, barW, barH);

                // HP 数值
                ctx.font = '8px monospace';
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${Math.ceil(health.currentHp)}/${health.maxHp}`, barX + barW / 2, barY + barH / 2);
            }
        }

        ctx.restore();
    }
}
