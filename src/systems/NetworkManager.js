/**
 * NetworkManager — 网络管理器（单例）
 * Unity equivalent: NetworkManager / Netcode for GameObjects
 *
 * 封装 Colyseus Client SDK，管理连接生命周期，
 * 提供 offline / online 模式无缝切换。
 *
 * 在 offline 模式下所有网络操作静默忽略，
 * 在 online 模式下通过 Colyseus WebSocket 进行状态同步。
 */

/** @type {NetworkManager|null} */
let _instance = null;

export class NetworkManager {
    // ============================================================
    // 单例
    // ============================================================

    /** @returns {NetworkManager} */
    static getInstance() {
        if (!_instance) {
            _instance = new NetworkManager();
        }
        return _instance;
    }

    constructor() {
        if (_instance) {
            console.warn('[NetworkManager] Use getInstance() instead of new');
            return _instance;
        }

        // ---- 核心状态 ----
        /** @type {'offline'|'online'} 当前网络模式 */
        this.mode = 'offline';

        /** @type {string|null} 当前玩家的 Colyseus sessionId */
        this.sessionId = null;

        /** @type {any|null} 当前加入的 Colyseus Room 引用 */
        this.room = null;

        /** @type {boolean} WebSocket 是否已连接 */
        this.isConnected = false;

        /** @type {string} 服务器地址（由 _resolveServerUrl 动态确定） */
        this.serverUrl = this._resolveServerUrl();

        // ---- Colyseus Client SDK ----
        /** @type {any|null} Colyseus.Client 实例 */
        this._client = null;

        // ---- EventSystem 引用（外部注入） ----
        /** @type {import('../core/EventSystem.js').EventSystem|null} */
        this._eventSystem = null;

        // ---- 消息监听器缓存 ----
        /** @type {Map<string, Function[]>} */
        this._messageListeners = new Map();

        // ---- 状态变更监听器 ----
        /** @type {Function[]} */
        this._stateChangeListeners = [];

        // ---- Ping / 延迟追踪 ----
        /** @type {number} 上次 ping 发送时间 */
        this._lastPingTime = 0;

        /** @type {number} 最近一次 RTT (毫秒) */
        this.ping = 0;

        /** @type {number} Ping 间隔 (毫秒) */
        this._pingInterval = 2000;

        /** @type {number|null} */
        this._pingTimer = null;

        _instance = this;
    }

    // ============================================================
    // 属性
    // ============================================================

    /**
     * 只读：是否处于联机模式且已连接
     * @returns {boolean}
     */
    get isOnline() {
        return this.mode === 'online' && this.isConnected && !!this.room;
    }

    // ============================================================
    // 初始化
    // ============================================================

    /**
     * 注入 EventSystem 引用（main.js 初始化时调用）
     * @param {import('../core/EventSystem.js').EventSystem} eventSystem
     */
    setEventSystem(eventSystem) {
        this._eventSystem = eventSystem;
    }

    // ============================================================
    // 连接管理
    // ============================================================

    /**
     * 根据当前环境自动解析 Colyseus 服务器地址
     * Unity equivalent: ScriptableObject 环境配置 + BuildSettings
     * @returns {string} WebSocket 服务器地址
     */
    _resolveServerUrl() {
        // 1. HTML <meta> 标签覆盖（最高优先级）
        const meta = document.querySelector('meta[name="game-server"]');
        if (meta && meta.content && !meta.content.includes('YOUR_SERVER')) {
            return meta.content;
        }

        // 2. 本地开发环境
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '') {
            return 'ws://localhost:2567';
        }

        // 3. 生产环境回退（meta 标签未配置时的默认值）
        return `wss://${host}:2567`;
    }

    /**
     * 连接到 Colyseus 服务器
     * Unity equivalent: NetworkManager.StartClient()
     * @param {string} [serverUrl] - 服务器地址，留空则自动检测
     * @returns {Promise<void>}
     */
    async connect(serverUrl) {
        if (this.mode === 'offline') {
            console.log('[NetworkManager] Offline mode — connect() ignored');
            return;
        }

        this.serverUrl = serverUrl || this._resolveServerUrl();
        if (!serverUrl && !document.querySelector('meta[name="game-server"]')) {
            console.warn('[NetworkManager] No game-server meta tag found, using fallback URL');
        }

        // 5秒超时保护
        const connectPromise = new Promise((resolve, reject) => {
            try {
                const ColyseusSDK = this._getColyseusSDK();
                if (!ColyseusSDK) {
                    throw new Error('Colyseus JS SDK not loaded. Include it via <script> tag.');
                }

                this._client = new ColyseusSDK.Client(this.serverUrl);
                this.isConnected = true;

                console.log(`[NetworkManager] Connected to ${this.serverUrl}`);
                this._emit('onNetConnected', { serverUrl: this.serverUrl });
                resolve();
            } catch (error) {
                reject(error);
            }
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('ConnectionTimeout: Server did not respond within 5 seconds')), 5000);
        });

        try {
            await Promise.race([connectPromise, timeoutPromise]);
        } catch (error) {
            console.error('[NetworkManager] Connection failed:', error.message);
            this.isConnected = false;
            this._emit('onNetError', { error });
            throw error;
        }
    }

    /**
     * 断开连接
     * Unity equivalent: NetworkManager.Shutdown()
     */
    async disconnect() {
        this._stopPing();

        if (this.room) {
            try {
                await this.room.leave();
            } catch (e) {
                // 忽略离开失败
            }
            this.room = null;
            this.sessionId = null;
        }

        this._client = null;
        this.isConnected = false;
        this.mode = 'offline';

        this._messageListeners.clear();
        this._stateChangeListeners = [];

        console.log('[NetworkManager] Disconnected');
        this._emit('onNetDisconnected', { code: 1000, reason: 'Manual disconnect' });
    }

    // ============================================================
    // 房间管理
    // ============================================================

    /**
     * 创建房间并加入
     * @param {string} roomName - 房间类型名（如 'battle'）
     * @param {object} [options] - 加入选项（characterId 等）
     * @returns {Promise<any>} room
     */
    async createRoom(roomName, options = {}) {
        if (this.mode === 'offline' || !this._client) {
            console.warn('[NetworkManager] Cannot create room in offline mode');
            return null;
        }

        try {
            const room = await this._client.create(roomName, options);
            this._setupRoom(room);
            console.log(`[NetworkManager] Created room: ${room.id}`);
            return room;
        } catch (error) {
            console.error('[NetworkManager] Create room failed:', error);
            this._emit('onNetError', { error });
            throw error;
        }
    }

    /**
     * 加入指定房间
     * @param {string} roomId - 房间 ID
     * @param {object} [options] - 加入选项
     * @returns {Promise<any>} room
     */
    async joinRoom(roomId, options = {}) {
        if (this.mode === 'offline' || !this._client) {
            console.warn('[NetworkManager] Cannot join room in offline mode');
            return null;
        }

        try {
            const room = await this._client.joinById(roomId, options);
            this._setupRoom(room);
            console.log(`[NetworkManager] Joined room: ${room.id}`);
            return room;
        } catch (error) {
            console.error('[NetworkManager] Join room failed:', error);
            this._emit('onNetError', { error });
            throw error;
        }
    }

    /**
     * 加入或创建房间（自动匹配）
     * @param {string} roomName - 房间类型名
     * @param {object} [options] - 加入选项
     * @returns {Promise<any>} room
     */
    async joinOrCreate(roomName, options = {}) {
        if (this.mode === 'offline' || !this._client) {
            console.warn('[NetworkManager] Cannot joinOrCreate in offline mode');
            return null;
        }

        try {
            const room = await this._client.joinOrCreate(roomName, options);
            this._setupRoom(room);
            console.log(`[NetworkManager] JoinOrCreate room: ${room.id}`);
            return room;
        } catch (error) {
            console.error('[NetworkManager] JoinOrCreate failed:', error);
            this._emit('onNetError', { error });
            throw error;
        }
    }

    /**
     * 查询可用房间列表
     * @param {string} roomName - 房间类型名
     * @returns {Promise<Array>} 房间列表
     */
    async getAvailableRooms(roomName = 'battle') {
        if (this.mode === 'offline' || !this._client) {
            return [];
        }

        try {
            const rooms = await this._client.getAvailableRooms(roomName);
            return rooms;
        } catch (error) {
            this.setOfflineMode();
            console.warn('[NetworkManager] Get rooms failed, switched to offline mode:', error?.message || error);
            return [];
        }
    }

    // ============================================================
    // 消息收发
    // ============================================================

    /**
     * 向服务器发送消息
     * Unity equivalent: ClientRpc / NetworkVariable.Value=
     * @param {string} type - 消息类型
     * @param {*} data - 消息数据
     */
    send(type, data) {
        if (this.mode === 'offline') {
            // 单机模式：静默忽略
            if (type === 'input') console.warn(`[NetworkManager] send('input') blocked — mode is offline`);
            return;
        }

        if (!this.room) {
            if (type === 'input') console.warn(`[NetworkManager] send('input') blocked — no room`);
            return;
        }

        this.room.send(type, data);
    }

    /**
     * 注册状态变化监听
     * @param {Function} callback - (state) => void
     */
    onStateChange(callback) {
        this._stateChangeListeners.push(callback);

        // 如果已有 room，立即绑定
        if (this.room) {
            this.room.onStateChange(callback);
        }
    }

    /**
     * 注册自定义消息监听
     * @param {string} type - 消息类型
     * @param {Function} callback - (data) => void
     */
    onMessage(type, callback) {
        if (!this._messageListeners.has(type)) {
            this._messageListeners.set(type, []);
        }
        this._messageListeners.get(type).push(callback);

        // 如果已有 room，立即绑定
        if (this.room) {
            this.room.onMessage(type, callback);
        }
    }

    /**
     * 移除自定义消息监听
     * @param {string} type - 消息类型
     * @param {Function} callback
     */
    offMessage(type, callback) {
        const listeners = this._messageListeners.get(type);
        if (!listeners) return;

        const idx = listeners.indexOf(callback);
        if (idx !== -1) {
            listeners.splice(idx, 1);
        }
    }

    // ============================================================
    // 模式切换
    // ============================================================

    /**
     * 切换到联机模式
     * @param {string} [serverUrl]
     */
    async setOnlineMode(serverUrl) {
        this.mode = 'online';
        console.log('[NetworkManager] Mode → online');
        await this.connect(serverUrl);
    }

    /**
     * 切换到单机模式
     */
    setOfflineMode() {
        if (this.room) {
            this.disconnect();
        }
        this.mode = 'offline';
        this.isConnected = false;
        this._client = null;            // ★ 清空残留的 Client 实例
        console.log('[NetworkManager] Mode → offline');
    }

    // ============================================================
    // 内部方法
    // ============================================================

    /**
     * 设置 Room 引用及事件监听
     * @param {any} room - Colyseus Room
     * @private
     */
    _setupRoom(room) {
        this.room = room;
        this.sessionId = room.sessionId;

        // 绑定所有预注册的消息监听
        this._messageListeners.forEach((callbacks, type) => {
            callbacks.forEach((cb) => {
                room.onMessage(type, cb);
            });
        });

        // 绑定状态变化监听
        this._stateChangeListeners.forEach((cb) => {
            room.onStateChange(cb);
        });

        // Room 事件
        room.onLeave((code) => {
            console.log(`[NetworkManager] Left room (code: ${code})`);
            this.room = null;
            this.sessionId = null;
            this._stopPing();
            this._emit('onNetRoomLeft', { code });

            // 非正常离开视为断连
            if (code > 1000) {
                this.isConnected = false;
                this._emit('onNetDisconnected', { code, reason: 'Room closed' });
            }
        });

        room.onError((code, message) => {
            console.error(`[NetworkManager] Room error: ${code} ${message}`);
            this._emit('onNetError', { code, message });
        });

        // 启动 Ping
        this._startPing();

        this._emit('onNetRoomJoined', { room, sessionId: this.sessionId });
    }

    /**
     * 获取 Colyseus SDK（全局对象）
     * @returns {any|null}
     * @private
     */
    _getColyseusSDK() {
        // Colyseus JS SDK 通过 <script> 引入时挂载到 window.Colyseus
        if (typeof window !== 'undefined' && window.Colyseus) {
            return window.Colyseus;
        }
        return null;
    }

    /**
     * 通过 EventSystem 发射事件
     * @param {string} eventName
     * @param {*} data
     * @private
     */
    _emit(eventName, data) {
        if (this._eventSystem) {
            this._eventSystem.emit(eventName, data);
        }
    }

    // ============================================================
    // Ping / 延迟测量
    // ============================================================

    /** @private */
    _startPing() {
        this._stopPing();

        // 注册 pong 消息监听
        if (this.room) {
            this.room.onMessage('pong', () => {
                this.ping = performance.now() - this._lastPingTime;
            });
        }

        this._pingTimer = setInterval(() => {
            if (this.room) {
                this._lastPingTime = performance.now();
                this.room.send('ping', {});
            }
        }, this._pingInterval);
    }

    /** @private */
    _stopPing() {
        if (this._pingTimer !== null) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
    }

    // ============================================================
    // 清理
    // ============================================================

    /**
     * 完全重置（测试用）
     */
    reset() {
        this.disconnect();
        this.mode = 'offline';
        this.ping = 0;
        this._messageListeners.clear();
        this._stateChangeListeners = [];
    }
}
