/**
 * DropState Schema
 * Unity equivalent: NetworkVariable<DropData> on NetworkObject
 */
import { Schema } from '@colyseus/schema';
export declare class DropState extends Schema {
    /** 服务器分配的唯一 ID */
    id: string;
    /** 掉落物类型: exp_orb / health_orb */
    dropType: string;
    /** 位置 */
    x: number;
    y: number;
    /** 经验值（exp_orb 用） */
    value: number;
    /** 是否已被拾取 */
    collected: boolean;
}
//# sourceMappingURL=DropState.d.ts.map