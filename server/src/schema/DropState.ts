/**
 * DropState Schema
 * Unity equivalent: NetworkVariable<DropData> on NetworkObject
 */
import { Schema, type } from '@colyseus/schema';

export class DropState extends Schema {
    /** 服务器分配的唯一 ID */
    @type('string') id: string = '';

    /** 掉落物类型: exp_orb / health_orb */
    @type('string') dropType: string = 'exp_orb';

    /** 位置 */
    @type('float32') x: number = 0;
    @type('float32') y: number = 0;

    /** 经验值（exp_orb 用） */
    @type('uint16') value: number = 10;

    /** 是否已被拾取 */
    @type('boolean') collected: boolean = false;
}
