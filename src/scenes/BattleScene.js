import { Scene } from '../core/Scene.js';
import { TilemapData } from '../map/TilemapData.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ExperienceSystem } from '../systems/ExperienceSystem.js';
import { LevelManager } from '../systems/LevelManager.js';
import { PlayerFactory } from '../entities/PlayerFactory.js';
import { MonsterFactory } from '../entities/MonsterFactory.js';
import { ProjectileFactory } from '../entities/ProjectileFactory.js';
import { DropItemFactory } from '../entities/DropItemFactory.js';
import { HUD } from '../ui/HUD.js';
import { GameOverUI } from '../ui/GameOverUI.js';
import { SkillSelectUI } from '../ui/SkillSelectUI.js';
import { KeybindSettingsUI } from '../ui/KeybindSettingsUI.js';
import { LevelCompleteUI } from '../ui/LevelCompleteUI.js';
import { SkillComponent } from '../components/SkillComponent.js';
import { AudioManager } from '../systems/AudioManager.js';
import { BGMController } from '../systems/BGMController.js';
import { NetworkManager } from '../systems/NetworkManager.js';
import { addClickOrTouch } from '../utils/addClickOrTouch.js';
import { PredictionSystem } from '../systems/PredictionSystem.js';
import { InterpolationSystem } from '../systems/InterpolationSystem.js';
import { StateSynchronizer } from '../systems/StateSynchronizer.js';

// 数据配置 — 通过 fetch 加载（浏览器原生 ES Module 不支持 import JSON）
const DATA_BASE_PATH = './assets/data';
/** 生成带缓存破坏参数的 URL，避免浏览器缓存旧文件 */
const nocache = (url) => `${url}?v=${Date.now()}`;

/**
 * BattleScene — 战斗主场景
 * Unity equivalent: BattleScene + WaveManager + GameManager
 *
 * 集成刷怪、战斗、掉落、经验、HUD、GameOver 全流程
 */
export class BattleScene extends Scene {
    constructor(name, systems) {
        super(name, systems);

        // --- 地图 / 关卡 ---
        this.tilemapData = null;
        this.levelManager = null;

        // --- 数据配置 ---
        this.playerConfig = null;
        this.monstersConfig = null;
        this.formulasConfig = null;
        this.skillsConfig = null;
        this.charactersConfig = null;   // P3: 角色配置

        // --- 工厂 ---
        this.playerFactory = null;
        this.monsterFactory = null;
        this.projectileFactory = null;
        this.dropItemFactory = null;

        // --- 系统 ---
        this.combatSystem = null;
        this.experienceSystem = null;

        // --- UI ---
        this.hud = null;
        this.gameOverUI = null;
        this.skillSelectUI = null;
        this.keybindSettingsUI = null;
        this.levelCompleteUI = null;

        // --- 暂停菜单 ---
        this._pauseMenuBtnRects = [];
        this._pauseMenuOnClick = null;

        // --- 引用 ---
        this.player = null;

        // --- P5: 网络 / 多人 ---
        this.isOnline = false;
        this.predictionSystem = null;
        this.interpolationSystem = null;
        this.stateSynchronizer = null;

        // --- 数据加载标志 ---
        this._dataLoaded = false;
    }

    /**
     * 场景初始化
     */
    async init() {
        // 1. 加载配置数据
        await this._loadConfigs();

        const { entityManager, camera, eventSystem, ctx, canvas, gameLoop, sceneManager } = this.systems;

        // 2. 创建关卡地图（LevelManager 驱动）
        this.levelManager = new LevelManager({ eventSystem });
        await this.levelManager.loadAllLevels();

        // 从 sceneData 获取 levelId，默认第一关
        // 联网模式始终从第一关开始（服务端控制关卡进度）
        const isOnline = sceneManager?.sceneData?.isOnline || false;
        const levelId = isOnline ? 'level_1' : (sceneManager ? (sceneManager.sceneData.levelId || 'level_1') : 'level_1');
        this.levelManager.loadLevel(levelId);

        this.tilemapData = this.levelManager.buildTilemapData();

        if (this.systems.tilemapRenderer) {
            this.systems.tilemapRenderer.setData(this.tilemapData);
        }

        const mapSize = this.tilemapData.getWorldSize();
        camera.setBounds(0, 0, mapSize.width, mapSize.height);

        // 初始化 Boss 门（设为墙壁）
        this._initBossGate();

        // 3. 初始化战斗系统
        this.combatSystem = new CombatSystem({
            eventSystem,
            formulas: this.formulasConfig
        });

        // 4. 初始化经验系统
        // [Network] 联机模式下不注册本地 onPickup 监听（经验由服务端权威管理）
        this.experienceSystem = new ExperienceSystem({
            eventSystem: isOnline ? null : eventSystem,  // ★ 修复：使用局部 isOnline（原 this._data 不存在）
            formulas: this.formulasConfig
        });

        // 5. 初始化工厂（先 ProjectileFactory）
        this.projectileFactory = new ProjectileFactory({
            entityManager,
            combatSystem: this.combatSystem,
            physicsSystem: this.systems.physicsSystem
        });

        // P2: 加载技能配置
        await this._loadSkillsConfig();

        // P3: 加载角色配置
        await this._loadCharactersConfig();

        // 挂载到 systems 引用
        const factorySystems = {
            ...this.systems,
            tilemapData: this.tilemapData,
            combatSystem: this.combatSystem,
            projectileFactory: this.projectileFactory,
            skillPool: this.skillsConfig
        };

        // P3: PlayerFactory 接收 charactersConfig 作为第三个参数
        this.playerFactory = new PlayerFactory(factorySystems, this.playerConfig, this.charactersConfig);
        this.monsterFactory = new MonsterFactory(factorySystems, this.monstersConfig);
        this.dropItemFactory = new DropItemFactory(factorySystems);

        // P5: 检测是否联机模式
        const sceneData = this.systems.sceneManager?.sceneData || {};
        this.isOnline = sceneData.isOnline === true && NetworkManager.getInstance().isOnline;

        // 6. 创建玩家（从 LevelManager 获取出生点）
        const characterId = this.systems.sceneManager
            ? (this.systems.sceneManager.sceneData.characterId || null)
            : null;
        const spawnPos = this.levelManager.getPlayerSpawnWorldPos();
        this.player = this.playerFactory.create({
            characterId,
            position: spawnPos
        });

        // 摄像机跟随
        camera.setTarget(this.player);
        camera.snapToTarget();

        // ★ 6b. 跨关卡恢复：从 sceneData 恢复技能 & 经验快照
        if (sceneData.skillSnapshot) {
            const playerSkill = this.player.getComponent(SkillComponent);
            if (playerSkill) {
                // 清掉 PlayerFactory 默认添加的初始武器，用快照覆盖
                playerSkill.weapons = [];
                playerSkill.passives = [];
                playerSkill.deserialize(sceneData.skillSnapshot);
            }
            delete sceneData.skillSnapshot;  // 用完清除，防止重复恢复
        }
        if (sceneData.expSnapshot) {
            this.experienceSystem.level = sceneData.expSnapshot.level;
            this.experienceSystem.currentExp = sceneData.expSnapshot.currentExp;
            this.experienceSystem.expToNextLevel = this.experienceSystem._calcExpToLevel(sceneData.expSnapshot.level);
            this.experienceSystem.killCount = sceneData.expSnapshot.killCount || 0;
            console.log(`[BattleScene] Restored exp: Lv.${this.experienceSystem.level} (${this.experienceSystem.currentExp}/${this.experienceSystem.expToNextLevel})`);
            delete sceneData.expSnapshot;
        }

        // 7. 初始化 HUD
        this.hud = new HUD({
            ctx,
            camera,
            entityManager,
            experienceSystem: this.experienceSystem,
            inputManager: this.systems.inputManager
        });
        this.hud.setPlayer(this.player);

        // 8. 初始化 GameOverUI
        this.gameOverUI = new GameOverUI({
            ctx,
            canvas,
            eventSystem,
            experienceSystem: this.experienceSystem,
            gameLoop,
            sceneManager
        });

        // 9. P4: 初始化 KeybindSettingsUI
        this.keybindSettingsUI = new KeybindSettingsUI({
            inputManager: this.systems.inputManager,
            canvas
        });

        // 10. P2: 初始化 SkillSelectUI
        this.skillSelectUI = new SkillSelectUI({
            ctx,
            canvas,
            eventSystem,
            gameLoop
        });
        // 获取玩家的 SkillComponent 并传给 UI
        const playerSkillComp = this.player.getComponent(SkillComponent);
        if (playerSkillComp) {
            this.skillSelectUI.setSkillComponent(playerSkillComp);
        }

        // 10. P2: 监听升级事件 → 弹出技能选择弹窗
        this._onLevelUpHandler = (data) => {
            if (this.skillSelectUI && !this.gameOverUI.isShowing) {
                this.skillSelectUI.show();
            }
        };
        eventSystem.on('onLevelUp', this._onLevelUpHandler);

        // 11. 监听怪物死亡 → 掉落经验球 + 击杀计数（Boss/enemy 都掉）
        this._onDeathHandler = (data) => {
            const deadEntity = data.entity || data;
            if (!deadEntity) return;
            if (deadEntity.tag !== 'enemy' && deadEntity.tag !== 'boss') return;

            // 击杀计数（仅 enemy 影响 experienceSystem 的 killCount）
            if (deadEntity.tag === 'enemy') {
                this.experienceSystem.killCount++;
            }

            // 掉落经验球
            const expValue = deadEntity._expValue || 10;
            this.dropItemFactory.spawnDrops({
                position: { ...deadEntity.transform.position },
                expValue,
                expPerBall: this.formulasConfig.expPerBall || 5
            });
        };
        eventSystem.on('onDeath', this._onDeathHandler);

        // 12. P5: 联机模式 vs 单机模式分支
        if (this.isOnline) {
            // online: 怪物由 Server 控制，不本地刷怪
            this._initNetworkSystems();
        } else {
            // offline: 本地刷怪（原有逻辑）
            this._spawnAllMonsters();
        }

        // 13. LevelManager 开始监听死亡事件（击杀计数 + Boss 门 + 通关）
        // online 模式下由 StateSynchronizer 触发事件，LevelManager 依然监听
        this.levelManager._isOnline = this.isOnline || false;
        this.levelManager.startListening();

        // 14. 监听 Boss 门开启事件
        this._onBossGateOpenHandler = (data) => {
            this._openBossGate(data.gateRect);
            // Boss 门开启音效
            if (this.audioManager) this.audioManager.playSFX('gate_open');
        };
        eventSystem.on('onBossGateOpen', this._onBossGateOpenHandler);

        // 15. 监听通关事件
        this._onLevelCompleteHandler = (data) => {
            // 通关音效
            if (this.audioManager) {
                this.audioManager.playSFX('level_complete');
            }

            // 联网模式：显示通关 UI（不暂停游戏）
            if (this.isOnline) {
                // 防止重复触发（用 levelCompleteUI.isShowing 判断）
                if (this.levelCompleteUI && this.levelCompleteUI.isShowing) {
                    console.log('[BattleScene] Online: levelComplete ignored (UI already showing)');
                    return;
                }

                if (data?.isFinal) {
                    // 最终通关
                    console.log('[BattleScene] Online mode: ALL LEVELS COMPLETE!');
                    if (this.levelCompleteUI) {
                        this.levelCompleteUI.show({
                            levelName: '全部关卡通关！',
                            killCount: data.killCount || 0,
                            nextLevelId: null,
                            isOnline: true
                        });
                    }
                } else {
                    // 中间关卡通关 — 显示短暂提示，服务端2秒后自动切关
                    console.log('[BattleScene] Online mode: level complete, server will auto-load next level...');
                    if (this.levelCompleteUI) {
                        const levelName = this.levelManager?.currentLevel?.name || `Level ${data?.level || '?'}`;
                        this.levelCompleteUI.show({
                            levelName: levelName,
                            killCount: data?.killCount || 0,
                            nextLevelId: '__auto__',
                            isOnline: true
                        });
                    }
                }
                return;
            }

            // 离线模式：停 BGM + 弹出通关 UI（暂停游戏）
            if (this.audioManager) {
                this.audioManager.stopBGM(1.0);
            }
            if (this.levelCompleteUI) {
                // ★ 注入技能 & 经验快照，供下一关恢复
                const playerSkill = this.player?.getComponent(SkillComponent);
                if (playerSkill) {
                    data.skillSnapshot = playerSkill.serialize();
                }
                data.expSnapshot = {
                    level: this.experienceSystem.level,
                    currentExp: this.experienceSystem.currentExp,
                    killCount: this.experienceSystem.killCount
                };
                this.levelCompleteUI.show(data);
            }
        };
        eventSystem.on('onLevelComplete', this._onLevelCompleteHandler);

        // 15b. 联网模式：监听服务端关卡切换
        if (this.isOnline) {
            this._onNetLevelChangeHandler = async (data) => {
                // 关闭通关 UI（如果正在显示）
                if (this.levelCompleteUI && this.levelCompleteUI.isShowing) {
                    this.levelCompleteUI.isShowing = false;
                    this.levelCompleteUI._data = null;
                    console.log('[BattleScene] Online: closed level complete UI for level transition');
                }

                const levelIdx = data.level - 1;
                const levels = this.levelManager?._levelsConfig;
                if (!levels || !levels[levelIdx]) return;

                const newLevel = levels[levelIdx];
                console.log(`[BattleScene] Online: loading level ${data.level} tilemap...`);

                // 更新 LevelManager 当前关卡
                if (this.levelManager) {
                    this.levelManager.currentLevel = newLevel;
                    this.levelManager.killCount = 0;
                    this.levelManager._bossGateOpened = false;

                    // 重建 tilemap 数据
                    this.tilemapData = this.levelManager.buildTilemapData();

                    // 更新渲染器
                    if (this.systems.tilemapRenderer) {
                        this.systems.tilemapRenderer.setData(this.tilemapData);
                    }

                    // 更新物理系统的碰撞地图
                    if (this.systems.physicsSystem && this.systems.physicsSystem.setTilemapData) {
                        this.systems.physicsSystem.setTilemapData(this.tilemapData);
                    }

                    // 更新世界尺寸和相机边界
                    const mapSize = this.tilemapData.getWorldSize();
                    if (this.systems.cameraSystem) {
                        this.systems.cameraSystem.setWorldBounds(mapSize.width, mapSize.height);
                    }

                    // 初始化新关卡的 Boss 门（设为墙壁）
                    this._initBossGate();

                    console.log(`[BattleScene] Online: tilemap rebuilt for level ${data.level} (${this.tilemapData.width}×${this.tilemapData.height})`);
                }

                // 重置 PredictionSystem 缓冲区（防止旧位置导致 reconcile 跳变）
                if (this.predictionSystem) {
                    this.predictionSystem.reset();
                }

                // 从服务端获取新出生点并同步到本地玩家
                const netMgr = NetworkManager.getInstance();
                const room = netMgr.room;
                if (room && this.player) {
                    const localState = room.state.players.get(room.sessionId);
                    if (localState) {
                        this.player.transform.position.x = localState.x;
                        this.player.transform.position.y = localState.y;
                        console.log(`[BattleScene] Synced player to new spawn: (${localState.x}, ${localState.y})`);
                    }
                }
            };
            eventSystem.on('onNetLevelChange', this._onNetLevelChangeHandler);
        }

        // 16. 初始化 LevelCompleteUI
        this.levelCompleteUI = new LevelCompleteUI({
            ctx,
            canvas,
            sceneManager,
            gameLoop
        });

        // 传递 levelManager 引用给 HUD
        if (this.hud) {
            this.hud.levelManager = this.levelManager;
        }

        // 17. 音频系统初始化
        this.audioManager = AudioManager.getInstance();
        await this.audioManager.init(DATA_BASE_PATH);

        // BGMController 延迟初始化：若 main.js 尚未创建则设置 deferred
        if (!this.audioManager.bgmController && !this.audioManager._deferredBGMInit) {
            this.audioManager._deferredBGMInit = () => {
                if (this.audioManager.bgmController) return;
                const backend = this.audioManager.backend;
                const audioCtx = backend.context;
                const bgmGain = backend.bgmGain;
                this.audioManager.bgmController = new BGMController(audioCtx, bgmGain);
                this.audioManager.applyPendingVolumes();
            };
        }

        // 注册全局 onSFX 事件监听
        this._onSFXHandler = (data) => {
            if (data && data.soundId) {
                this.audioManager.playSFX(data.soundId);
            }
        };
        eventSystem.on('onSFX', this._onSFXHandler);

        // 播放战斗 BGM（交叉淡入）
        this.audioManager.crossfadeBGM('bgm_battle', 1.0);

        this._dataLoaded = true;

        const mapSize2 = this.tilemapData.getWorldSize();
        console.log(`[BattleScene] Initialized — ${this.tilemapData.width}×${this.tilemapData.height} map, level: ${this.levelManager.currentLevel.name}, ${entityManager.count} entities`);
    }

    /**
     * 加载 JSON 配置
     * @private
     */
    async _loadConfigs() {
        try {
            const [playerRes, monstersRes, formulasRes] = await Promise.all([
                fetch(nocache(`${DATA_BASE_PATH}/player.json`)),
                fetch(nocache(`${DATA_BASE_PATH}/monsters.json`)),
                fetch(nocache(`${DATA_BASE_PATH}/formulas.json`))
            ]);
            this.playerConfig = await playerRes.json();
            this.monstersConfig = await monstersRes.json();
            this.formulasConfig = await formulasRes.json();
            console.log(`[BattleScene] Configs loaded — monsters: [${Object.keys(this.monstersConfig).join(', ')}]`);
        } catch (e) {
            console.error('[BattleScene] Failed to load configs:', e);
            // 使用内联默认值（包含全部怪物类型）
            this.playerConfig = { maxHp: 100, attack: 10, defense: 2, critRate: 0.1, critMultiplier: 1.5, moveSpeed: 150, attackSpeed: 0.5, attackRange: 200, projectileSpeed: 400, pickupRange: 80 };
            this.monstersConfig = {
                slime:         { name: '史莱姆',   maxHp: 30,  attack: 5,  defense: 0, moveSpeed: 60,  detectionRange: 300, attackRange: 50,  attackCooldown: 1.0, expValue: 10,  color: '#44CC44', size: 44, shape: 'circle'  },
                bat:           { name: '蝙蝠',     maxHp: 15,  attack: 8,  defense: 0, moveSpeed: 100, detectionRange: 350, attackRange: 45,  attackCooldown: 0.8, expValue: 15,  color: '#8844AA', size: 36, shape: 'triangle'},
                boss_slime:    { name: '巨型史莱姆', maxHp: 150, attack: 12, defense: 3, moveSpeed: 40,  detectionRange: 400, attackRange: 100, attackCooldown: 1.5, expValue: 100, color: '#FF4444', size: 80, shape: 'circle'  },
                skeleton:      { name: '骷髅兵',   maxHp: 45,  attack: 10, defense: 2, moveSpeed: 70,  detectionRange: 320, attackRange: 55,  attackCooldown: 0.9, expValue: 20,  color: '#CCCCAA', size: 42, shape: 'diamond' },
                ghost:         { name: '幽灵',     maxHp: 25,  attack: 14, defense: 0, moveSpeed: 90,  detectionRange: 400, attackRange: 40,  attackCooldown: 0.7, expValue: 25,  color: '#88BBFF', size: 38, shape: 'circle'  },
                boss_skeleton: { name: '骷髅王',   maxHp: 300, attack: 18, defense: 5, moveSpeed: 50,  detectionRange: 450, attackRange: 110, attackCooldown: 1.2, expValue: 200, color: '#FF8800', size: 90, shape: 'diamond' }
            };
            this.formulasConfig = { defenseRatio: 0.5, baseCritMultiplier: 1.5, levelScaling: 1.1, expPerBall: 5, baseExpToLevel: 50, expLevelMultiplier: 1.3 };
        }
    }

    /**
     * P2: 加载技能配置
     * @private
     */
    async _loadSkillsConfig() {
        try {
            const res = await fetch(nocache(`${DATA_BASE_PATH}/skills.json`));
            this.skillsConfig = await res.json();
        } catch (e) {
            console.error('[BattleScene] Failed to load skills.json:', e);
            this.skillsConfig = {};
        }
    }

    /**
     * P3: 加载角色配置
     * @private
     */
    async _loadCharactersConfig() {
        try {
            const res = await fetch(nocache(`${DATA_BASE_PATH}/characters.json`));
            this.charactersConfig = await res.json();
        } catch (e) {
            console.error('[BattleScene] Failed to load characters.json:', e);
            this.charactersConfig = {};
        }
    }

    /**
     * 每帧更新
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (!this._dataLoaded) return;

        // GameOver / LevelComplete 状态不更新（联网模式下仍需接收网络消息）
        if (this.gameOverUI && this.gameOverUI.isShowing) return;
        if (!this.isOnline && this.levelCompleteUI && this.levelCompleteUI.isShowing) return;

        // 存活时间
        if (this.gameOverUI) {
            this.gameOverUI.updateSurvivalTime(deltaTime);
        }

        // P5: 联机模式 — 更新网络子系统
        if (this.isOnline) {
            // 预测系统：处理本地输入
            if (this.predictionSystem && this.predictionSystem.isActive && this.player) {
                const input = this.systems.inputManager;
                const dx = input.getAxis('horizontal');
                const dy = input.getAxis('vertical');
                if (dx !== 0 || dy !== 0) {
                    this.predictionSystem.processInput(dx, dy, deltaTime);
                }
            }

            // 状态同步器：更新远程实体的插值位置
            if (this.stateSynchronizer) {
                this.stateSynchronizer.update(deltaTime);
            }
        }
    }

    // ============================================================
    // 关卡地图相关方法
    // ============================================================

    /**
     * 从 LevelManager 获取所有刷怪点，批量创建怪物
     * @private
     */
    /**
     * P5: 初始化联机网络子系统
     * @private
     */
    _initNetworkSystems() {
        const netMgr = NetworkManager.getInstance();
        const room = netMgr.room;
        if (!room) {
            console.error('[BattleScene] Online mode but no room available!');
            return;
        }

        // 在线模式下禁用本地 PlayerController 的移动（由 PredictionSystem 接管）
        // 但保留组件引用以读取 moveSpeed
        const playerCtrl = this.player?._components?.find(c => c.constructor.name === 'PlayerController');
        const moveSpeed = playerCtrl?.moveSpeed || 150;
        if (playerCtrl) {
            // 标记为网络模式，PlayerController.update 将跳过移动
            playerCtrl._networkMode = true;
        }

        // 从服务端获取本地玩家的权威位置并同步到本地实体
        const localState = room.state.players.get(room.sessionId);
        if (localState && this.player) {
            this.player.transform.position.x = localState.x;
            this.player.transform.position.y = localState.y;
            console.log(`[BattleScene] Synced local player to server pos: (${localState.x}, ${localState.y})`);
        }

        // 预测系统（不传本地物理系统 — 服务端权威碰撞）
        this.predictionSystem = new PredictionSystem(null);
        this.predictionSystem.activate(this.player, moveSpeed);

        // 插值系统
        this.interpolationSystem = new InterpolationSystem();
        this.interpolationSystem.activate();

        // 状态同步器
        this.stateSynchronizer = new StateSynchronizer({
            entityManager: this.systems.entityManager,
            eventSystem: this.systems.eventSystem,
            playerFactory: this.playerFactory,
            monsterFactory: this.monsterFactory,
            dropItemFactory: this.dropItemFactory,
            interpolationSystem: this.interpolationSystem,
            predictionSystem: this.predictionSystem,
            levelManager: this.levelManager
        });
        this.stateSynchronizer.bind(room);

        // 监听网络音效事件
        this.systems.eventSystem.on('onNetSfx', (data) => {
            if (this.audioManager && data.soundId) {
                this.audioManager.playSFX(data.soundId);
            }
        });

        // [Network] 监听服务端升级事件 → 桥接到本地 onLevelUp
        this.systems.eventSystem.on('onNetLevelUp', (data) => {
            // 仅处理本地玩家的升级
            if (data.playerId === room.sessionId && this.player) {
                console.log(`[BattleScene] Network level up! → Lv.${data.newLevel}`);
                // 触发本地升级事件（打开技能选择 UI 等）
                this.systems.eventSystem.emit('onLevelUp', {
                    entity: this.player,
                    newLevel: data.newLevel,
                    skillOptions: data.skillOptions
                });
            }
        });

        // [Network] 同步本地玩家的 exp/level/kills → 更新 ExperienceSystem (HUD 读取)
        if (localState) {
            localState.listen('exp', (value) => {
                if (this.experienceSystem) {
                    this.experienceSystem.currentExp = value;
                }
            });
            localState.listen('level', (value) => {
                if (this.experienceSystem) {
                    this.experienceSystem.level = value;
                    this.experienceSystem.expToNextLevel = this.experienceSystem._calcExpToLevel(value);
                }
            });
            localState.listen('kills', (value) => {
                if (this.experienceSystem) {
                    this.experienceSystem.killCount = value;
                }
            });
        }

        // [Network] 同步 LevelState 的 totalKills → 更新 LevelManager（Boss 门进度条）
        const levelState = room.state.levelState;
        if (levelState) {
            levelState.listen('totalKills', (value) => {
                if (this.levelManager) {
                    this.levelManager.killCount = value;
                }
            });
            levelState.listen('killsToOpenBoss', (value) => {
                if (this.levelManager && this.levelManager.currentLevel) {
                    this.levelManager.currentLevel.killsToOpenBoss = value;
                }
            });
        }

        // 发送 ready 信号（通知 Server 客户端已加载完成）
        netMgr.send('ready', {});

        console.log('[BattleScene] Network systems initialized (online mode)');
    }

    _spawnAllMonsters() {
        const spawns = this.levelManager.getAllSpawns();
        for (const spawn of spawns) {
            this.monsterFactory.create({
                type: spawn.monsterType,
                position: { x: spawn.x, y: spawn.y },
                isBoss: spawn.isBoss
            });
        }
        console.log(`[BattleScene] Spawned ${spawns.length} monsters from level config`);
    }

    /**
     * 初始化 Boss 门为墙壁
     * @private
     */
    _initBossGate() {
        const gateRect = this.levelManager.getBossGateWorldRect();
        if (!gateRect) return;

        // 确保门位置是墙壁
        for (let dy = 0; dy < gateRect._gateHeight; dy++) {
            for (let dx = 0; dx < gateRect._gateWidth; dx++) {
                this.tilemapData.setTile(gateRect._gridX + dx, gateRect._gridY + dy, 'wall', 3);
            }
        }
    }

    /**
     * 打开 Boss 门（将墙壁替换为地面）
     * @private
     * @param {object} gateRect
     */
    _openBossGate(gateRect) {
        if (!gateRect || !this.tilemapData) return;

        for (let dy = 0; dy < gateRect._gateHeight; dy++) {
            for (let dx = 0; dx < gateRect._gateWidth; dx++) {
                this.tilemapData.setTile(gateRect._gridX + dx, gateRect._gridY + dy, 'wall', -1);
                this.tilemapData.setTile(gateRect._gridX + dx, gateRect._gridY + dy, 'ground', 0);
            }
        }
        console.log('[BattleScene] Boss gate opened!');
    }

    /**
     * 联网模式：显示短暂通关提示（不暂停游戏）
     * @param {object} [data]
     */
    _showOnlineLevelComplete(data) {
        // 在画面中央显示 2 秒的通关文字
        const levelName = this.levelManager?.currentLevel?.name || `Level ${this.levelManager?.currentLevel?.id || '?'}`;
        this._onlineBanner = {
            text: `🎉 ${levelName} Complete!`,
            alpha: 1.0,
            timer: 2.5, // 显示 2.5 秒
        };
        console.log(`[BattleScene] Online: showing level complete banner for "${levelName}"`);
    }

    /**
     * 联网模式：显示最终通关提示
     */
    _showOnlineVictory() {
        this._onlineBanner = {
            text: '🏆 All Levels Complete! Victory!',
            alpha: 1.0,
            timer: 5.0,
            isVictory: true,
        };
    }

    /**
     * 场景级渲染回调（在 RenderSystem 之后调用）
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} deltaTime
     */
    renderUI(deltaTime) {
        if (!this._dataLoaded) return;

        // HUD
        if (this.hud) {
            this.hud.render(deltaTime);
        }

        // P2: 技能选择弹窗覆盖
        if (this.skillSelectUI) {
            this.skillSelectUI.render();
        }

        // Game Over 覆盖
        if (this.gameOverUI) {
            this.gameOverUI.render();
        }

        // Level Complete 覆盖
        if (this.levelCompleteUI) {
            this.levelCompleteUI.render();
        }

        // 联网模式：临时 Banner（通关/全通关提示）
        if (this._onlineBanner && this._onlineBanner.timer > 0) {
            const banner = this._onlineBanner;
            banner.timer -= deltaTime;
            banner.alpha = Math.min(1.0, banner.timer / 0.5); // 最后 0.5 秒淡出

            const ctx = this.systems.ctx;
            if (ctx) {
                const cw = ctx.canvas.width;
                const ch = ctx.canvas.height;
                ctx.save();

                // 半透明黑色背景条
                ctx.globalAlpha = banner.alpha * 0.7;
                ctx.fillStyle = '#000';
                ctx.fillRect(0, ch / 2 - 40, cw, 80);

                // 文字
                ctx.globalAlpha = banner.alpha;
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(banner.text, cw / 2, ch / 2);

                ctx.restore();
            }

            if (banner.timer <= 0) {
                const wasVictory = banner.isVictory || false;
                this._onlineBanner = null;

                // 全通关后返回主菜单
                if (wasVictory) {
                    const netMgr = NetworkManager.getInstance();
                    netMgr.disconnect();
                    this.systems.sceneManager.loadScene('character-select');
                }
            }
        }

        // P4: 暂停菜单覆盖（通关/死亡/技能选择界面期间不显示）
        if (this.systems.gameLoop && this.systems.gameLoop.isPaused
            && !(this.gameOverUI && this.gameOverUI.isShowing)
            && !(this.skillSelectUI && this.skillSelectUI.isShowing)
            && !(this.levelCompleteUI && this.levelCompleteUI.isShowing)) {
            this._renderPauseMenu();
        }

        // P4: 键位设置覆盖（在暂停菜单之上）
        if (this.keybindSettingsUI) {
            this.keybindSettingsUI.render(this.systems.ctx);
        }
    }

    /**
     * P4: 渲染暂停菜单
     * @private
     */
    _renderPauseMenu() {
        const ctx = this.systems.ctx;
        const cw = this.systems.canvas.width;
        const ch = this.systems.canvas.height;

        ctx.save();

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, cw, ch);

        // "已暂停" 标题
        ctx.font = 'bold 32px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏸ 已暂停', cw / 2, ch / 2 - 60);

        const btnW = 200;
        const btnH = 44;
        const btnX = (cw - btnW) / 2;
        this._pauseMenuBtnRects = [];

        // "继续游戏" 按钮
        let btnY = ch / 2 - 10;
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('▶ 继续游戏', cw / 2, btnY + btnH / 2);
        this._pauseMenuBtnRects.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'resume' });

        // "键位设置" 按钮（仅 keyboard 模式显示）
        if (this.systems.inputManager && this.systems.inputManager.getCurrentDeviceType() === 'keyboard') {
            btnY += btnH + 12;
            ctx.fillStyle = '#3498DB';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('⌨️ 键位设置', cw / 2, btnY + btnH / 2);
            this._pauseMenuBtnRects.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'keybind' });
        }

        // 音量控制面板
        btnY += btnH + 20;
        this._renderVolumeSliders(ctx, cw, btnY);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText('按 ESC 继续', cw / 2, btnY + 120);

        ctx.restore();

        // 注册点击（只注册一次）
        if (!this._pauseMenuCleanup) {
            this._pauseMenuCleanup = addClickOrTouch(this.systems.canvas, (pos) => this._handlePauseMenuClick(pos));
        }
    }

    /**
     * 渲染音量控制滑块
     * @private
     */
    _renderVolumeSliders(ctx, canvasWidth, startY) {
        if (!this.audioManager) return;

        const sliderW = 180;
        const sliderH = 8;
        const sliderX = (canvasWidth - sliderW) / 2;
        const gap = 28;

        const sliders = [
            { label: '🔊 主音量', get: () => this.audioManager.getMasterVolume(), set: (v) => this.audioManager.setMasterVolume(v) },
            { label: '💥 音效', get: () => this.audioManager.getSFXVolume(), set: (v) => this.audioManager.setSFXVolume(v) },
            { label: '🎵 音乐', get: () => this.audioManager.getBGMVolume(), set: (v) => this.audioManager.setBGMVolume(v) }
        ];

        this._volumeSliderRects = [];

        for (let i = 0; i < sliders.length; i++) {
            const s = sliders[i];
            const y = startY + i * gap;
            const value = s.get();

            // 标签
            ctx.font = '11px monospace';
            ctx.fillStyle = '#CCCCCC';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.label, canvasWidth / 2, y);

            // 滑条背景
            const barY = y + 10;
            ctx.fillStyle = '#333333';
            ctx.fillRect(sliderX, barY, sliderW, sliderH);

            // 滑条填充
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(sliderX, barY, sliderW * value, sliderH);

            // 滑块圆点
            const knobX = sliderX + sliderW * value;
            ctx.beginPath();
            ctx.arc(knobX, barY + sliderH / 2, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            // 百分比文字
            ctx.font = '9px monospace';
            ctx.fillStyle = '#888888';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(value * 100)}%`, sliderX + sliderW + 35, barY + sliderH / 2);

            this._volumeSliderRects.push({
                x: sliderX, y: barY, w: sliderW, h: sliderH + 12,
                setter: s.set
            });
        }
    }

    /**
     * P4: 处理暂停菜单点击
     * @private
     */
    _handlePauseMenuClick(pos) {
        if (!this.systems.gameLoop || !this.systems.gameLoop.isPaused) return;
        if (this.keybindSettingsUI && this.keybindSettingsUI.isOpen) return;

        const mx = pos.x;
        const my = pos.y;

        // 检查音量滑块点击
        if (this._volumeSliderRects) {
            for (const slider of this._volumeSliderRects) {
                if (mx >= slider.x && mx <= slider.x + slider.w &&
                    my >= slider.y - 4 && my <= slider.y + slider.h) {
                    const value = Math.max(0, Math.min(1, (mx - slider.x) / slider.w));
                    slider.setter(value);
                    return;
                }
            }
        }

        for (const btn of this._pauseMenuBtnRects) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                if (btn.action === 'resume') {
                    this.systems.gameLoop.resume();
                    // BGM 恢复
                    if (this.audioManager && this.audioManager.bgmController) {
                        this.audioManager.bgmController.resume();
                    }
                } else if (btn.action === 'keybind') {
                    this.keybindSettingsUI.open();
                }
                return;
            }
        }
    }

    /**
     * 场景销毁
     */
    destroy() {
        // 移除事件监听
        if (this.systems.eventSystem) {
            if (this._onDeathHandler) this.systems.eventSystem.off('onDeath', this._onDeathHandler);
            if (this._onLevelUpHandler) this.systems.eventSystem.off('onLevelUp', this._onLevelUpHandler);
            if (this._onBossGateOpenHandler) this.systems.eventSystem.off('onBossGateOpen', this._onBossGateOpenHandler);
            if (this._onLevelCompleteHandler) this.systems.eventSystem.off('onLevelComplete', this._onLevelCompleteHandler);
            if (this._onSFXHandler) this.systems.eventSystem.off('onSFX', this._onSFXHandler);
        }

        // 停止 BGM
        if (this.audioManager) {
            this.audioManager.stopBGM(0.5);
        }

        // 清理暂停菜单点击
        if (this._pauseMenuOnClick && this.systems.canvas) {
            this.systems.canvas.removeEventListener('click', this._pauseMenuOnClick);
            this._pauseMenuOnClick = null;
        }

        // 清理子系统
        if (this.levelManager) this.levelManager.dispose();
        if (this.experienceSystem) this.experienceSystem.dispose();
        if (this.gameOverUI) this.gameOverUI.dispose();
        if (this.skillSelectUI) this.skillSelectUI.dispose();
        if (this.keybindSettingsUI) this.keybindSettingsUI.close();
        if (this.levelCompleteUI) this.levelCompleteUI.dispose();

        // P5: 清理网络子系统
        if (this.stateSynchronizer) {
            this.stateSynchronizer.unbind();
            this.stateSynchronizer = null;
        }
        if (this.predictionSystem) {
            this.predictionSystem.deactivate();
            this.predictionSystem = null;
        }
        if (this.interpolationSystem) {
            this.interpolationSystem.deactivate();
            this.interpolationSystem = null;
        }

        this.tilemapData = null;
        this.player = null;
        this.hud = null;
        this.gameOverUI = null;
        this.skillSelectUI = null;
        this.keybindSettingsUI = null;
        this.levelCompleteUI = null;
        this.levelManager = null;
        this.combatSystem = null;
        this.experienceSystem = null;

        console.log('[BattleScene] Destroyed');
    }
}
