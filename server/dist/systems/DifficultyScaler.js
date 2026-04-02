"use strict";
/**
 * DifficultyScaler — 难度缩放计算器
 * Unity equivalent: ScriptableObject 难度配置
 *
 * 根据房间玩家数量计算怪物属性缩放倍率
 * 公式: multiplier = baseMultiplier + (playerCount - 1) * perPlayerAdd
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifficultyScaler = void 0;
class DifficultyScaler {
    constructor(config) {
        this._currentMultiplier = 1.0;
        this.config = config;
        this._currentMultiplier = config.baseMultiplier;
    }
    /**
     * 根据玩家数更新倍率
     */
    updatePlayerCount(playerCount) {
        const count = Math.max(1, playerCount);
        this._currentMultiplier = this.config.baseMultiplier +
            (count - 1) * this.config.perPlayerAdd;
        console.log(`[DifficultyScaler] Players: ${count}, multiplier: ${this._currentMultiplier}x`);
    }
    /** 当前总倍率 */
    get multiplier() {
        return this._currentMultiplier;
    }
    /** 怪物血量是否缩放 */
    get scaleMonsterHp() {
        return this.config.fields.monsterHp;
    }
    /** 怪物数量是否缩放 */
    get scaleMonsterCount() {
        return this.config.fields.monsterCount;
    }
    /** 怪物伤害是否缩放 */
    get scaleMonsterDamage() {
        return this.config.fields.monsterDamage;
    }
    /** Boss 血量是否缩放 */
    get scaleBossHp() {
        return this.config.fields.bossHp;
    }
    /**
     * 应用倍率到数值
     * 根据字段配置决定是否缩放
     */
    applyToHp(baseHp) {
        return this.scaleMonsterHp ? Math.ceil(baseHp * this._currentMultiplier) : baseHp;
    }
    applyToCount(baseCount) {
        return this.scaleMonsterCount ? Math.ceil(baseCount * this._currentMultiplier) : baseCount;
    }
    applyToBossHp(baseHp) {
        return this.scaleBossHp ? Math.ceil(baseHp * this._currentMultiplier) : baseHp;
    }
}
exports.DifficultyScaler = DifficultyScaler;
//# sourceMappingURL=DifficultyScaler.js.map