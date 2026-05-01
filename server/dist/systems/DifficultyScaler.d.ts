/**
 * DifficultyScaler — 难度缩放计算器
 * Unity equivalent: ScriptableObject 难度配置
 *
 * 根据房间玩家数量计算怪物属性缩放倍率
 * 公式: multiplier = baseMultiplier + (playerCount - 1) * perPlayerAdd
 */
interface DifficultyConfig {
    scalingFormula: string;
    baseMultiplier: number;
    perPlayerAdd: number;
    fields: {
        monsterHp: boolean;
        monsterCount: boolean;
        monsterDamage: boolean;
        bossHp: boolean;
    };
}
export declare class DifficultyScaler {
    private config;
    private _currentMultiplier;
    constructor(config: DifficultyConfig);
    /**
     * 根据玩家数更新倍率
     */
    updatePlayerCount(playerCount: number): void;
    /** 当前总倍率 */
    get multiplier(): number;
    /** 怪物血量是否缩放 */
    get scaleMonsterHp(): boolean;
    /** 怪物数量是否缩放 */
    get scaleMonsterCount(): boolean;
    /** 怪物伤害是否缩放 */
    get scaleMonsterDamage(): boolean;
    /** Boss 血量是否缩放 */
    get scaleBossHp(): boolean;
    /**
     * 应用倍率到数值
     * 根据字段配置决定是否缩放
     */
    applyToHp(baseHp: number): number;
    applyToCount(baseCount: number): number;
    applyToBossHp(baseHp: number): number;
}
export {};
//# sourceMappingURL=DifficultyScaler.d.ts.map