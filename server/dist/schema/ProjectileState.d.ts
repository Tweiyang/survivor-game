/**
 * ProjectileState Schema
 * Unity equivalent: NetworkVariable<ProjectileData> on NetworkObject
 */
import { Schema } from '@colyseus/schema';
export declare class ProjectileState extends Schema {
    /** 服务器分配的唯一 ID */
    id: string;
    /** 发射者 sessionId */
    ownerId: string;
    /** 位置 */
    x: number;
    y: number;
    /** 方向 (归一化) */
    dx: number;
    dy: number;
    /** 速度（像素/秒） */
    speed: number;
    /** 伤害 */
    damage: number;
    /** 存活状态 */
    alive: boolean;
}
//# sourceMappingURL=ProjectileState.d.ts.map