"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleRoom = void 0;
/**
 * BattleRoom — 战斗房间
 * Unity equivalent: GameManager (Dedicated Server) + NetworkManager
 *
 * 管理最多 4 人的合作 PvE 战斗房间
 * 服务器权威：所有游戏逻辑由此房间驱动
 */
const core_1 = require("@colyseus/core");
const BattleState_1 = require("../schema/BattleState");
const PlayerState_1 = require("../schema/PlayerState");
const ServerPhysics_1 = require("../systems/ServerPhysics");
const ServerSpawner_1 = require("../systems/ServerSpawner");
const ServerAI_1 = require("../systems/ServerAI");
const ServerCombat_1 = require("../systems/ServerCombat");
const DifficultyScaler_1 = require("../systems/DifficultyScaler");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class BattleRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 4;
        /** 角色配置表（从 characters.json 加载） */
        this.characters = {};
        /** 关卡配置（从 levels.json 加载） */
        this.levels = {};
        /** 玩家 ready 状态追踪 */
        this.readyPlayers = new Set();
        /** 游戏是否已开始 */
        this.gameStarted = false;
        /** Server tick 间隔引用 */
        this.tickInterval = null;
        /** 公式配置 */
        this.formulas = {};
        /** 难度配置 */
        this.difficultyConfig = {};
    }
    // ─────────── Lifecycle ───────────
    onCreate(options) {
        this.setState(new BattleState_1.BattleRoomState());
        // 防止房间在等待阶段被自动销毁（仅在全员离开时手动释放）
        this.autoDispose = false;
        // 加载共享配置文件
        this._loadConfigs();
        // 注册消息处理器
        this.onMessage('input', (client, message) => {
            this._handleInput(client, message);
        });
        this.onMessage('ready', (client) => {
            this._handleReady(client);
        });
        this.onMessage('selectChar', (client, message) => {
            this._handleSelectChar(client, message.characterId);
        });
        this.onMessage('skillChoice', (client, message) => {
            this._handleSkillChoice(client, message.skillId);
        });
        this.onMessage('useSkill', (client) => {
            this._handleUseSkill(client);
        });
        // Ping/Pong for latency measurement
        this.onMessage('ping', (client) => {
            client.send('pong', {});
        });
        // DEBUG: 捕获所有消息（通配符 '*'）
        this.onMessage('*', (client, type, message) => {
            console.log(`[BattleRoom] ★ Received message type='${type}' from ${client.sessionId}`, JSON.stringify(message).substring(0, 100));
        });
        console.log(`[BattleRoom] Room created: ${this.roomId} (max ${this.maxClients} players)`);
    }
    onJoin(client, options) {
        const characterId = options?.characterId || 'ranger';
        const charConfig = this.characters[characterId];
        // 创建 PlayerState
        const player = new PlayerState_1.PlayerState();
        player.sessionId = client.sessionId;
        player.characterId = characterId;
        if (charConfig) {
            // 联网模式 HP 加成（单人太脆弱）
            const hpMultiplier = 3.0;
            player.maxHp = Math.ceil(charConfig.stats.maxHp * hpMultiplier);
            player.hp = player.maxHp;
            player.moveSpeed = charConfig.stats.moveSpeed;
        }
        // 从关卡配置读取出生点
        const tileSize = this.levels?.levels?.[0]?.tileSize || 64;
        const startRoom = this.levels?.levels?.[0]?.rooms?.find((r) => r.type === 'start') || this.levels?.levels?.[0]?.rooms?.[0];
        const roomOffX = startRoom?.offsetX ?? startRoom?.x ?? 0;
        const roomOffY = startRoom?.offsetY ?? startRoom?.y ?? 0;
        const spawnGrid = startRoom?.playerSpawn || { gridX: 5, gridY: 5 };
        const baseX = (roomOffX + spawnGrid.gridX) * tileSize + tileSize / 2;
        const baseY = (roomOffY + spawnGrid.gridY) * tileSize + tileSize / 2;
        // 分散多个玩家出生点（基于基础出生点偏移）
        const offsets = [
            { x: 0, y: 0 },
            { x: tileSize, y: 0 },
            { x: 0, y: tileSize },
            { x: tileSize, y: tileSize },
        ];
        const spawnIdx = this.state.players.size;
        const off = offsets[spawnIdx % offsets.length];
        player.x = baseX + off.x;
        player.y = baseY + off.y;
        this.state.players.set(client.sessionId, player);
        console.log(`[BattleRoom] ${client.sessionId} joined as ${characterId} (${this.state.players.size}/${this.maxClients})`);
        // 通知所有人
        this.broadcast('notification', {
            text: `Player joined (${this.state.players.size}/${this.maxClients})`,
            type: 'info'
        });
    }
    onLeave(client, consented) {
        // 移除玩家状态
        this.state.players.delete(client.sessionId);
        this.readyPlayers.delete(client.sessionId);
        console.log(`[BattleRoom] ${client.sessionId} left (consented: ${consented}), remaining: ${this.state.players.size}`);
        // 通知剩余玩家
        if (this.state.players.size > 0) {
            this.broadcast('notification', {
                text: `Player left (${this.state.players.size}/${this.maxClients})`,
                type: 'warning'
            });
        }
        // 全员离开时停止游戏并手动销毁房间（autoDispose=false）
        if (this.state.players.size === 0) {
            if (this.gameStarted) {
                this._stopGame();
            }
            console.log(`[BattleRoom] All players left, disposing room ${this.roomId}`);
            this.disconnect();
        }
    }
    onDispose() {
        this._stopGame();
        console.log(`[BattleRoom] Room ${this.roomId} disposed`);
    }
    // ─────────── Message Handlers ───────────
    /** 处理玩家移动输入 */
    _handleInput(client, msg) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.alive)
            return;
        const { seq, dx, dy, dt } = msg;
        // 验证 dt 合理性（防作弊：不超过 100ms）
        const safeDt = Math.min(Math.max(dt, 0), 0.1);
        // 计算新位置
        let newX = player.x + dx * player.moveSpeed * safeDt;
        let newY = player.y + dy * player.moveSpeed * safeDt;
        // ServerPhysics 墙壁碰撞检测（仅游戏开始后物理系统才存在）
        if (this.physics) {
            const resolved = this.physics.resolveMovement(player.x, player.y, newX, newY, 24);
            newX = resolved.x;
            newY = resolved.y;
        }
        player.x = newX;
        player.y = newY;
        player.inputSeq = seq;
    }
    /** 处理玩家 ready 状态 */
    _handleReady(client) {
        const player = this.state.players.get(client.sessionId);
        if (!player)
            return;
        if (this.readyPlayers.has(client.sessionId)) {
            // 取消 ready
            this.readyPlayers.delete(client.sessionId);
            player.ready = false;
        }
        else {
            // 设为 ready
            this.readyPlayers.add(client.sessionId);
            player.ready = true;
        }
        console.log(`[BattleRoom] ${client.sessionId} ready: ${player.ready} (${this.readyPlayers.size}/${this.state.players.size})`);
        // 检查是否全员 ready
        if (this.readyPlayers.size === this.state.players.size && this.state.players.size > 0) {
            this._startGame();
        }
    }
    /** 处理角色切换 */
    _handleSelectChar(client, characterId) {
        if (this.gameStarted)
            return; // 游戏中不能切角色
        const player = this.state.players.get(client.sessionId);
        if (!player)
            return;
        const charConfig = this.characters[characterId];
        if (!charConfig)
            return;
        player.characterId = characterId;
        player.maxHp = charConfig.stats.maxHp;
        player.hp = charConfig.stats.maxHp;
        player.moveSpeed = charConfig.stats.moveSpeed;
        console.log(`[BattleRoom] ${client.sessionId} switched to ${characterId}`);
    }
    /** 处理技能选择 */
    _handleSkillChoice(client, skillId) {
        const player = this.state.players.get(client.sessionId);
        if (!player)
            return;
        // TODO: Task 3.4 — ServerCombat 处理技能选择
        console.log(`[BattleRoom] ${client.sessionId} chose skill: ${skillId}`);
    }
    /** 处理主动技能释放 */
    _handleUseSkill(client) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.alive)
            return;
        // TODO: Task 3.4 — ServerCombat 处理主动技能
        console.log(`[BattleRoom] ${client.sessionId} used active skill`);
    }
    // ─────────── Game Loop ───────────
    /** 启动游戏 */
    _startGame() {
        if (this.gameStarted)
            return;
        this.gameStarted = true;
        // 初始化难度缩放
        this.difficultyScaler = new DifficultyScaler_1.DifficultyScaler(this.difficultyConfig.scalingFormula ? this.difficultyConfig : {
            scalingFormula: 'linear', baseMultiplier: 1.0, perPlayerAdd: 0.5,
            fields: { monsterHp: true, monsterCount: true, monsterDamage: false, bossHp: true }
        });
        this.difficultyScaler.updatePlayerCount(this.state.players.size);
        // 初始化物理系统
        this.physics = new ServerPhysics_1.ServerPhysics();
        const levelId = this.state.levelState.currentLevel;
        const levelConfig = this.levels?.levels?.[levelId - 1] || this.levels?.levels?.[0];
        if (levelConfig) {
            this.physics.loadLevel(levelConfig);
            this.state.levelState.killsToOpenBoss = levelConfig.killsToOpenBoss || 5;
        }
        // 初始化生成器
        this.spawner = new ServerSpawner_1.ServerSpawner(this.state.monsters, this.physics);
        this.spawner.setDifficultyMultiplier(this.difficultyScaler.multiplier);
        if (levelConfig) {
            this.spawner.loadLevel(levelConfig);
        }
        // 初始化 AI
        this.ai = new ServerAI_1.ServerAI(this.state.monsters, this.state.players, this.physics);
        // 初始化战斗系统
        this.combat = new ServerCombat_1.ServerCombat(this.state.players, this.state.monsters, this.state.projectiles, this.state.drops, this.physics);
        this.combat.loadConfigs(this.formulas, this.characters);
        this.combat.onDamageEvent = (event) => {
            this.broadcast('damageEvent', event);
        };
        this.combat.onSfxEvent = (event) => {
            this.broadcast('sfxEvent', event);
        };
        this.combat.onLevelUp = (playerId, newLevel) => {
            // 发送给特定客户端
            const client = this.clients.find(c => c.sessionId === playerId);
            if (client) {
                client.send('levelUp', { playerId, newLevel, skillOptions: [] });
            }
            this.broadcast('sfxEvent', { soundId: 'level_up', x: 0, y: 0 });
        };
        // AI 接触伤害回调（必须在 combat 初始化之后）
        this.ai.onContactDamage = (playerId, damage, monsterId) => {
            this.combat.dealDamageToPlayer(playerId, damage, monsterId);
        };
        // 怪物击杀回调 → Boss 检测 + 关卡切换
        this.combat.onMonsterKill = (monsterId, monsterType) => {
            console.log(`[BattleRoom] Monster killed: ${monsterId} (type="${monsterType}"), phase=${this.state.levelState.phase}, level=${this.state.levelState.currentLevel}`);
            if (monsterType.startsWith('boss')) {
                console.log(`[BattleRoom] ★ Boss killed! Triggering level transition... (phase=${this.state.levelState.phase})`);
                this._onBossDefeated();
            }
        };
        this.state.levelState.phase = 'battle';
        // 以 20Hz (50ms) tick rate 运行游戏循环
        this.setSimulationInterval((deltaTime) => {
            this._gameTick(deltaTime);
        }, 50);
        console.log(`[BattleRoom] 🎮 Game started! ${this.state.players.size} players, difficulty: ${this.difficultyScaler.multiplier}x, tick: 20Hz`);
        this.broadcast('notification', {
            text: 'Battle Start!',
            type: 'success'
        });
    }
    /** 停止游戏 */
    _stopGame() {
        this.gameStarted = false;
        // Colyseus 会自动清理 setSimulationInterval
    }
    /** 每 tick 执行的游戏逻辑 (20Hz) */
    _gameTick(deltaTime) {
        const dt = deltaTime / 1000; // ms → s
        if (this.state.levelState.phase === 'battle' || this.state.levelState.phase === 'boss') {
            // 1. 怪物生成
            if (this.spawner)
                this.spawner.update(dt);
            // 2. 怪物 AI（追击 + 接触伤害）
            if (this.ai)
                this.ai.update(dt);
            // 3. 战斗系统（自动射击 + 投射物 + 碰撞 + 经验）
            if (this.combat) {
                this.combat.update(dt);
                this.combat.checkPickups();
                this.combat.cleanupDrops();
            }
            // 4. 关卡进度判定
            this._checkLevelProgress();
        }
        // 检查全灭
        this._checkGameOver();
    }
    /** 检查关卡进度（Boss 门、通关） */
    _checkLevelProgress() {
        const ls = this.state.levelState;
        // 统计全队击杀
        let totalKills = 0;
        this.state.players.forEach(p => { totalKills += p.kills; });
        ls.totalKills = totalKills;
        // Boss 门开启判定
        if (!ls.bossGateOpen && totalKills >= ls.killsToOpenBoss) {
            ls.bossGateOpen = true;
            // 在服务端物理系统中将 boss 门的墙壁改为可通行
            this._openBossGatePhysics();
            // 激活 Boss 房间的怪物生成（包括 Boss 本身）
            if (this.spawner) {
                this.spawner.activateBossRoom();
            }
            this.broadcast('notification', { text: 'Boss Gate Opened!', type: 'success' });
            this.broadcast('sfxEvent', { soundId: 'gate_open', x: 0, y: 0 });
            console.log(`[BattleRoom] Boss gate opened! Kills: ${totalKills}/${ls.killsToOpenBoss}`);
        }
    }
    /** 在服务端物理层打开 Boss 门（将墙壁瓦片改为可通行） */
    _openBossGatePhysics() {
        const levelIdx = this.state.levelState.currentLevel - 1;
        const levelConfig = this.levels?.levels?.[levelIdx] || this.levels?.levels?.[0];
        if (!levelConfig || !this.physics)
            return;
        const rooms = levelConfig.rooms || [];
        for (const room of rooms) {
            if (room.type !== 'boss' || !room.gate)
                continue;
            const roomX = room.offsetX ?? room.x ?? 0;
            const roomY = room.offsetY ?? room.y ?? 0;
            const gate = room.gate;
            const gateW = gate.width || 1;
            const gateH = gate.height || 1;
            for (let dy = 0; dy < gateH; dy++) {
                for (let dx = 0; dx < gateW; dx++) {
                    const gx = roomX + gate.gridX + dx;
                    const gy = roomY + gate.gridY + dy;
                    const idx = gy * this.physics.mapWidth + gx;
                    if (idx >= 0 && idx < this.physics.wallLayer.length) {
                        this.physics.wallLayer[idx] = -1; // 移除墙壁
                        this.physics.groundLayer[idx] = 0; // 设为空地（可通行）
                    }
                }
            }
            console.log(`[BattleRoom] Boss gate physics opened at room ${room.id} (${roomX + gate.gridX}, ${roomY + gate.gridY}) size ${gateW}x${gateH}`);
        }
    }
    /** 检查是否全员死亡 */
    _checkGameOver() {
        if (this.state.levelState.phase !== 'battle' && this.state.levelState.phase !== 'boss')
            return;
        let allDead = true;
        this.state.players.forEach((player) => {
            if (player.alive)
                allDead = false;
        });
        if (allDead && this.state.players.size > 0) {
            this.state.levelState.phase = 'gameover';
            this.broadcast('notification', {
                text: 'Game Over - All players defeated',
                type: 'error'
            });
            console.log(`[BattleRoom] Game Over — all players dead`);
        }
    }
    /** Boss 被击杀 → 切换到下一关 */
    _onBossDefeated() {
        const ls = this.state.levelState;
        const totalLevels = this.levels?.levels?.length || 1;
        const currentIdx = ls.currentLevel - 1;
        console.log(`[BattleRoom] Boss defeated! Level ${ls.currentLevel}/${totalLevels}, phase=${ls.phase}`);
        if (currentIdx + 1 < totalLevels) {
            // 还有下一关 — 暂停战斗，广播通关消息
            ls.phase = 'victory';
            this.broadcast('levelComplete', { final: false, level: ls.currentLevel });
            this.broadcast('notification', { text: 'Level Complete!', type: 'success' });
            // 2 秒后切换到下一关
            this.clock.setTimeout(() => {
                this._loadNextLevel(currentIdx + 1);
            }, 2000);
        }
        else {
            // 最后一关通关
            ls.phase = 'victory';
            this.broadcast('levelComplete', { final: true, level: ls.currentLevel });
            this.broadcast('notification', { text: 'All Levels Complete! Victory!', type: 'success' });
        }
    }
    /** 加载下一关 */
    _loadNextLevel(levelIdx) {
        const ls = this.state.levelState;
        ls.currentLevel = levelIdx + 1;
        ls.bossGateOpen = false;
        ls.totalKills = 0;
        // 重置玩家击杀数
        this.state.players.forEach(p => { p.kills = 0; });
        // 清理所有怪物和投射物
        this.state.monsters.clear();
        this.state.projectiles.clear();
        this.state.drops.clear();
        // 重新加载地图物理
        const levelConfig = this.levels.levels[levelIdx];
        if (levelConfig && this.physics) {
            this.physics.loadLevel(levelConfig);
            ls.killsToOpenBoss = levelConfig.killsToOpenBoss || 5;
        }
        // 重新加载生成器
        if (this.spawner && levelConfig) {
            this.spawner.loadLevel(levelConfig);
        }
        // 重置玩家位置到新关卡出生点
        const tileSize = levelConfig?.tileSize || 64;
        const startRoom = levelConfig?.rooms?.find((r) => r.type === 'start') || levelConfig?.rooms?.[0];
        const roomOffX = startRoom?.offsetX ?? startRoom?.x ?? 0;
        const roomOffY = startRoom?.offsetY ?? startRoom?.y ?? 0;
        const spawnGrid = startRoom?.playerSpawn || { gridX: 5, gridY: 5 };
        const baseX = (roomOffX + spawnGrid.gridX) * tileSize + tileSize / 2;
        const baseY = (roomOffY + spawnGrid.gridY) * tileSize + tileSize / 2;
        let i = 0;
        this.state.players.forEach(p => {
            const offsets = [{ x: 0, y: 0 }, { x: tileSize, y: 0 }, { x: 0, y: tileSize }, { x: tileSize, y: tileSize }];
            const off = offsets[i % offsets.length];
            p.x = baseX + off.x;
            p.y = baseY + off.y;
            p.alive = true;
            p.hp = p.maxHp; // 恢复满血
            p.kills = 0;
            i++;
        });
        ls.phase = 'battle';
        this.broadcast('notification', {
            text: `Level ${ls.currentLevel} Start!`,
            type: 'info'
        });
        console.log(`[BattleRoom] Loaded level ${ls.currentLevel}: ${levelConfig?.name || 'unknown'}`);
    }
    // ─────────── Config Loading ───────────
    /** 加载共享 JSON 配置 */
    _loadConfigs() {
        try {
            const dataDir = path.resolve(__dirname, '../../assets/data');
            // 尝试共享目录，如果不存在则尝试项目根目录
            const altDataDir = path.resolve(__dirname, '../../../assets/data');
            const dir = fs.existsSync(dataDir) ? dataDir : altDataDir;
            const charsPath = path.join(dir, 'characters.json');
            if (fs.existsSync(charsPath)) {
                this.characters = JSON.parse(fs.readFileSync(charsPath, 'utf-8'));
                console.log(`[BattleRoom] Loaded ${Object.keys(this.characters).length} characters`);
            }
            const levelsPath = path.join(dir, 'levels.json');
            if (fs.existsSync(levelsPath)) {
                this.levels = JSON.parse(fs.readFileSync(levelsPath, 'utf-8'));
                console.log(`[BattleRoom] Loaded levels config`);
            }
            const formulasPath = path.join(dir, 'formulas.json');
            if (fs.existsSync(formulasPath)) {
                this.formulas = JSON.parse(fs.readFileSync(formulasPath, 'utf-8'));
                console.log(`[BattleRoom] Loaded formulas config`);
            }
            const diffPath = path.join(dir, 'difficulty.json');
            if (fs.existsSync(diffPath)) {
                this.difficultyConfig = JSON.parse(fs.readFileSync(diffPath, 'utf-8'));
                console.log(`[BattleRoom] Loaded difficulty config`);
            }
        }
        catch (err) {
            console.error('[BattleRoom] Failed to load configs:', err);
        }
    }
}
exports.BattleRoom = BattleRoom;
//# sourceMappingURL=BattleRoom.js.map