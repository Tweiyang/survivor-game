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

export class DifficultyScaler {
    private config: DifficultyConfig;
    private _currentMultiplier: number = 1.0;

    constructor(config: DifficultyConfig) {
        this.config = config;
        this._currentMultiplier = config.baseMultiplier;
    }

    /**
     * 根据玩家数更新倍率
     */
    updatePlayerCount(playerCount: number) {
        const count = Math.max(1, playerCount);
        this._currentMultiplier = this.config.baseMultiplier +
            (count - 1) * this.config.perPlayerAdd;

        console.log(`[DifficultyScaler] Players: ${count}, multiplier: ${this._currentMultiplier}x`);
    }

    /** 当前总倍率 */
    get multiplier(): number {
        return this._currentMultiplier;
    }

    /** 怪物血量是否缩放 */
    get scaleMonsterHp(): boolean {
        return this.config.fields.monsterHp;
    }

    /** 怪物数量是否缩放 */
    get scaleMonsterCount(): boolean {
        return this.config.fields.monsterCount;
    }

    /** 怪物伤害是否缩放 */
    get scaleMonsterDamage(): boolean {
        return this.config.fields.monsterDamage;
    }

    /** Boss 血量是否缩放 */
    get scaleBossHp(): boolean {
        return this.config.fields.bossHp;
    }

    /**
     * 应用倍率到数值
     * 根据字段配置决定是否缩放
     */
    applyToHp(baseHp: number): number {
        return this.scaleMonsterHp ? Math.ceil(baseHp * this._currentMultiplier) : baseHp;
    }

    applyToCount(baseCount: number): number {
        return this.scaleMonsterCount ? Math.ceil(baseCount * this._currentMultiplier) : baseCount;
    }

    applyToBossHp(baseHp: number): number {
        return this.scaleBossHp ? Math.ceil(baseHp * this._currentMultiplier) : baseHp;
    }
}
