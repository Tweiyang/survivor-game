/**
 * LevelState Schema
 * Unity equivalent: NetworkVariable<LevelData> on GameManager
 */
import { Schema, type } from '@colyseus/schema';

export class LevelState extends Schema {
    /** 当前关卡编号 */
    @type('uint8') currentLevel: number = 1;

    /** 全队击杀总数（用于开门判定） */
    @type('uint16') totalKills: number = 0;

    /** Boss 门是否已开启 */
    @type('boolean') bossGateOpen: boolean = false;

    /** Boss 是否存活 */
    @type('boolean') bossAlive: boolean = false;

    /** 游戏阶段: waiting / battle / boss / complete / gameover */
    @type('string') phase: string = 'waiting';

    /** 当前波次 */
    @type('uint8') currentWave: number = 0;

    /** 开门所需击杀数 */
    @type('uint16') killsToOpenBoss: number = 5;
}
