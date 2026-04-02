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
export declare class ServerCombat {
    private players;
    private monsters;
    private projectiles;
    private drops;
    private physics;
    /** 公式配置 */
    private formulas;
    /** 角色攻击属性表 */
    private characterAttacks;
    /** 攻击冷却追踪: playerId → 剩余冷却 */
    private attackCooldowns;
    /** 投射物 ID 自增 */
    private nextProjectileId;
    /** 掉落物 ID 自增 */
    private nextDropId;
    /** 事件回调 */
    onDamageEvent: ((event: DamageEvent) => void) | null;
    onSfxEvent: ((event: SfxEvent) => void) | null;
    onLevelUp: ((playerId: string, newLevel: number) => void) | null;
    onMonsterKill: ((monsterId: string, monsterType: string) => void) | null;
    constructor(players: MapSchema<PlayerState>, monsters: MapSchema<MonsterState>, projectiles: MapSchema<ProjectileState>, drops: MapSchema<DropState>, physics: ServerPhysics);
    /** 加载公式和角色配置 */
    loadConfigs(formulas: any, characters: any): void;
    /**
     * 每 tick 更新
     * @param dt 秒
     */
    update(dt: number): void;
    /** 自动射击：按攻速生成投射物 */
    private _updateAutoAttack;
    /** 移动投射物 */
    private _updateProjectiles;
    /** 投射物碰撞检测 */
    private _checkProjectileHits;
    /** 给击杀者增加经验 */
    private _awardExp;
    /** 获取升级所需经验（与客户端 ExperienceSystem 公式一致） */
    private _getExpForLevel;
    /**
     * 生成经验球掉落物（与单人模式一致：每球 expPerBall=5，总量=expValue）
     * 单人模式: MonsterFactory 设 entity._expValue=10 → 生成 2 个球(各 5 exp)
     * 服务端: 固定 expValue=10 → 生成 2 个球(各 5 exp)
     */
    private _spawnDrop;
    /** 处理玩家受伤（由 ServerAI 接触伤害调用） */
    dealDamageToPlayer(playerId: string, damage: number, attackerId: string): void;
    /** 清理死亡投射物 */
    private _cleanupProjectiles;
    /** 清理已拾取的掉落物 */
    cleanupDrops(): void;
    /** 检测经验球拾取 */
    checkPickups(): void;
}
//# sourceMappingURL=ServerCombat.d.ts.map