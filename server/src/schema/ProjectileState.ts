/**
 * ProjectileState Schema
 * Unity equivalent: NetworkVariable<ProjectileData> on NetworkObject
 */
import { Schema, type } from '@colyseus/schema';

export class ProjectileState extends Schema {
    /** 服务器分配的唯一 ID */
    @type('string') id: string = '';

    /** 发射者 sessionId */
    @type('string') ownerId: string = '';

    /** 位置 */
    @type('float32') x: number = 0;
    @type('float32') y: number = 0;

    /** 方向 (归一化) */
    @type('float32') dx: number = 0;
    @type('float32') dy: number = 0;

    /** 速度（像素/秒） */
    @type('float32') speed: number = 300;

    /** 伤害 */
    @type('int16') damage: number = 10;

    /** 存活状态 */
    @type('boolean') alive: boolean = true;
}
