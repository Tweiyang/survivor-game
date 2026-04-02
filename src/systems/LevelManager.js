import { TilemapData } from '../map/TilemapData.js';

/**
 * LevelManager — 关卡加载与管理
 * Unity equivalent: LevelManager / GameManager
 *
 * 从 levels.json 加载关卡配置，构建地图，管理击杀计数、
 * Boss 门开启和关卡通关流程。
 */

const DATA_BASE_PATH = './assets/data';

export class LevelManager {
    /**
     * @param {object} config
     * @param {import('../core/EventSystem.js').EventSystem} config.eventSystem
     */
    constructor(config = {}) {
        /** @type {import('../core/EventSystem.js').EventSystem} */
        this.eventSystem = config.eventSystem || null;

        /** @type {Array} 所有关卡配置 */
        this._levelsConfig = [];

        /** @type {object|null} 当前关卡配置 */
        this.currentLevel = null;

        /** @type {number} 当前关卡在数组中的索引 */
        this._currentIndex = -1;

        /** @type {TilemapData|null} 当前关卡构建的地图 */
        this.tilemapData = null;

        /** @type {number} 击杀计数（非 Boss） */
        this.killCount = 0;

        /** @type {boolean} Boss 门是否已开启 */
        this._bossGateOpened = false;

        /** @type {boolean} Boss 是否已被击败 */
        this._bossDefeated = false;

        // 事件处理器引用（用于 dispose）
        this._onDeathHandler = null;
    }

    /**
     * 加载所有关卡配置
     */
    async loadAllLevels() {
        try {
            const res = await fetch(`${DATA_BASE_PATH}/levels.json?t=${Date.now()}`);
            const data = await res.json();
            this._levelsConfig = data.levels || [];
            console.log(`[LevelManager] Loaded ${this._levelsConfig.length} levels`);
        } catch (e) {
            console.error('[LevelManager] Failed to load levels.json:', e);
            this._levelsConfig = [];
        }
    }

    /**
     * 加载指定关卡
     * @param {string} levelId — 关卡 ID（如 'level_1'）
     * @returns {boolean} 是否成功
     */
    loadLevel(levelId) {
        const idx = this._levelsConfig.findIndex(l => l.id === levelId);
        if (idx === -1) {
            // 未找到指定 ID，默认加载第一关
            if (this._levelsConfig.length > 0) {
                this._currentIndex = 0;
                this.currentLevel = this._levelsConfig[0];
                console.warn(`[LevelManager] Level '${levelId}' not found, loading '${this.currentLevel.id}'`);
            } else {
                console.error('[LevelManager] No levels available');
                return false;
            }
        } else {
            this._currentIndex = idx;
            this.currentLevel = this._levelsConfig[idx];
        }

        // 重置状态
        this.killCount = 0;
        this._bossGateOpened = false;
        this._bossDefeated = false;

        console.log(`[LevelManager] Loaded level: ${this.currentLevel.name} (killsToOpenBoss: ${this.currentLevel.killsToOpenBoss})`);
        return true;
    }

    /**
     * 构建当前关卡的 TilemapData
     * @returns {TilemapData|null}
     */
    buildTilemapData() {
        if (!this.currentLevel) return null;
        const tileSize = this.currentLevel.tileSize || 64;
        this.tilemapData = TilemapData.fromRooms(this.currentLevel.rooms, tileSize);
        return this.tilemapData;
    }

    /**
     * 获取玩家出生点世界坐标
     * @returns {{x: number, y: number}}
     */
    getPlayerSpawnWorldPos() {
        if (!this.currentLevel || !this.tilemapData) {
            return { x: 160, y: 160 };
        }

        const startRoom = this.currentLevel.rooms.find(r => r.type === 'start');
        if (!startRoom || !startRoom.playerSpawn) {
            return { x: 160, y: 160 };
        }

        const ts = this.tilemapData.tileSize;
        return {
            x: (startRoom.offsetX + startRoom.playerSpawn.gridX) * ts + ts / 2,
            y: (startRoom.offsetY + startRoom.playerSpawn.gridY) * ts + ts / 2
        };
    }

    /**
     * 获取所有刷怪点（世界坐标）
     * @returns {Array<{x: number, y: number, monsterType: string, isBoss: boolean}>}
     */
    getAllSpawns() {
        if (!this.currentLevel || !this.tilemapData) return [];

        const ts = this.tilemapData.tileSize;
        const spawns = [];

        for (const room of this.currentLevel.rooms) {
            if (!room.spawns) continue;
            for (const spawn of room.spawns) {
                spawns.push({
                    x: (room.offsetX + spawn.gridX) * ts + ts / 2,
                    y: (room.offsetY + spawn.gridY) * ts + ts / 2,
                    monsterType: spawn.monsterType,
                    isBoss: spawn.isBoss || false
                });
            }
        }

        return spawns;
    }

    /**
     * 获取 Boss 门在世界坐标中的矩形区域
     * @returns {{x: number, y: number, width: number, height: number}|null}
     */
    getBossGateWorldRect() {
        if (!this.currentLevel || !this.tilemapData) return null;

        const bossRoom = this.currentLevel.rooms.find(r => r.type === 'boss');
        if (!bossRoom || !bossRoom.gate) return null;

        const ts = this.tilemapData.tileSize;
        const gate = bossRoom.gate;
        return {
            x: (bossRoom.offsetX + gate.gridX) * ts,
            y: (bossRoom.offsetY + gate.gridY) * ts,
            width: gate.width * ts,
            height: gate.height * ts,
            // 网格坐标（用于 setTile）
            _gridX: bossRoom.offsetX + gate.gridX,
            _gridY: bossRoom.offsetY + gate.gridY,
            _gateWidth: gate.width,
            _gateHeight: gate.height
        };
    }

    /**
     * Boss 门是否已开启
     * @returns {boolean}
     */
    isBossGateOpen() {
        return this._bossGateOpened;
    }

    /**
     * 获取下一关 ID
     * @returns {string|null}
     */
    getNextLevelId() {
        const nextIdx = this._currentIndex + 1;
        if (nextIdx < this._levelsConfig.length) {
            return this._levelsConfig[nextIdx].id;
        }
        return null;
    }

    /**
     * 开始监听死亡事件（在所有怪物生成后调用）
     */
    startListening() {
        if (!this.eventSystem) return;

        // [Network] 联网模式下击杀计数/Boss门/通关全部由服务端权威控制
        // LevelManager 不再本地监听 onDeath
        if (this._isOnline) {
            console.log('[LevelManager] Online mode — skipping local death listening (server authoritative)');
            return;
        }

        this._onDeathHandler = (data) => {
            const deadEntity = data.entity || data;
            if (!deadEntity) return;

            // Boss 死亡 → 通关（仅离线模式处理，联网模式由服务端广播 levelComplete）
            if (deadEntity.tag === 'boss') {
                this._bossDefeated = true;
                console.log('[LevelManager] Boss defeated! Level complete!');
                if (!this._isOnline) {
                    this.eventSystem.emit('onLevelComplete', {
                        levelId: this.currentLevel.id,
                        levelName: this.currentLevel.name,
                        nextLevelId: this.getNextLevelId(),
                        killCount: this.killCount
                    });
                }
                return;
            }

            // 普通怪物死亡 → 击杀计数
            if (deadEntity.tag === 'enemy') {
                this.killCount++;

                // 检查 Boss 门是否应该开启
                if (!this._bossGateOpened && this.killCount >= this.currentLevel.killsToOpenBoss) {
                    this._bossGateOpened = true;
                    console.log(`[LevelManager] Boss gate opened! (kills: ${this.killCount}/${this.currentLevel.killsToOpenBoss})`);
                    this.eventSystem.emit('onBossGateOpen', {
                        gateRect: this.getBossGateWorldRect()
                    });
                }
            }
        };

        this.eventSystem.on('onDeath', this._onDeathHandler);
    }

    /**
     * 清理
     */
    dispose() {
        if (this.eventSystem && this._onDeathHandler) {
            this.eventSystem.off('onDeath', this._onDeathHandler);
            this._onDeathHandler = null;
        }
    }
}
