/**
 * PlayerState Schema
 * Unity equivalent: NetworkVariable<PlayerData> on NetworkObject
 *
 * 服务器权威的玩家状态，自动增量同步到所有客户端
 */
import { Schema, ArraySchema } from '@colyseus/schema';
export declare class SkillEntry extends Schema {
    skillId: string;
    level: number;
}
export declare class PlayerState extends Schema {
    /** Colyseus session ID */
    sessionId: string;
    /** 角色 ID: warrior / mage / ranger */
    characterId: string;
    /** 位置（服务器权威） */
    x: number;
    y: number;
    /** 生命值 */
    hp: number;
    maxHp: number;
    /** 经验和等级（各自独立） */
    level: number;
    exp: number;
    /** 个人击杀数 */
    kills: number;
    /** 存活状态 */
    alive: boolean;
    /** 准备状态（大厅用） */
    ready: boolean;
    /** 最后处理的输入序号（用于客户端 Reconciliation） */
    inputSeq: number;
    /** 移动速度（从角色配置读取） */
    moveSpeed: number;
    /** 已获得技能列表 */
    skills: ArraySchema<SkillEntry>;
}
//# sourceMappingURL=PlayerState.d.ts.map