/**
 * PlayerState Schema
 * Unity equivalent: NetworkVariable<PlayerData> on NetworkObject
 *
 * 服务器权威的玩家状态，自动增量同步到所有客户端
 */
import { Schema, type, ArraySchema } from '@colyseus/schema';

export class SkillEntry extends Schema {
    @type('string') skillId: string = '';
    @type('uint8') level: number = 0;
}

export class PlayerState extends Schema {
    /** Colyseus session ID */
    @type('string') sessionId: string = '';

    /** 角色 ID: warrior / mage / ranger */
    @type('string') characterId: string = 'warrior';

    /** 位置（服务器权威） */
    @type('float32') x: number = 0;
    @type('float32') y: number = 0;

    /** 生命值 */
    @type('int16') hp: number = 100;
    @type('int16') maxHp: number = 100;

    /** 经验和等级（各自独立） */
    @type('uint8') level: number = 1;
    @type('uint32') exp: number = 0;

    /** 个人击杀数 */
    @type('uint16') kills: number = 0;

    /** 存活状态 */
    @type('boolean') alive: boolean = true;

    /** 准备状态（大厅用） */
    @type('boolean') ready: boolean = false;

    /** 最后处理的输入序号（用于客户端 Reconciliation） */
    @type('uint32') inputSeq: number = 0;

    /** 移动速度（从角色配置读取） */
    @type('float32') moveSpeed: number = 120;

    /** 已获得技能列表 */
    @type([SkillEntry]) skills = new ArraySchema<SkillEntry>();
}
