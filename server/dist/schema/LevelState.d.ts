/**
 * LevelState Schema
 * Unity equivalent: NetworkVariable<LevelData> on GameManager
 */
import { Schema } from '@colyseus/schema';
export declare class LevelState extends Schema {
    /** 当前关卡编号 */
    currentLevel: number;
    /** 全队击杀总数（用于开门判定） */
    totalKills: number;
    /** Boss 门是否已开启 */
    bossGateOpen: boolean;
    /** Boss 是否存活 */
    bossAlive: boolean;
    /** 游戏阶段: waiting / battle / boss / complete / gameover */
    phase: string;
    /** 当前波次 */
    currentWave: number;
    /** 开门所需击杀数 */
    killsToOpenBoss: number;
}
//# sourceMappingURL=LevelState.d.ts.map