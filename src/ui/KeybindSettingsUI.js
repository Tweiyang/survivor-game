/**
 * KeybindSettingsUI — 键位设置覆盖层
 * Unity equivalent: Settings Panel UI (Canvas overlay)
 *
 * 在 Canvas 上渲染键位设置弹窗，支持重绑定和恢复默认。
 */
export class KeybindSettingsUI {
    /**
     * @param {object} config
     * @param {import('../systems/InputManager.js').InputManager} config.inputManager
     * @param {HTMLCanvasElement} config.canvas
     */
    constructor(config = {}) {
        this.inputManager = config.inputManager || null;
        this.canvas = config.canvas || null;

        /** @type {boolean} 是否显示 */
        this.isOpen = false;

        /** @type {string|null} 正在监听的 action（重绑定模式） */
        this._listeningAction = null;

        /** @type {Function|null} 点击处理 */
        this._onClick = null;
        /** @type {Function|null} 键盘监听（重绑定用） */
        this._onKeyForRebind = null;

        /** @type {{x:number,y:number,w:number,h:number,action:string}[]} 每行的点击区域 */
        this._rowRects = [];
        /** @type {{x:number,y:number,w:number,h:number}} 恢复默认按钮 */
        this._resetBtnRect = { x: 0, y: 0, w: 0, h: 0 };
        /** @type {{x:number,y:number,w:number,h:number}} 关闭按钮 */
        this._closeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    /**
     * 打开键位设置
     */
    open() {
        this.isOpen = true;
        this._listeningAction = null;

        // 注册点击监听
        if (this.canvas && !this._onClick) {
            this._onClick = (e) => this._handleClick(e);
            this.canvas.addEventListener('click', this._onClick);
        }
    }

    /**
     * 关闭键位设置
     */
    close() {
        this.isOpen = false;
        this._listeningAction = null;
        if (this.canvas && this._onClick) {
            this.canvas.removeEventListener('click', this._onClick);
            this._onClick = null;
        }
        if (this._onKeyForRebind) {
            window.removeEventListener('keydown', this._onKeyForRebind);
            this._onKeyForRebind = null;
        }
    }

    /**
     * 渲染覆盖层
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.isOpen || !this.inputManager) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.save();

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, cw, ch);

        // 面板
        const panelW = 420;
        const panelH = 380;
        const panelX = (cw - panelW) / 2;
        const panelY = (ch - panelH) / 2;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // 标题
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⌨️ 键位设置', cw / 2, panelY + 30);

        // 获取绑定
        const moveBindings = this.inputManager.getBindings();
        const actionBindings = this.inputManager.getActionBindings();
        const allBindings = { ...moveBindings, ...actionBindings };

        // 行列表
        const actionLabels = {
            moveUp: '向上移动',
            moveDown: '向下移动',
            moveLeft: '向左移动',
            moveRight: '向右移动',
            activeSkill: '主动技能',
            pause: '暂停'
        };

        this._rowRects = [];
        let rowY = panelY + 65;
        const rowH = 36;

        for (const [action, label] of Object.entries(actionLabels)) {
            const keyCode = allBindings[action] || '未绑定';
            const isListening = this._listeningAction === action;

            // 行背景
            ctx.fillStyle = isListening ? '#3a3a5e' : '#22224e';
            ctx.fillRect(panelX + 15, rowY, panelW - 30, rowH);

            // action 名称
            ctx.font = '14px monospace';
            ctx.fillStyle = '#CCCCCC';
            ctx.textAlign = 'left';
            ctx.fillText(label, panelX + 25, rowY + rowH / 2);

            // 按键值
            ctx.textAlign = 'right';
            if (isListening) {
                ctx.fillStyle = '#FFD700';
                ctx.fillText('⏳ 请按下新按键...', panelX + panelW - 25, rowY + rowH / 2);
            } else {
                ctx.fillStyle = '#4FC3F7';
                ctx.fillText(this._formatKeyCode(keyCode), panelX + panelW - 25, rowY + rowH / 2);
            }

            this._rowRects.push({
                x: panelX + 15, y: rowY, w: panelW - 30, h: rowH, action
            });

            rowY += rowH + 4;
        }

        // 恢复默认按钮
        const btnY = panelY + panelH - 70;
        const resetBtnW = 140;
        const resetBtnX = panelX + 30;
        this._resetBtnRect = { x: resetBtnX, y: btnY, w: resetBtnW, h: 36 };

        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(resetBtnX, btnY, resetBtnW, 36);
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('恢复默认', resetBtnX + resetBtnW / 2, btnY + 18);

        // 关闭按钮
        const closeBtnW = 140;
        const closeBtnX = panelX + panelW - 30 - closeBtnW;
        this._closeBtnRect = { x: closeBtnX, y: btnY, w: closeBtnW, h: 36 };

        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(closeBtnX, btnY, closeBtnW, 36);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('返回', closeBtnX + closeBtnW / 2, btnY + 18);

        ctx.restore();
    }

    /**
     * @private
     */
    _handleClick(e) {
        if (!this.isOpen) return;

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 如果正在监听模式，点击其他地方取消
        if (this._listeningAction) {
            this._listeningAction = null;
            if (this._onKeyForRebind) {
                window.removeEventListener('keydown', this._onKeyForRebind);
                this._onKeyForRebind = null;
            }
            return;
        }

        // 检查行点击
        for (const row of this._rowRects) {
            if (mx >= row.x && mx <= row.x + row.w && my >= row.y && my <= row.y + row.h) {
                this._startListening(row.action);
                return;
            }
        }

        // 检查恢复默认按钮
        const rb = this._resetBtnRect;
        if (mx >= rb.x && mx <= rb.x + rb.w && my >= rb.y && my <= rb.y + rb.h) {
            this.inputManager.resetToDefault();
            return;
        }

        // 检查关闭按钮
        const cb = this._closeBtnRect;
        if (mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h) {
            this.close();
            return;
        }
    }

    /**
     * 进入监听模式
     * @private
     * @param {string} action
     */
    _startListening(action) {
        this._listeningAction = action;

        this._onKeyForRebind = (e) => {
            e.preventDefault();
            const keyCode = e.code;

            // 判断是 movement 绑定还是 action 绑定
            const moveActions = ['moveUp', 'moveDown', 'moveLeft', 'moveRight'];
            if (moveActions.includes(action)) {
                this.inputManager.setBinding(action, keyCode);
            } else {
                this.inputManager.setActionBinding(action, keyCode);
            }

            this._listeningAction = null;
            window.removeEventListener('keydown', this._onKeyForRebind);
            this._onKeyForRebind = null;
        };

        window.addEventListener('keydown', this._onKeyForRebind);
    }

    /**
     * 格式化 keyCode 为更友好的显示
     * @private
     * @param {string} code
     * @returns {string}
     */
    _formatKeyCode(code) {
        const map = {
            'KeyW': 'W', 'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D',
            'KeyE': 'E', 'KeyQ': 'Q', 'KeyR': 'R', 'KeyF': 'F',
            'Space': '空格', 'Escape': 'ESC',
            'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
            'ShiftLeft': 'L-Shift', 'ShiftRight': 'R-Shift',
            'ControlLeft': 'L-Ctrl', 'ControlRight': 'R-Ctrl'
        };
        return map[code] || code;
    }
}
