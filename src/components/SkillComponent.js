import { Component } from '../core/Component.js';
import { WeaponSkill } from '../skills/WeaponSkill.js';
import { PassiveEffect } from '../skills/PassiveEffect.js';

/**
 * SkillComponent — 技能管理组件
 * Unity equivalent: MonoBehaviour（挂载在玩家 Entity 上）
 *
 * 统一管理武器技能和被动技能，提供属性 modifier 汇总。
 * [Network] 技能选择结果需广播给其他客户端
 */
export class SkillComponent extends Component {
    /**
     * @param {object} config
     * @param {object} config.skillPool — skills.json 全部技能配置
     * @param {object} config.systems — 游戏系统引用
     * @param {number} [config.maxWeapons=4] — 武器上限
     */
    constructor(config = {}) {
        super();

        /** @type {object} 技能池（全部可用技能配置） */
        this.skillPool = config.skillPool || {};

        /** @type {object} 系统引用 */
        this.systems = config.systems || {};

        /** @type {number} 武器上限 */
        this.maxWeapons = config.maxWeapons || 4;

        /** @type {WeaponSkill[]} 已装备的武器技能 */
        this.weapons = [];

        /** @type {PassiveEffect[]} 已获得的被动技能 */
        this.passives = [];

        /** @type {object} modifier 缓存 — dirty flag 模式 */
        this._modifierCache = {};
        this._modifierDirty = true;
    }

    /**
     * 每帧更新所有武器的开火逻辑
     * @param {number} deltaTime
     */
    update(deltaTime) {
        for (const weapon of this.weapons) {
            // 确保 weapon 绑定到同一 entity
            if (!weapon.entity) {
                weapon.entity = this.entity;
            }
            weapon.update(deltaTime);
        }
    }

    // ==================== 技能管理 ====================

    /**
     * 添加/升级技能
     * @param {string} skillId
     * @returns {boolean} 是否成功
     */
    addSkill(skillId) {
        const skillConfig = this.skillPool[skillId];
        if (!skillConfig) {
            console.warn(`[SkillComponent] Unknown skill: ${skillId}`);
            return false;
        }

        if (skillConfig.type === 'weapon') {
            return this._addWeapon(skillId, skillConfig);
        } else if (skillConfig.type === 'passive') {
            return this._addPassive(skillId, skillConfig);
        }

        return false;
    }

    /** @private */
    _addWeapon(skillId, skillConfig) {
        // 检查是否已有该武器 → 升级
        const existing = this.weapons.find(w => w.weaponId === skillId);
        if (existing) {
            const success = existing.levelUp();
            if (success) {
                console.log(`[SkillComponent] Weapon upgraded: ${skillConfig.name} → Lv.${existing.level}`);
            }
            return success;
        }

        // 检查武器上限
        if (this.weapons.length >= this.maxWeapons) {
            console.warn(`[SkillComponent] Weapon limit reached (${this.maxWeapons})`);
            return false;
        }

        // 新增武器
        const weapon = new WeaponSkill(skillConfig, this.systems);
        weapon.entity = this.entity;
        this.weapons.push(weapon);
        console.log(`[SkillComponent] New weapon: ${skillConfig.name} Lv.1`);
        return true;
    }

    /** @private */
    _addPassive(skillId, skillConfig) {
        // 检查是否已有该被动 → 升级
        const existing = this.passives.find(p => p.skillId === skillId);
        if (existing) {
            const success = existing.levelUp();
            if (success) {
                this._modifierDirty = true;
                console.log(`[SkillComponent] Passive upgraded: ${skillConfig.name} → Lv.${existing.level}`);
            }
            return success;
        }

        // 新增被动
        const passive = new PassiveEffect(skillConfig);
        this.passives.push(passive);
        this._modifierDirty = true;
        console.log(`[SkillComponent] New passive: ${skillConfig.name} Lv.1`);
        return true;
    }

    // ==================== Modifier 系统 ====================

    /**
     * 获取指定属性的汇总加成
     * @param {string} statName — 属性名（如 'attack', 'attackSpeed', 'critRate', 'maxHp', 'moveSpeed'）
     * @returns {{flatAdd: number, percentAdd: number}}
     */
    getStatModifier(statName) {
        // 使用缓存
        if (!this._modifierDirty && this._modifierCache[statName] !== undefined) {
            return this._modifierCache[statName];
        }

        // 重新计算全部缓存
        if (this._modifierDirty) {
            this._rebuildModifierCache();
        }

        return this._modifierCache[statName] || { flatAdd: 0, percentAdd: 0 };
    }

    /** @private 重建 modifier 缓存 */
    _rebuildModifierCache() {
        this._modifierCache = {};

        for (const passive of this.passives) {
            if (!this._modifierCache[passive.stat]) {
                this._modifierCache[passive.stat] = { flatAdd: 0, percentAdd: 0 };
            }

            const mod = this._modifierCache[passive.stat];
            if (passive.modType === 'flatAdd') {
                mod.flatAdd += passive.value;
            } else if (passive.modType === 'percentAdd') {
                mod.percentAdd += passive.value;
            }
        }

        this._modifierDirty = false;
    }

    // ==================== 技能池过滤 ====================

    /**
     * 获取可用技能候选列表（用于三选一弹窗）
     * @param {number} count — 需要几个候选
     * @returns {Array<{skillId: string, config: object, isUpgrade: boolean, currentLevel: number}>}
     */
    getAvailableSkills(count = 3) {
        const candidates = [];
        const weaponsFull = this.weapons.length >= this.maxWeapons;

        for (const [id, config] of Object.entries(this.skillPool)) {
            // 跳过非 weapon/passive 类型
            if (config.type !== 'weapon' && config.type !== 'passive') continue;

            if (config.type === 'weapon') {
                const existing = this.weapons.find(w => w.weaponId === id);
                if (existing) {
                    // 已有 → 可升级（如果没满级）
                    if (!existing.isMaxLevel()) {
                        candidates.push({
                            skillId: id,
                            config,
                            isUpgrade: true,
                            currentLevel: existing.level,
                            weight: config.selectWeight || 1
                        });
                    }
                } else {
                    // 新武器 → 武器没满才能选
                    if (!weaponsFull) {
                        candidates.push({
                            skillId: id,
                            config,
                            isUpgrade: false,
                            currentLevel: 0,
                            weight: config.selectWeight || 1
                        });
                    }
                }
            } else if (config.type === 'passive') {
                const existing = this.passives.find(p => p.skillId === id);
                if (existing) {
                    if (!existing.isMaxLevel()) {
                        candidates.push({
                            skillId: id,
                            config,
                            isUpgrade: true,
                            currentLevel: existing.level,
                            weight: config.selectWeight || 1
                        });
                    }
                } else {
                    candidates.push({
                        skillId: id,
                        config,
                        isUpgrade: false,
                        currentLevel: 0,
                        weight: config.selectWeight || 1
                    });
                }
            }
        }

        // 加权随机抽取
        return this._weightedSample(candidates, count);
    }

    /**
     * 加权随机抽取
     * @private
     */
    _weightedSample(candidates, count) {
        if (candidates.length <= count) return candidates;

        const result = [];
        const pool = [...candidates];

        for (let i = 0; i < count && pool.length > 0; i++) {
            const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
            let roll = Math.random() * totalWeight;

            for (let j = 0; j < pool.length; j++) {
                roll -= pool[j].weight;
                if (roll <= 0) {
                    result.push(pool[j]);
                    pool.splice(j, 1);
                    break;
                }
            }
        }

        return result;
    }

    /** 清理 */
    onDestroy() {
        this.weapons = [];
        this.passives = [];
        this._modifierCache = {};
    }
}
