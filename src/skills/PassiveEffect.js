/**
 * PassiveEffect — 被动属性技能
 * Unity equivalent: ScriptableObject + StatModifier 模式
 *
 * 每个 PassiveEffect 影响一个属性，提供 flatAdd 或 percentAdd 加成。
 * 由 SkillComponent 统一管理和汇总。
 */
export class PassiveEffect {
    /**
     * @param {object} config — 来自 skills.json 的被动技能配置
     * @param {string} config.id
     * @param {string} config.name
     * @param {string} config.icon
     * @param {string} config.stat — 影响的属性名
     * @param {string} config.modType — 'flatAdd' 或 'percentAdd'
     * @param {number} config.maxLevel
     * @param {Array} config.levels — 每级配置 [{value}]
     */
    constructor(config) {
        /** @type {string} */
        this.skillId = config.id;

        /** @type {string} */
        this.name = config.name;

        /** @type {string} */
        this.icon = config.icon || '?';

        /** @type {string} 影响的属性名 */
        this.stat = config.stat;

        /** @type {string} 加成类型 */
        this.modType = config.modType;

        /** @type {number} 最大等级 */
        this.maxLevel = config.maxLevel || 5;

        /** @type {Array} 每级配置 */
        this.levels = config.levels || [];

        /** @type {number} 当前等级 (1-based) */
        this.level = 1;

        /** @type {number} 当前加成值 */
        this.value = this.levels[0] ? this.levels[0].value : 0;
    }

    /**
     * 升级
     * @returns {boolean} 是否升级成功
     */
    levelUp() {
        if (this.level >= this.maxLevel) return false;

        this.level++;
        const levelData = this.levels[this.level - 1];
        if (levelData) {
            this.value = levelData.value;
        }
        return true;
    }

    /**
     * 是否满级
     * @returns {boolean}
     */
    isMaxLevel() {
        return this.level >= this.maxLevel;
    }

    /**
     * 获取下一级的值预览（用于 UI 显示）
     * @returns {number|null}
     */
    getNextLevelValue() {
        if (this.level >= this.maxLevel) return null;
        const nextData = this.levels[this.level];
        return nextData ? nextData.value : null;
    }
}
