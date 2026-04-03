/**
 * ServerCombat — 服务端战斗系统
 * Unity equivalent: CombatManager (Server Build)
 *
 * 管理投射物生成/移动/碰撞、伤害计算、经验分配
 */
import { MapSchema } from '@colyseus/schema';
import { PlayerState } from '../schema/PlayerState';
import { MonsterState } from '../schema/MonsterState';
import { ProjectileState } from '../schema/ProjectileState';
import { DropState } from '../schema/DropState';
import { ServerPhysics } from './ServerPhysics';

/** 战斗公式参数 */
interface FormulasConfig {
    damage?: { base?: number; levelScale?: number };
    exp?: { baseReward?: number; levelScale?: number };
    levelUp?: { baseExp?: number; growthRate?: number };
    [key: string]: any;
}

/** 角色攻击属性缓存 */
interface AttackInfo {
    attack: number;
    attackSpeed: number;
    attackRange: number;
    projectileSpeed: number;
    critRate: number;
    critMultiplier: number;
}

/** 伤害事件（广播给客户端） */
export interface DamageEvent {
    targetId: string;
    targetType: 'monster' | 'player';
    damage: number;
    isCrit: boolean;
    killerId: string;
    killed: boolean;
}

/** 音效事件 */
export interface SfxEvent {
    soundId: string;
    x: number;
    y: number;
}

export class ServerCombat {
    private players: MapSchema<PlayerState>;
    private monsters: MapSchema<MonsterState>;
    private projectiles: MapSchema<ProjectileState>;
    private drops: MapSchema<DropState>;
    private physics: ServerPhysics;

    /** 公式配置 */
    private formulas: FormulasConfig = {};

    /** 角色攻击属性表 */
    private characterAttacks: Record<string, AttackInfo> = {};

    /** 攻击冷却追踪: playerId → 剩余冷却 */
    private attackCooldowns: Map<string, number> = new Map();

    /** 投射物 ID 自增 */
    private nextProjectileId: number = 1;

    /** 掉落物 ID 自增 */
    private nextDropId: number = 1;

    /** 事件回调 */
    onDamageEvent: ((event: DamageEvent) => void) | null = null;
    onSfxEvent: ((event: SfxEvent) => void) | null = null;
    onLevelUp: ((playerId: string, newLevel: number) => void) | null = null;
    onMonsterKill: ((monsterId: string, monsterType: string) => void) | null = null;

    constructor(
        players: MapSchema<PlayerState>,
        monsters: MapSchema<MonsterState>,
        projectiles: MapSchema<ProjectileState>,
        drops: MapSchema<DropState>,
        physics: ServerPhysics
    ) {
        this.players = players;
        this.monsters = monsters;
        this.projectiles = projectiles;
        this.drops = drops;
        this.physics = physics;
    }

    /** 加载公式和角色配置 */
    loadConfigs(formulas: any, characters: any) {
        this.formulas = formulas || {};

        // 提取每个角色的攻击属性
        for (const [charId, charDef] of Object.entries(characters as Record<string, any>)) {
            const stats = charDef.stats || {};
            this.characterAttacks[charId] = {
                attack: stats.attack || 10,
                attackSpeed: stats.attackSpeed || 0.5,
                attackRange: stats.attackRange || 200,
                projectileSpeed: stats.projectileSpeed || 400,
                critRate: stats.critRate || 0.05,
                critMultiplier: stats.critMultiplier || 1.5,
            };
        }
    }

    /**
     * 每 tick 更新
     * @param dt 秒
     */
    update(dt: number) {
        // 1. 更新攻击冷却 & 自动射击
        this._updateAutoAttack(dt);

        // 2. 移动投射物
        this._updateProjectiles(dt);

        // 3. 投射物 vs 怪物碰撞
        this._checkProjectileHits();

        // 4. 清理死亡的投射物
        this._cleanupProjectiles();
    }

    /** 自动射击：按攻速生成投射物 */
    private _updateAutoAttack(dt: number) {
        this.players.forEach((player, sessionId) => {
            if (!player.alive) return;

            const atkInfo = this.characterAttacks[player.characterId];
            if (!atkInfo) return;

            // 更新冷却
            const cd = (this.attackCooldowns.get(sessionId) || 0) - dt;
            if (cd > 0) {
                this.attackCooldowns.set(sessionId, cd);
                return;
            }

            // 寻找射程内最近怪物
            let nearestMonster: { x: number; y: number } | null = null;
            let nearestDist = atkInfo.attackRange;

            this.monsters.forEach((monster) => {
                if (!monster.alive) return;
                const ddx = monster.x - player.x;
                const ddy = monster.y - player.y;
                const dist = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestMonster = { x: monster.x, y: monster.y };
                }
            });

            if (!nearestMonster) return;

            // 发射投射物
            const target = nearestMonster as { x: number; y: number };
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) return;

            const proj = new ProjectileState();
            const projId = `p_${this.nextProjectileId++}`;
            proj.id = projId;
            proj.ownerId = sessionId;
            proj.x = player.x;
            proj.y = player.y;
            proj.dx = dx / dist;
            proj.dy = dy / dist;
            proj.speed = atkInfo.projectileSpeed;
            proj.damage = atkInfo.attack;
            proj.alive = true;

            this.projectiles.set(projId, proj);
            this.attackCooldowns.set(sessionId, atkInfo.attackSpeed);

            // 射击音效
            if (this.onSfxEvent) {
                this.onSfxEvent({ soundId: 'player_shoot', x: player.x, y: player.y });
            }
        });
    }

    /** 移动投射物 */
    private _updateProjectiles(dt: number) {
        this.projectiles.forEach((proj) => {
            if (!proj.alive) return;

            proj.x += proj.dx * proj.speed * dt;
            proj.y += proj.dy * proj.speed * dt;

            // 超出地图边界销毁
            if (!this.physics.isWalkable(proj.x, proj.y)) {
                proj.alive = false;
            }

            // 飞行距离限制（防止永远飞行）
            // 简化：超出地图范围即销毁
            const bounds = this.physics.getWorldBounds();
            if (proj.x < -100 || proj.x > bounds.width + 100 ||
                proj.y < -100 || proj.y > bounds.height + 100) {
                proj.alive = false;
            }
        });
    }

    /** 投射物碰撞检测 */
    private _checkProjectileHits() {
        this.projectiles.forEach((proj) => {
            if (!proj.alive) return;

            this.monsters.forEach((monster) => {
                if (!monster.alive || !proj.alive) return;

                const monsterRadius = 16; // 简化
                if (this.physics.circleVsCircle(
                    proj.x, proj.y, 6,
                    monster.x, monster.y, monsterRadius
                )) {
                    proj.alive = false;

                    // 计算伤害
                    const atkInfo = this.characterAttacks[
                        this.players.get(proj.ownerId)?.characterId || 'ranger'
                    ] || { attack: 10, critRate: 0.05, critMultiplier: 1.5 } as AttackInfo;

                    const isCrit = Math.random() < atkInfo.critRate;
                    let damage = proj.damage;
                    if (isCrit) damage = Math.ceil(damage * atkInfo.critMultiplier);

                    monster.hp -= damage;
                    const killed = monster.hp <= 0;
                    if (killed) {
                        monster.alive = false;
                        monster.hp = 0;

                        // 击杀计数（用于 Boss 门判定）
                        const killer = this.players.get(proj.ownerId);
                        if (killer) killer.kills++;

                        // 生成经验球掉落物（经验通过拾取获得，与单人模式一致）
                        this._spawnDrop(monster.x, monster.y, monster);

                        // 通知 BattleRoom（用于 Boss 击杀检测）
                        if (this.onMonsterKill) {
                            this.onMonsterKill(monster.id, monster.monsterType);
                        }
                    }

                    // 广播伤害事件
                    if (this.onDamageEvent) {
                        this.onDamageEvent({
                            targetId: monster.id,
                            targetType: 'monster',
                            damage,
                            isCrit,
                            killerId: proj.ownerId,
                            killed
                        });
                    }

                    // 音效
                    if (this.onSfxEvent) {
                        this.onSfxEvent({
                            soundId: killed ? (monster.monsterType.startsWith('boss') ? 'boss_kill' : 'enemy_kill') : 'enemy_hit',
                            x: monster.x,
                            y: monster.y
                        });
                    }
                }
            });
        });
    }

    /** 给击杀者增加经验 */
    private _awardExp(playerId: string, monster: MonsterState) {
        const player = this.players.get(playerId);
        if (!player) return;

        const baseReward = this.formulas.exp?.baseReward || 10;
        const expReward = baseReward + (monster.maxHp / 5);

        player.exp += Math.ceil(expReward);
        player.kills++;

        // 检查升级
        const levelUpExp = this._getExpForLevel(player.level);
        if (player.exp >= levelUpExp) {
            player.level++;
            player.exp -= levelUpExp;

            // 回血
            player.hp = Math.min(player.hp + Math.ceil(player.maxHp * 0.2), player.maxHp);

            if (this.onLevelUp) {
                this.onLevelUp(playerId, player.level);
            }
        }
    }

    /** 获取升级所需经验（与客户端 ExperienceSystem 公式一致） */
    private _getExpForLevel(level: number): number {
        const baseExp = (this.formulas as any).baseExpToLevel || 50;
        const growthRate = (this.formulas as any).expLevelMultiplier || 1.3;
        return Math.ceil(baseExp * Math.pow(growthRate, level - 1));
    }

    /**
     * 生成经验球掉落物（根据怪物类型查表获取经验值）
     */
    private static readonly EXP_TABLE: Record<string, number> = {
        slime: 10, bat: 15, skeleton: 20, ghost: 25,
        boss_slime: 100, boss_skeleton: 200, boss_golem: 200,
    };
    private _spawnDrop(x: number, y: number, _monster?: MonsterState) {
        const monsterType = _monster?.monsterType || 'slime';
        const expValue = ServerCombat.EXP_TABLE[monsterType] || 10;
        const expPerBall = (this.formulas as any).expPerBall || 5;
        let count = Math.ceil(expValue / expPerBall);
        count = Math.min(count, 5);                              // 上限 5 个

        for (let i = 0; i < count; i++) {
            const drop = new DropState();
            const dropId = `d_${this.nextDropId++}`;
            drop.id = dropId;
            drop.dropType = 'exp_orb';
            // 从死亡位置随机散开（与 DropItemFactory 一致）
            drop.x = x + (Math.random() - 0.5) * 30;
            drop.y = y + (Math.random() - 0.5) * 30;
            drop.value = expPerBall;
            drop.collected = false;

            this.drops.set(dropId, drop);
        }
    }

    /** 处理玩家受伤（由 ServerAI 接触伤害调用） */
    dealDamageToPlayer(playerId: string, damage: number, attackerId: string) {
        const player = this.players.get(playerId);
        if (!player || !player.alive) return;

        player.hp -= damage;
        if (player.hp <= 0) {
            player.hp = 0;
            player.alive = false;
        }

        if (this.onDamageEvent) {
            this.onDamageEvent({
                targetId: playerId,
                targetType: 'player',
                damage,
                isCrit: false,
                killerId: attackerId,
                killed: !player.alive
            });
        }

        if (this.onSfxEvent) {
            this.onSfxEvent({ soundId: 'player_hit', x: player.x, y: player.y });
        }
    }

    /** 清理死亡投射物 */
    private _cleanupProjectiles() {
        const toRemove: string[] = [];
        this.projectiles.forEach((proj, key) => {
            if (!proj.alive) toRemove.push(key);
        });
        for (const key of toRemove) {
            this.projectiles.delete(key);
        }
    }

    /** 清理已拾取的掉落物 */
    cleanupDrops() {
        const toRemove: string[] = [];
        this.drops.forEach((drop, key) => {
            if (drop.collected) toRemove.push(key);
        });
        for (const key of toRemove) {
            this.drops.delete(key);
        }
    }

    /** 检测经验球拾取 */
    checkPickups() {
        this.drops.forEach((drop) => {
            if (drop.collected) return;

            this.players.forEach((player, sessionId) => {
                if (!player.alive || drop.collected) return;

                if (this.physics.circleVsCircle(
                    player.x, player.y, 32,
                    drop.x, drop.y, 16
                )) {
                    drop.collected = true;
                    player.exp += drop.value;

                    // 检查升级
                    const levelUpExp = this._getExpForLevel(player.level);
                    if (player.exp >= levelUpExp) {
                        player.level++;
                        player.exp -= levelUpExp;
                        player.hp = Math.min(player.hp + Math.ceil(player.maxHp * 0.2), player.maxHp);

                        if (this.onLevelUp) {
                            this.onLevelUp(sessionId, player.level);
                        }
                    }

                    if (this.onSfxEvent) {
                        this.onSfxEvent({ soundId: 'exp_pickup', x: drop.x, y: drop.y });
                    }
                }
            });
        });
    }
}
