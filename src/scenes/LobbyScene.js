/**
 * LobbyScene — 多人大厅场景
 * Unity equivalent: Lobby Scene + Canvas UI + NetworkManager UI
 *
 * 提供：
 * - 单人模式快速开始
 * - 创建/加入联机房间
 * - 服务器地址输入
 * - 房间列表
 * - 等待室（玩家列表 + ready 状态 + 倒计时）
 */

import { Scene } from '../core/Scene.js';
import { NetworkManager } from '../systems/NetworkManager.js';
import { addClickOrTouch } from '../utils/addClickOrTouch.js';
import { AudioManager } from '../systems/AudioManager.js';

/** UI 状态枚举 */
const VIEW = {
    MAIN: 'main',          // 主菜单（单人/多人）
    ROOM_LIST: 'roomList', // 房间列表
    WAITING: 'waiting'     // 等待室
};

/** UI 颜色常量 */
const COLORS = {
    bg: '#1a1a2e',
    panel: '#16213e',
    panelBorder: '#0f3460',
    btn: '#e94560',
    btnHover: '#ff6b81',
    btnDisabled: '#555',
    text: '#eee',
    textDim: '#999',
    accent: '#00d2ff',
    success: '#44ff88',
    warning: '#ffaa00',
    card: '#0f3460',
    cardBorder: '#1a4b8c'
};

export class LobbyScene extends Scene {
    constructor(name, systems) {
        super(name, systems);

        /** UI 当前视图 */
        this._view = VIEW.MAIN;

        /** 服务器地址（由 NetworkManager 动态解析） */
        this._serverUrl = null; // 将在使用时从 NetworkManager 获取

        /** 可用房间列表 */
        this._rooms = [];

        /** 等待室玩家列表 */
        this._waitingPlayers = [];

        /** 本地是否 ready */
        this._isReady = false;

        /** 倒计时秒数（0=未开始） */
        this._countdown = 0;

        /** 倒计时定时器 */
        this._countdownTimer = null;

        /** 选择的角色 ID（从 CharacterSelectScene 传来） */
        this._characterId = 'ranger';

        /** 点击区域缓存 */
        this._clickAreas = [];

        /** 点击处理器引用 */
        this._onClick = null;

        /** 刷新房间列表定时器 */
        this._refreshTimer = null;

        /** 通知消息 */
        this._notification = null;
        this._notificationTimer = null;

        /** 当前悬停的按钮索引 */
        this._hoverIdx = -1;

        /** 输入焦点（服务器地址输入框） */
        this._inputFocused = false;

        /** 是否正在连接 */
        this._connecting = false;

        /** 错误信息 */
        this._error = null;

        /** 防止 _startBattle 重入 */
        this._battleStarted = false;

        /** 绑定网络事件回调引用（确保 off 能正确匹配） */
        this._boundOnRoomJoined = (data) => this._onRoomJoined(data);
        this._boundOnRoomLeft = (data) => this._onRoomLeft(data);
        this._boundOnNetError = (data) => this._onNetError(data);
        this._boundOnDisconnected = (data) => this._onDisconnected(data);

        /** NetworkManager 上注册的消息回调引用（用于清理） */
        this._netMessageCallbacks = [];
    }

    // ============================================================
    // 场景生命周期
    // ============================================================

    async init() {
        // 获取选择的角色
        const sceneData = this.systems.sceneManager?.sceneData;
        if (sceneData?.characterId) {
            this._characterId = sceneData.characterId;
        }

        // 初始化 NetworkManager
        const netMgr = NetworkManager.getInstance();
        netMgr.setEventSystem(this.systems.eventSystem);

        // 绑定网络事件（使用稳定引用，确保 destroy 时能正确 off）
        this.systems.eventSystem.on('onNetRoomJoined', this._boundOnRoomJoined);
        this.systems.eventSystem.on('onNetRoomLeft', this._boundOnRoomLeft);
        this.systems.eventSystem.on('onNetError', this._boundOnNetError);
        this.systems.eventSystem.on('onNetDisconnected', this._boundOnDisconnected);

        // 绑定点击事件（兼容触屏）
        const canvas = this.systems.canvas;
        if (canvas) {
            this._cleanupClick = addClickOrTouch(canvas, (pos) => this._handleClick(pos));
        }

        this._view = VIEW.MAIN;

        console.log(`[LobbyScene] Initialized (character: ${this._characterId})`);
    }

    update(deltaTime) {
        // 倒计时逻辑
        if (this._countdown > 0 && this._view === VIEW.WAITING) {
            this._countdown -= deltaTime;
            if (this._countdown <= 0) {
                this._countdown = 0;
                this._startBattle();
            }
        }
    }

    // ============================================================
    // 渲染
    // ============================================================

    renderUI(deltaTime) {
        const ctx = this.systems.ctx;
        const W = this.systems.canvas.width;
        const H = this.systems.canvas.height;

        // 清空画布
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W, H);

        // 重置点击区域
        this._clickAreas = [];

        // 标题
        ctx.save();
        ctx.fillStyle = COLORS.accent;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('⚔ 合作生存', W / 2, 30);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText(`角色: ${this._characterId}`, W / 2, 72);
        ctx.restore();

        switch (this._view) {
            case VIEW.MAIN:
                this._renderMainMenu(ctx, W, H);
                break;
            case VIEW.ROOM_LIST:
                this._renderRoomList(ctx, W, H);
                break;
            case VIEW.WAITING:
                this._renderWaitingRoom(ctx, W, H);
                break;
        }

        // 通知消息
        if (this._notification) {
            this._renderNotification(ctx, W, H);
        }

        // 错误信息
        if (this._error) {
            this._renderError(ctx, W, H);
        }
    }

    // ============================================================
    // 主菜单渲染
    // ============================================================

    _renderMainMenu(ctx, W, H) {
        const centerX = W / 2;
        const startY = H * 0.3;
        const btnW = 280;
        const btnH = 56;
        const gap = 20;

        const buttons = [
            { label: '🎮 单人模式', action: 'singleplayer', color: COLORS.success },
            { label: '🌐 创建房间', action: 'createRoom', color: COLORS.btn },
            { label: '📋 加入房间', action: 'joinRoom', color: COLORS.btn },
        ];

        buttons.forEach((btn, i) => {
            const x = centerX - btnW / 2;
            const y = startY + i * (btnH + gap);

            // 按钮背景
            ctx.fillStyle = btn.color;
            ctx.beginPath();
            this._roundRect(ctx, x, y, btnW, btnH, 12);
            ctx.fill();

            // 按钮文字
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, centerX, y + btnH / 2);

            this._clickAreas.push({ x, y, w: btnW, h: btnH, action: btn.action });
        });

        // 服务器地址（从 NetworkManager 动态获取）
        const addrY = startY + buttons.length * (btnH + gap) + 30;
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        const displayUrl = NetworkManager.getInstance().serverUrl || '(自动检测)';
        ctx.fillText(`服务器: ${displayUrl}`, centerX, addrY);

        // 返回选角按钮
        const backBtnY = H - 60;
        const backBtnW = 160;
        const backBtnH = 40;
        const backX = centerX - backBtnW / 2;

        ctx.fillStyle = COLORS.panelBorder;
        ctx.beginPath();
        this._roundRect(ctx, backX, backBtnY, backBtnW, backBtnH, 8);
        ctx.fill();

        ctx.fillStyle = COLORS.textDim;
        ctx.font = '14px sans-serif';
        ctx.fillText('← 返回选角', centerX, backBtnY + backBtnH / 2);

        this._clickAreas.push({ x: backX, y: backBtnY, w: backBtnW, h: backBtnH, action: 'backToSelect' });

        // 连接中指示
        if (this._connecting) {
            ctx.fillStyle = COLORS.warning;
            ctx.font = '16px sans-serif';
            ctx.fillText('⏳ 连接中...', centerX, addrY + 30);
        }
    }

    // ============================================================
    // 房间列表渲染
    // ============================================================

    _renderRoomList(ctx, W, H) {
        const centerX = W / 2;
        const panelW = Math.min(500, W - 40);
        const panelX = centerX - panelW / 2;
        const panelY = 100;

        // 标题
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📋 可用房间', centerX, panelY);

        // 房间卡片
        const cardStartY = panelY + 40;
        const cardH = 60;
        const cardGap = 10;

        if (this._rooms.length === 0) {
            ctx.fillStyle = COLORS.textDim;
            ctx.font = '16px sans-serif';
            ctx.fillText('暂无可用房间', centerX, cardStartY + 30);
        } else {
            this._rooms.forEach((room, i) => {
                const y = cardStartY + i * (cardH + cardGap);

                // 卡片背景
                ctx.fillStyle = COLORS.card;
                ctx.beginPath();
                this._roundRect(ctx, panelX, y, panelW, cardH, 8);
                ctx.fill();

                ctx.strokeStyle = COLORS.cardBorder;
                ctx.lineWidth = 1;
                ctx.beginPath();
                this._roundRect(ctx, panelX, y, panelW, cardH, 8);
                ctx.stroke();

                // 房间信息
                ctx.fillStyle = COLORS.text;
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`房间 ${room.roomId?.substring(0, 8) || '...'}`, panelX + 16, y + 24);

                ctx.fillStyle = COLORS.textDim;
                ctx.font = '12px sans-serif';
                ctx.fillText(`${room.clients || 0}/${room.maxClients || 4} 玩家`, panelX + 16, y + 44);

                // 加入按钮
                const joinBtnW = 80;
                const joinBtnH = 36;
                const joinBtnX = panelX + panelW - joinBtnW - 12;
                const joinBtnY = y + (cardH - joinBtnH) / 2;

                ctx.fillStyle = COLORS.btn;
                ctx.beginPath();
                this._roundRect(ctx, joinBtnX, joinBtnY, joinBtnW, joinBtnH, 6);
                ctx.fill();

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('加入', joinBtnX + joinBtnW / 2, joinBtnY + joinBtnH / 2);

                this._clickAreas.push({
                    x: joinBtnX, y: joinBtnY, w: joinBtnW, h: joinBtnH,
                    action: 'joinRoomById', roomId: room.roomId
                });
            });
        }

        // 刷新按钮
        const refreshY = cardStartY + Math.max(this._rooms.length, 1) * (cardH + cardGap) + 20;
        const refreshW = 120;
        const refreshH = 40;

        ctx.fillStyle = COLORS.panelBorder;
        ctx.beginPath();
        this._roundRect(ctx, centerX - refreshW / 2, refreshY, refreshW, refreshH, 8);
        ctx.fill();

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔄 刷新', centerX, refreshY + refreshH / 2);
        this._clickAreas.push({ x: centerX - refreshW / 2, y: refreshY, w: refreshW, h: refreshH, action: 'refreshRooms' });

        // 返回按钮
        const backY = refreshY + refreshH + 20;
        this._addBackButton(ctx, centerX, backY, 'backToMain');
    }

    // ============================================================
    // 等待室渲染
    // ============================================================

    _renderWaitingRoom(ctx, W, H) {
        const centerX = W / 2;

        // 标题
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⏳ 等待室', centerX, 100);

        // 房间信息
        const netMgr = NetworkManager.getInstance();
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '13px sans-serif';
        ctx.fillText(`房间 ID: ${netMgr.room?.id?.substring(0, 12) || '...'}`, centerX, 130);

        // 玩家列表
        const listY = 160;
        const cardW = 260;
        const cardH = 50;
        const cardGap = 8;

        this._waitingPlayers.forEach((p, i) => {
            const x = centerX - cardW / 2;
            const y = listY + i * (cardH + cardGap);

            // 背景
            ctx.fillStyle = p.ready ? '#1a4b3a' : COLORS.card;
            ctx.beginPath();
            this._roundRect(ctx, x, y, cardW, cardH, 8);
            ctx.fill();

            // 角色图标
            ctx.fillStyle = p.isLocal ? COLORS.accent : COLORS.text;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${p.isLocal ? '👤' : '👥'} ${p.characterId || '???'}`, x + 12, y + 22);

            // Ready 状态
            ctx.fillStyle = p.ready ? COLORS.success : COLORS.warning;
            ctx.font = '12px sans-serif';
            ctx.fillText(p.ready ? '✓ Ready' : '等待中...', x + 12, y + 40);

            // SessionId
            ctx.fillStyle = COLORS.textDim;
            ctx.font = '11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(p.sessionId?.substring(0, 8) || '', x + cardW - 12, y + 30);
        });

        // Ready 按钮
        const readyY = listY + Math.max(this._waitingPlayers.length, 1) * (cardH + cardGap) + 20;
        const readyBtnW = 200;
        const readyBtnH = 50;

        ctx.fillStyle = this._isReady ? COLORS.warning : COLORS.success;
        ctx.beginPath();
        this._roundRect(ctx, centerX - readyBtnW / 2, readyY, readyBtnW, readyBtnH, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this._isReady ? '取消准备' : '✓ 准备就绪', centerX, readyY + readyBtnH / 2);

        this._clickAreas.push({
            x: centerX - readyBtnW / 2, y: readyY,
            w: readyBtnW, h: readyBtnH,
            action: 'toggleReady'
        });

        // 倒计时
        if (this._countdown > 0) {
            ctx.fillStyle = COLORS.accent;
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(this._countdown).toString(), centerX, readyY + readyBtnH + 60);

            ctx.font = '16px sans-serif';
            ctx.fillStyle = COLORS.text;
            ctx.fillText('即将开始...', centerX, readyY + readyBtnH + 110);
        }

        // 离开按钮
        const leaveY = readyY + readyBtnH + (this._countdown > 0 ? 130 : 20);
        this._addBackButton(ctx, centerX, leaveY, 'leaveRoom');
    }

    // ============================================================
    // 通知 / 错误渲染
    // ============================================================

    _renderNotification(ctx, W, H) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 210, 255, 0.9)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this._notification, W / 2, H - 20);
        ctx.restore();
    }

    _renderError(ctx, W, H) {
        ctx.save();
        ctx.fillStyle = 'rgba(233, 69, 96, 0.9)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`❌ ${this._error}`, W / 2, H - 40);
        ctx.restore();
    }

    // ============================================================
    // 点击处理
    // ============================================================

    _handleClick(pos) {
        const x = pos.x;
        const y = pos.y;

        for (const area of this._clickAreas) {
            if (x >= area.x && x <= area.x + area.w &&
                y >= area.y && y <= area.y + area.h) {
                this._onAction(area.action, area);
                return;
            }
        }
    }

    async _onAction(action, area) {
        const audioMgr = AudioManager.getInstance();

        switch (action) {
            case 'singleplayer':
                audioMgr?.playSFX('skill_select');
                this._startSinglePlayer();
                break;

            case 'createRoom':
                audioMgr?.playSFX('skill_select');
                await this._createRoom();
                break;

            case 'joinRoom':
                audioMgr?.playSFX('skill_select');
                await this._showRoomList();
                break;

            case 'joinRoomById':
                audioMgr?.playSFX('skill_select');
                await this._joinRoom(area.roomId);
                break;

            case 'refreshRooms':
                await this._refreshRoomList();
                break;

            case 'toggleReady':
                audioMgr?.playSFX('skill_select');
                this._toggleReady();
                break;

            case 'leaveRoom':
                await this._leaveRoom();
                break;

            case 'backToMain':
                this._view = VIEW.MAIN;
                break;

            case 'backToSelect':
                this._goBackToSelect();
                break;
        }
    }

    // ============================================================
    // 业务逻辑
    // ============================================================

    /** 单人模式 — 直接进入战斗（重入保护） */
    _startSinglePlayer() {
        if (this._battleStarted) return;
        this._battleStarted = true;

        const netMgr = NetworkManager.getInstance();
        netMgr.setOfflineMode();

        const sceneManager = this.systems.sceneManager;
        if (sceneManager) {
            // 清除上一局残留的关卡数据，确保从第一关开始
            delete sceneManager.sceneData.levelId;
            sceneManager.sceneData.characterId = this._characterId;
            sceneManager.sceneData.isOnline = false;
            sceneManager.loadScene('battle');
        }
    }

    /** 创建联机房间 */
    async _createRoom() {
        this._connecting = true;
        this._error = null;

        try {
            const netMgr = NetworkManager.getInstance();
            // 服务器地址由 NetworkManager 环境自适应解析
            await netMgr.setOnlineMode();
            await netMgr.createRoom('battle', {
                characterId: this._characterId
            });

            // createRoom 成功后 _onRoomJoined 会切到等待室
        } catch (err) {
            const isTimeout = err.message?.includes('Timeout') || err.message?.includes('timeout');
            this._error = isTimeout
                ? '⚠ 服务器不可用，请稍后重试或选择单人游戏'
                : `创建房间失败: ${err.message}`;
            this._connecting = false;
            this._autoClearError();
        }
    }

    /** 显示房间列表 */
    async _showRoomList() {
        this._connecting = true;
        this._error = null;

        try {
            const netMgr = NetworkManager.getInstance();
            // 服务器地址由 NetworkManager 环境自适应解析
            await netMgr.setOnlineMode();

            this._rooms = await netMgr.getAvailableRooms('battle');
            this._view = VIEW.ROOM_LIST;
            this._connecting = false;

            // 自动刷新
            this._startAutoRefresh();
        } catch (err) {
            const isTimeout = err.message?.includes('Timeout') || err.message?.includes('timeout');
            this._error = isTimeout
                ? '⚠ 服务器不可用，请稍后重试或选择单人游戏'
                : `获取房间列表失败: ${err.message}`;
            this._connecting = false;
            this._autoClearError();
        }
    }

    /** 加入指定房间 */
    async _joinRoom(roomId) {
        this._connecting = true;
        this._error = null;

        try {
            const netMgr = NetworkManager.getInstance();
            await netMgr.joinRoom(roomId, {
                characterId: this._characterId
            });
        } catch (err) {
            this._error = `加入房间失败: ${err.message}`;
            this._connecting = false;
        }
    }

    /** 刷新房间列表 */
    async _refreshRoomList() {
        const netMgr = NetworkManager.getInstance();
        this._rooms = await netMgr.getAvailableRooms('battle');
    }

    /** 自动刷新 */
    _startAutoRefresh() {
        this._stopAutoRefresh();
        this._refreshTimer = setInterval(() => {
            if (this._view === VIEW.ROOM_LIST) {
                this._refreshRoomList();
            }
        }, 3000);
    }

    /** 5秒后自动清除错误信息 */
    _autoClearError() {
        if (this._errorClearTimer) clearTimeout(this._errorClearTimer);
        this._errorClearTimer = setTimeout(() => {
            this._error = null;
            this._errorClearTimer = null;
        }, 5000);
    }

    _stopAutoRefresh() {
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
    }

    /** 切换 Ready 状态 */
    _toggleReady() {
        this._isReady = !this._isReady;
        const netMgr = NetworkManager.getInstance();
        netMgr.send('ready', {});
    }

    /** 离开房间 */
    async _leaveRoom() {
        const netMgr = NetworkManager.getInstance();
        await netMgr.disconnect();
        this._view = VIEW.MAIN;
        this._isReady = false;
        this._countdown = 0;
        this._waitingPlayers = [];
    }

    /** 返回选角 */
    _goBackToSelect() {
        const netMgr = NetworkManager.getInstance();
        if (netMgr.room) {
            netMgr.disconnect();
        }

        const sceneManager = this.systems.sceneManager;
        if (sceneManager) {
            sceneManager.loadScene('character-select');
        }
    }

    /** 开始战斗（倒计时结束，重入保护） */
    _startBattle() {
        if (this._battleStarted) return;
        this._battleStarted = true;

        const sceneManager = this.systems.sceneManager;
        if (sceneManager) {
            // 清除上一局残留的关卡数据，确保从第一关开始
            delete sceneManager.sceneData.levelId;
            sceneManager.sceneData.characterId = this._characterId;
            sceneManager.sceneData.isOnline = true;
            sceneManager.loadScene('battle');
        }
    }

    // ============================================================
    // 网络事件处理
    // ============================================================

    _onRoomJoined(data) {
        this._connecting = false;
        this._view = VIEW.WAITING;
        this._isReady = false;
        this._countdown = 0;
        this._stopAutoRefresh();

        // 监听房间状态以更新等待室
        const room = data.room;
        if (room && room.state) {
            // 监听玩家变化
            room.state.players.onAdd((player, sessionId) => {
                this._updateWaitingPlayers(room);
            });

            room.state.players.onRemove(() => {
                this._updateWaitingPlayers(room);
            });

            // 监听 ready 状态变化
            room.onStateChange(() => {
                this._updateWaitingPlayers(room);
                this._checkAllReady(room);
            });
        }

        // 监听游戏开始通知（保存回调引用，便于清理）
        const netMgr = NetworkManager.getInstance();
        const notifCb = (msg) => {
            if (msg.text === 'Battle Start!') {
                // Server 说开始了
                this._countdown = 0;
                this._startBattle();
            }
            this._showNotification(msg.text);
        };
        netMgr.onMessage('notification', notifCb);
        this._netMessageCallbacks.push({ type: 'notification', cb: notifCb });

        this._showNotification('已加入房间');
    }

    _onRoomLeft(data) {
        this._view = VIEW.MAIN;
        this._isReady = false;
        this._countdown = 0;
        this._waitingPlayers = [];
        this._showNotification('已离开房间');
    }

    _onNetError(data) {
        this._error = data.message || data.error?.message || '网络错误';
        this._connecting = false;
        setTimeout(() => { this._error = null; }, 5000);
    }

    _onDisconnected(data) {
        this._view = VIEW.MAIN;
        this._connecting = false;
        this._isReady = false;
        this._countdown = 0;
        this._waitingPlayers = [];
        this._showNotification(`连接断开 (${data.code || '?'})`);
    }

    /** 更新等待室玩家列表 */
    _updateWaitingPlayers(room) {
        const netMgr = NetworkManager.getInstance();
        const players = [];

        room.state.players.forEach((player, sessionId) => {
            players.push({
                sessionId,
                characterId: player.characterId,
                ready: player.ready,
                isLocal: sessionId === netMgr.sessionId
            });
        });

        this._waitingPlayers = players;
    }

    /** 检查是否全员 ready */
    _checkAllReady(room) {
        if (this._countdown > 0) return; // 已在倒计时

        let allReady = true;
        let count = 0;

        room.state.players.forEach((player) => {
            count++;
            if (!player.ready) allReady = false;
        });

        if (allReady && count > 0) {
            this._countdown = 3;
            this._showNotification('全员准备就绪！3 秒后开始...');
        }
    }

    // ============================================================
    // 辅助方法
    // ============================================================

    _showNotification(text) {
        this._notification = text;
        clearTimeout(this._notificationTimer);
        this._notificationTimer = setTimeout(() => {
            this._notification = null;
        }, 3000);
    }

    _addBackButton(ctx, centerX, y, action) {
        const w = 120;
        const h = 36;

        ctx.fillStyle = COLORS.panelBorder;
        ctx.beginPath();
        this._roundRect(ctx, centerX - w / 2, y, w, h, 8);
        ctx.fill();

        ctx.fillStyle = COLORS.textDim;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('← 返回', centerX, y + h / 2);

        this._clickAreas.push({ x: centerX - w / 2, y, w, h, action });
    }

    /**
     * 圆角矩形路径
     * @private
     */
    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ============================================================
    // 销毁
    // ============================================================

    destroy() {
        const canvas = this.systems.canvas;
        if (canvas && this._onClick) {
            if (this._cleanupClick) {
                this._cleanupClick();
                this._cleanupClick = null;
            }
        }
        this._onClick = null;
        this._stopAutoRefresh();
        clearTimeout(this._notificationTimer);
        clearTimeout(this._countdownTimer);

        // 清理事件监听（使用稳定引用）
        this.systems.eventSystem.off('onNetRoomJoined', this._boundOnRoomJoined);
        this.systems.eventSystem.off('onNetRoomLeft', this._boundOnRoomLeft);
        this.systems.eventSystem.off('onNetError', this._boundOnNetError);
        this.systems.eventSystem.off('onNetDisconnected', this._boundOnDisconnected);

        // 清理 NetworkManager 上注册的消息回调
        const netMgr = NetworkManager.getInstance();
        for (const entry of this._netMessageCallbacks) {
            netMgr.offMessage(entry.type, entry.cb);
        }
        this._netMessageCallbacks = [];

        console.log('[LobbyScene] Destroyed');
    }
}
