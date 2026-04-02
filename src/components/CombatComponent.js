import { Component } from '../core/Component.js';

/**
 * CombatComponent — 战斗属性组件
 * Unity equivalent: 自定义 CombatStats MonoBehaviour
 *
 * P2 新增: getFinal*() 系列方法，查询 SkillComponent modifier 加成
 */
export class CombatComponent extends Component {
    constructor(config = {}) {
        super(config);
        /** @type {number} 基础攻击力 */
        this.attack = config.attack || 10;
        /** @type {number} 基础防御力 */
        this.defense = config.defense || 0;
        /** @type {number} 基础暴击率 0~1 */
        this.critRate = config.critRate || 0;
        /** @type {number} 暴击倍率 */
        this.critMultiplier = config.critMultiplier || 1.5;
        /** @type {number} 基础攻击间隔(秒) */
        this.attackSpeed = config.attackSpeed || 1.0;
        /** @type {number} 攻击范围(像素) */
        this.attackRange = config.attackRange || 200;
        /** @type {number} 投射物速度(像素/秒) */
        this.projectileSpeed = config.projectileSpeed || 400;
        /** @type {string} 阵营 'player' | 'enemy' */
        this.faction = config.faction || 'player';

        /** @type {import('../components/SkillComponent.js').SkillComponent|null} */
        this._skillComponent = null;
    }

    /** Unity: void Start() */
    start() {
        // 缓存 SkillComponent 引用（玩家有，怪物没有）
        // 通过名称查找，避免 import 循环依赖
        for (const comp of this.entity._components) {
            if (comp.constructor.name === 'SkillComponent') {
                this._skillComponent = comp;
                break;
            }
        }
    }

    // ==================== getFinal*() 方法 ====================

    /**
     * @private 获取指定属性的 modifier
     */
    _getModifier(statName) {
        if (!this._skillComponent) return { flatAdd: 0, percentAdd: 0 };
        return this._skillComponent.getStatModifier(statName);
    }

    /**
     * 获取最终攻击力 = base × (1 + percentAdd) + flatAdd
     * Unity: property getter
     * @returns {number}
     */
    getFinalAttack() {
        const mod = this._getModifier('attack');
        return this.attack * (1 + mod.percentAdd) + mod.flatAdd;
    }

    /**
     * 获取最终防御力
     * @returns {number}
     */
    getFinalDefense() {
        const mod = this._getModifier('defense');
        return this.defense * (1 + mod.percentAdd) + mod.flatAdd;
    }

    /**
     * 获取最终暴击率（暴击率用 flatAdd 叠加）
     * @returns {number}
     */
    getFinalCritRate() {
        const mod = this._getModifier('critRate');
        return Math.min(1, this.critRate + mod.flatAdd);
    }

    /**
     * 获取最终攻击间隔 = base / (1 + percentAdd)
     * 攻速越高 → 间隔越短
     * @returns {number}
     */
    getFinalAttackSpeed() {
        const mod = this._getModifier('attackSpeed');
        return this.attackSpeed / (1 + mod.percentAdd);
    }

    /**
     * 获取最终移动速度（供 PlayerController 调用）
     * @param {number} baseMoveSpeed
     * @returns {number}
     */
    getFinalMoveSpeed(baseMoveSpeed) {
        const mod = this._getModifier('moveSpeed');
        return baseMoveSpeed * (1 + mod.percentAdd) + mod.flatAdd;
    }

    /**
     * 获取最终最大生命值
     * @param {number} baseMaxHp
     * @returns {number}
     */
    getFinalMaxHp(baseMaxHp) {
        const mod = this._getModifier('maxHp');
        return baseMaxHp + mod.flatAdd;
    }
}