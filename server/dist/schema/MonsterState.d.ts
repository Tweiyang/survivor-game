/**
 * MonsterState Schema
 * Unity equivalent: NetworkVariable<MonsterData> on NetworkObject
 */
import { Schema } from '@colyseus/schema';
export declare class MonsterState extends Schema {
    /** 服务器分配的唯一 ID */
    id: string;
    /** 怪物类型: slime / bat / skeleton / boss_golem 等 */
    monsterType: string;
    /** 位置（服务器权威） */
    x: number;
    y: number;
    /** 生命值 */
    hp: number;
    maxHp: number;
    /** 存活状态 */
    alive: boolean;
}
//# sourceMappingURL=MonsterState.d.ts.map