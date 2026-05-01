/**
 * MonsterState Schema
 * Unity equivalent: NetworkVariable<MonsterData> on NetworkObject
 */
import { Schema, type } from '@colyseus/schema';

export class MonsterState extends Schema {
    /** 服务器分配的唯一 ID */
    @type('string') id: string = '';

    /** 怪物类型: slime / bat / skeleton / boss_golem 等 */
    @type('string') monsterType: string = 'slime';

    /** 位置（服务器权威） */
    @type('float32') x: number = 0;
    @type('float32') y: number = 0;

    /** 生命值 */
    @type('int16') hp: number = 30;
    @type('int16') maxHp: number = 30;

    /** 存活状态 */
    @type('boolean') alive: boolean = true;
}
