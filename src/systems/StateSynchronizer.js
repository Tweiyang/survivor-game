/**
 * StateSynchronizer — 状态同步器
 * Unity equivalent: NetworkObject lifecycle manager
 *
 * 负责将 Colyseus Schema 状态映射到本地 EntityManager 中的实体：
 * - 监听 players.onAdd/onRemove → 创建/销毁远程玩家
 * - 监听 monsters.onAdd/onRemove → 创建/销毁同步怪物（无 AI）
 * - 监听 drops.onAdd/onRemove → 创建/销毁掉落物
 * - 监听 levelState 变化 → 触发 Boss 门/通关/游戏结束
 * - 监听 Server 自定义消息 → 触发伤害飘字、音效、升级 UI
 */

import { NetworkManager } from './NetworkManager.js';
import { InterpolationSystem } from './InterpolationSystem.js';
import { PredictionSystem } from './PredictionSystem.js';
import { Entity } from '../core/Entity.js';
import { SpriteRenderer } from '../components/SpriteRenderer.js';

export class StateSynchronizer {
    /**
     * @param {object} params
     * @param {import('../core/EntityManager.js').EntityManager} params.entityManager
     * @param {import('../core/EventSystem.js').EventSystem} params.eventSystem
     * @param {import('../entities/PlayerFactory.js').PlayerFactory} params.playerFactory
     * @param {import('../entities/MonsterFactory.js').MonsterFactory} params.monsterFactory
     * @param {import('../entities/DropItemFactory.js').DropItemFactory} params.dropItemFactory
     * @param {InterpolationSystem} params.interpolationSystem
     * @param {PredictionSystem} params.predictionSystem
     */
    constructor(params) {
        this._entityManager = params.entityManager;
        this._eventSystem = params.eventSystem;
        this._playerFactory = params.playerFactory;
        this._monsterFactory = params.monsterFactory;
        this._dropItemFactory = params.dropItemFactory;
        this._interpolation = params.interpolationSystem;
        this._prediction = params.predictionSystem;
        this._levelManager = params.levelManager || null;

        /** 网络实体映射: networkId → localEntity */
        this._networkEntities = new Map();

        /** 本地玩家 sessionId（来自 NetworkManager） */
        this._localSessionId = null;

        /** Schema 变化监听清理函数 */
        this._disposers = [];

        /** NetworkManager 上注册的消息回调引用（用于清理） */
        this._netMsgCallbacks = [];

        /** 是否已绑定 */
        this._bound = false;
    }

    // ============================================================
    // 绑定 / 解绑
    // ============================================================

    /**
     * 绑定到 Room 的 state，开始监听所有 Schema 变化和自定义消息
     * @param {any} room - Colyseus Room 引用
     */
    bind(room) {
        if (this._bound) this.unbind();

        this._bound = true;
        this._localSessionId = room.sessionId;
        const state = room.state;

        // ────── Players ──────
        if (state.players) {
            state.players.onAdd((player, sessionId) => {
                this._onPlayerAdd(player, sessionId);
            });

            state.players.onRemove((player, sessionId) => {
                this._onPlayerRemove(sessionId);
            });
        }

        // ────── Monsters ──────
        if (state.monsters) {
            state.monsters.onAdd((monster, key) => {
                this._onMonsterAdd(monster, key);
            });

            state.monsters.onRemove((monster, key) => {
                this._onMonsterRemove(key);
            });
        }

        // ────── Drops ──────
        if (state.drops) {
            state.drops.onAdd((drop, key) => {
                this._onDropAdd(drop, key);
            });

            state.drops.onRemove((drop, key) => {
                this._onDropRemove(key);
            });
        }

        // ────── LevelState ──────
        if (state.levelState) {
            state.levelState.listen('bossGateOpen', (value, prevValue) => {
                if (value && !prevValue) {
                    // 从 LevelManager 获取门的矩形信息供客户端渲染层更新
                    const gateRect = this._levelManager?.getBossGateWorldRect?.() || null;
                    this._eventSystem.emit('onBossGateOpen', { gateRect });
                }
            });

            state.levelState.listen('phase', (value, prevValue) => {
                if (value === 'gameover') {
                    this._eventSystem.emit('onGameOver', { reason: 'allDead' });
                }
                // victory 由 room.onMessage('levelComplete') 处理，避免重复
            });

            state.levelState.listen('totalKills', (value) => {
                this._eventSystem.emit('onTotalKillsUpdate', { kills: value });
            });

            // 监听关卡切换（服务端切换到新关卡）
            state.levelState.listen('currentLevel', (value, prevValue) => {
                if (prevValue !== undefined && value !== prevValue) {
                    console.log(`[StateSynchronizer] Level changed: ${prevValue} → ${value}`);
                    this._eventSystem.emit('onNetLevelChange', { level: value });
                }
            });
        }

        // ────── 自定义消息 ──────
        const netMgr = NetworkManager.getInstance();
        this._netMsgCallbacks = [];

        // 伤害事件
        const dmgCb = (data) => { this._onDamageEvent(data); };
        netMgr.onMessage('damageEvent', dmgCb);
        this._netMsgCallbacks.push({ type: 'damageEvent', cb: dmgCb });

        // 音效事件
        const sfxCb = (data) => { this._onSfxEvent(data); };
        netMgr.onMessage('sfxEvent', sfxCb);
        this._netMsgCallbacks.push({ type: 'sfxEvent', cb: sfxCb });

        // 升级事件
        const lvlCb = (data) => { this._onLevelUp(data); };
        netMgr.onMessage('levelUp', lvlCb);
        this._netMsgCallbacks.push({ type: 'levelUp', cb: lvlCb });

        // 通知消息
        const notifCb = (data) => { this._eventSystem.emit('onNetNotification', data); };
        netMgr.onMessage('notification', notifCb);
        this._netMsgCallbacks.push({ type: 'notification', cb: notifCb });

        // 关卡通关消息（由服务端广播，用于显示弹窗）
        // 直接在 room 上注册（避免 NetworkManager 中间层的问题）
        const currentRoom = netMgr.room;
        if (currentRoom) {
            currentRoom.onMessage('levelComplete', (data) => {
                console.log(`[StateSynchronizer] levelComplete received: final=${data.final}, level=${data.level}`);
                this._eventSystem.emit('onLevelComplete', { isFinal: data.final, level: data.level });
            });
            console.log('[StateSynchronizer] Registered levelComplete handler on room directly');
        }

        // ────── State Change（用于 Prediction Reconciliation）──────
        netMgr.onStateChange((state) => {
            this._onStateChange(state);
        });

        console.log(`[StateSynchronizer] Bound to room (sessionId: ${this._localSessionId})`);
    }

    /**
     * 解绑所有监听
     */
    unbind() {
        // 清理所有网络实体
        this._networkEntities.forEach((entity, netId) => {
            this._entityManager.remove(entity);
        });
        this._networkEntities.clear();

        // 清理 NetworkManager 上注册的消息回调
        const netMgr = NetworkManager.getInstance();
        for (const entry of this._netMsgCallbacks) {
            netMgr.offMessage(entry.type, entry.cb);
        }
        this._netMsgCallbacks = [];

        this._bound = false;
        this._localSessionId = null;

        console.log('[StateSynchronizer] Unbound');
    }

    // ============================================================
    // Player 事件
    // ============================================================

    /**
     * 远程玩家加入
     * @private
     */
    _onPlayerAdd(playerState, sessionId) {
        console.log(`[StateSynchronizer] _onPlayerAdd: sessionId="${sessionId}", localSessionId="${this._localSessionId}", match=${sessionId === this._localSessionId}`);

        // 本地玩家不在此创建（由 BattleScene 初始化时创建）
        // 使用宽松比较以防类型不一致（例如 string vs number）
        if (String(sessionId) === String(this._localSessionId)) {
            // 但需要监听本地玩家的 state 变化来做 reconciliation
            playerState.listen('inputSeq', (seq) => {
                if (this._prediction && this._prediction.isActive) {
                    this._prediction.reconcile(seq, playerState.x, playerState.y);
                }
            });
            return;
        }

        // 防止重复创建（二次防护）
        if (this._networkEntities.has(sessionId)) {
            console.warn(`[StateSynchronizer] Duplicate onAdd for sessionId="${sessionId}", skipping`);
            return;
        }

        // 创建远程玩家实体（无 PlayerController / InputManager）
        const entity = this._playerFactory.create({
            position: { x: playerState.x, y: playerState.y },
            characterId: playerState.characterId,
            playerId: sessionId
        });

        if (entity) {
            // 移除本地控制组件（远程玩家不需要本地输入控制）
            const removeNames = ['PlayerController', 'CombatComponent', 'AutoAttackComponent'];
            for (const name of removeNames) {
                const idx = entity._components.findIndex(c => c.constructor.name === name);
                if (idx !== -1) {
                    const comp = entity._components[idx];
                    if (comp.onDestroy) comp.onDestroy();
                    comp.entity = null;
                    entity._components.splice(idx, 1);
                }
            }

            // 移除碰撞体标签，防止本地物理系统推挤远程玩家
            entity.collisionLayer = 'none';
            entity.isKinematic = true;

            // 标记为远程玩家
            entity.tags = entity.tags || [];
            entity.tags.push('remote_player');
            entity.networkId = sessionId;

            this._networkEntities.set(sessionId, entity);

            // 监听位置变化 → 推送快照到 InterpolationSystem
            playerState.listen('x', () => {
                if (this._interpolation && this._interpolation.isActive) {
                    this._interpolation.pushSnapshot(
                        sessionId,
                        playerState.x,
                        playerState.y,
                        performance.now(),
                        {
                            hp: playerState.hp,
                            maxHp: playerState.maxHp,
                            alive: playerState.alive,
                            level: playerState.level
                        }
                    );
                }
            });

            // 监听生命值变化（同步 maxHp 确保血条比例正确）
            playerState.listen('hp', (value) => {
                const healthComp = entity._components.find(c => c.constructor.name === 'HealthComponent');
                if (healthComp) {
                    healthComp.maxHp = playerState.maxHp;
                    healthComp.currentHp = value;
                }
            });

            // 监听存活状态
            playerState.listen('alive', (value) => {
                if (!value) {
                    entity.active = false;
                    this._eventSystem.emit('onRemotePlayerDeath', { sessionId });
                }
            });

            console.log(`[StateSynchronizer] Remote player added: ${sessionId} (${playerState.characterId})`);
        }
    }

    /**
     * 远程玩家离开
     * @private
     */
    _onPlayerRemove(sessionId) {
        if (sessionId === this._localSessionId) return;

        const entity = this._networkEntities.get(sessionId);
        if (entity) {
            this._entityManager.remove(entity);
            this._networkEntities.delete(sessionId);
            this._interpolation?.removeEntity(sessionId);
        }

        console.log(`[StateSynchronizer] Remote player removed: ${sessionId}`);
    }

    // ============================================================
    // Monster 事件
    // ============================================================

    /**
     * Server 生成怪物
     * @private
     */
    _onMonsterAdd(monsterState, key) {
        // 创建本地怪物表现实体（无 ChaseAI 组件）
        const entity = this._monsterFactory.create({
            type: monsterState.monsterType || 'slime',
            position: { x: monsterState.x, y: monsterState.y },
            isBoss: monsterState.monsterType?.startsWith('boss') || false
        });

        if (entity) {
            // 移除 AI 组件（怪物位置由 Server 控制）
            const aiIdx = entity._components.findIndex(c => c.constructor.name === 'ChaseAI');
            if (aiIdx !== -1) {
                const ai = entity._components[aiIdx];
                ai.onDestroy();
                ai.entity = null;
                entity._components.splice(aiIdx, 1);
            }

            entity.networkId = key;
            entity.tags = entity.tags || [];
            entity.tags.push('synced_monster');

            this._networkEntities.set(key, entity);

            // 监听位置变化 → 插值
            monsterState.listen('x', () => {
                if (this._interpolation && this._interpolation.isActive) {
                    this._interpolation.pushSnapshot(
                        key,
                        monsterState.x,
                        monsterState.y,
                        performance.now(),
                        {
                            hp: monsterState.hp,
                            maxHp: monsterState.maxHp,
                            alive: monsterState.alive
                        }
                    );
                }
            });

            // 监听存活
            monsterState.listen('alive', (value) => {
                if (!value) {
                    entity.active = false;
                    // 播放死亡动画/粒子效果
                    this._eventSystem.emit('onMonsterDeath', {
                        networkId: key,
                        x: monsterState.x,
                        y: monsterState.y,
                        monsterType: monsterState.monsterType
                    });
                }
            });

            // 监听 HP（同步 maxHp 确保血条比例正确，服务端可能有难度缩放）
            monsterState.listen('hp', (value) => {
                const healthComp = entity._components.find(c => c.constructor.name === 'HealthComponent');
                if (healthComp) {
                    healthComp.maxHp = monsterState.maxHp;
                    healthComp.currentHp = value;
                }
            });
        }
    }

    /**
     * Server 移除怪物
     * @private
     */
    _onMonsterRemove(key) {
        const entity = this._networkEntities.get(key);
        if (entity) {
            this._entityManager.remove(entity);
            this._networkEntities.delete(key);
            this._interpolation?.removeEntity(key);
        }
    }

    // ============================================================
    // Drop 事件
    // ============================================================

    /**
     * Server 生成掉落物
     * @private
     */
    _onDropAdd(dropState, key) {
        // 创建本地掉落物表现实体
        // Server 已处理拾取逻辑，本地仅做视觉表现
        const entity = new Entity('SyncDrop', 'drop');
        entity.transform.setPosition(dropState.x, dropState.y);
        entity.networkId = key;

        entity.addComponent(new SpriteRenderer({
            width: 8, height: 8,
            color: dropState.dropType === 'exp_orb' ? '#44FF88' : '#FFD700',
            shape: 'circle',
            sortingLayer: 1,
            opacity: 0.9
        }));

        this._entityManager.add(entity);
        this._networkEntities.set(key, entity);

        // 监听拾取状态
        dropState.listen('collected', (value) => {
            if (value) {
                entity.active = false;
                this._eventSystem.emit('onDropCollected', { networkId: key, dropType: dropState.dropType });
            }
        });
    }

    /**
     * Server 移除掉落物
     * @private
     */
    _onDropRemove(key) {
        const entity = this._networkEntities.get(key);
        if (entity) {
            this._entityManager.remove(entity);
            this._networkEntities.delete(key);
        }
    }

    // ============================================================
    // 自定义消息处理
    // ============================================================

    /**
     * 伤害事件 → 触发伤害飘字
     * @private
     */
    _onDamageEvent(data) {
        this._eventSystem.emit('onDamageNumber', {
            targetId: data.targetId,
            damage: data.damage,
            isCrit: data.isCrit,
            killed: data.killed
        });

        // 查找对应实体 → 伤害飘字定位 + 受击闪烁
        const targetEntity = this._networkEntities.get(data.targetId);
        if (targetEntity) {
            this._eventSystem.emit('onDamageNumberAt', {
                x: targetEntity.transform.position.x,
                y: targetEntity.transform.position.y,
                damage: data.damage,
                isCrit: data.isCrit
            });

            // [Network] 触发受击闪烁效果（服务端权威伤害 → 客户端视觉反馈）
            const healthComp = targetEntity._components.find(c => c.constructor.name === 'HealthComponent');
            if (healthComp && !healthComp.isDead) {
                healthComp.showBarTimer = 3.0; // 显示血条
                healthComp._startFlash();       // 受击闪烁
            }
        }
    }

    /**
     * 音效事件 → 触发 AudioManager 播放
     * @private
     */
    _onSfxEvent(data) {
        this._eventSystem.emit('onNetSfx', {
            soundId: data.soundId,
            x: data.x,
            y: data.y
        });
    }

    /**
     * 升级事件 → 触发升级 UI
     * @private
     */
    _onLevelUp(data) {
        this._eventSystem.emit('onNetLevelUp', {
            playerId: data.playerId,
            newLevel: data.newLevel,
            skillOptions: data.skillOptions || []
        });
    }

    // ============================================================
    // State Change（Prediction Reconciliation）
    // ============================================================

    /**
     * 全局状态变化回调
     * @private
     */
    _onStateChange(state) {
        // Reconciliation 在 player.listen('inputSeq') 中处理
        // 这里可以做其他全局状态同步
    }

    // ============================================================
    // 每帧更新
    // ============================================================

    /**
     * 每帧更新所有远程实体的插值位置
     * 应在 BattleScene.update() 中调用
     * @param {number} dt - 帧时间 (秒)
     */
    update(dt) {
        if (!this._bound || !this._interpolation || !this._interpolation.isActive) return;

        // 更新所有远程实体的插值位置
        this._networkEntities.forEach((entity, netId) => {
            // 跳过本地玩家
            if (netId === this._localSessionId) return;

            const result = this._interpolation.getInterpolatedPosition(netId);
            if (result.found && entity.active !== false) {
                entity.transform.position.x = result.x;
                entity.transform.position.y = result.y;

                // 更新附加数据（HP 等）
                if (result.extraData) {
                    if (result.extraData.hp !== undefined) {
                        const healthComp = entity._components?.find(c => c.constructor.name === 'HealthComponent');
                        if (healthComp) {
                            healthComp.hp = result.extraData.hp;
                        }
                    }
                }
            }
        });
    }

    // ============================================================
    // 辅助
    // ============================================================

    /**
     * 获取远程玩家数量
     * @returns {number}
     */
    getRemotePlayerCount() {
        let count = 0;
        this._networkEntities.forEach((entity) => {
            if (entity.tags?.includes('remote_player')) count++;
        });
        return count;
    }

    /**
     * 获取所有远程玩家信息（用于 HUD 显示）
     * @returns {Array<{sessionId: string, entity: object}>}
     */
    getRemotePlayers() {
        const players = [];
        this._networkEntities.forEach((entity, netId) => {
            if (entity.tags?.includes('remote_player')) {
                players.push({ sessionId: netId, entity });
            }
        });
        return players;
    }

    /**
     * 获取所有网络实体数量
     * @returns {number}
     */
    get networkEntityCount() {
        return this._networkEntities.size;
    }
}
