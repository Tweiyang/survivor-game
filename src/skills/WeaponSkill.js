import { Component } from '../core/Component.js';
import { CombatComponent } from '../components/CombatComponent.js';
import { ProjectileFire } from './ProjectileFire.js';

/**
 * WeaponSkill — 武器技能组件
 * Unity equivalent: MonoBehaviour（挂载在玩家 Entity 上）
 *
 * 代表一把自动武器，通过 IFireStrategy 策略模式实现不同开火行为。
 * 由 SkillComponent 管理生命周期。
 */

/** @type {Object<string, Function>} 策略注册表 */
const STRATEGY_MAP = {
    'projectile': () => new ProjectileFire()
    // 未来扩展: 'cone': () => new ConeFire(), 'beam': () => new BeamFire()
};

export class WeaponSkill extends Component {
    /**
     * @param {object} skillConfig — 来自 skills.json 的完整武器配置
     * @param {object} systems — 游戏系统引用
     */
    constructor(skillConfig, systems = {}) {
        super();

        /** @type {string} 武器标识 */
        this.weaponId = skillConfig.id;

        /** @type {string} 显示名称 */
        this.name = skillConfig.name;

        /** @type {string} 图标 */
        this.icon = skillConfig.icon || '?';

        /** @type {number} 最大等级 */
        this.maxLevel = skillConfig.maxLevel || 5;

        /** @type {Array} 每级配置 */
        this.levels = skillConfig.levels || [];

        /** @type {number} 当前等级 (1-based) */
        this.level = 1;

        /** @type {object} 当前等级的配置 */
        this.config = this.levels[0] || {};

        /** @type {import('./IFireStrategy.js').IFireStrategy} 开火策略 */
        const strategyFactory = STRATEGY_MAP[skillConfig.fireStrategy];
        this.fireStrategy = strategyFactory ? strategyFactory() : new ProjectileFire();

        /** @type {number} 冷却计时器 */
        this.cooldownTimer = 0;

        /** @type {object} 系统引用 */
        this.systems = systems;
    }

    /**
     * 每帧更新 — 自动开火逻辑
     * @param {number} deltaTime
     */
    update(deltaTime) {
        if (!this.entity || !this.entity.active) return;

        // 累加冷却
        this.cooldownTimer += deltaTime;

        // 获取实际 fireRate（受攻速 modifier 影响）
        const combat = this.entity.getComponent(CombatComponent);
        const baseFireRate = this.config.fireRate || 0.5;
        let actualFireRate = baseFireRate;
        if (combat && typeof combat.getFinalAttackSpeed === 'function') {
            // 攻速 modifier 影响所有武器的 fireRate
            const atkSpeedMod = combat._getModifier('attackSpeed');
            actualFireRate = baseFireRate / (1 + atkSpeedMod.percentAdd);
        }

        if (this.cooldownTimer < actualFireRate) return;
        this.cooldownTimer = 0;

        // 寻找最近敌人
        const target = this._findNearestEnemy();
        if (!target) return;

        // 开火
        this.fireStrategy.tryFire(this.entity, target, this.config, this.systems);
    }

    /**
     * 升级武器
     * @returns {boolean}
     */
    levelUp() {
        if (this.level >= this.maxLevel) return false;

        this.level++;
        this.config = this.levels[this.level - 1] || this.config;
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
     * 获取下一级预览（用于 UI）
     * @returns {object|null}
     */
    getNextLevelConfig() {
        if (this.level >= this.maxLevel) return null;
        return this.levels[this.level] || null;
    }

    /**
     * 寻找攻击范围内最近的敌方实体
     * @private
     * @returns {import('../core/Entity.js').Entity|null}
     */
    _findNearestEnemy() {
        if (!this.systems.physicsSystem) return null;

        const combat = this.entity.getComponent(CombatComponent);
        const faction = combat ? combat.faction : 'player';
        const range = this.config.range || combat?.attackRange || 200;
        const pos = this.entity.transform.position;

        const hits = this.systems.physicsSystem.overlapCircle({ x: pos.x, y: pos.y }, range);
        if (!hits || hits.length === 0) return null;

        let nearest = null;
        let nearestDist = Infinity;

        for (const hit of hits) {
            if (hit === this.entity) continue;
            if (!hit.active) continue;

            const hitCombat = hit.getComponent(CombatComponent);
            if (!hitCombat || hitCombat.faction === faction) continue;

            const dx = hit.transform.position.x - pos.x;
            const dy = hit.transform.position.y - pos.y;
            const dist = dx * dx + dy * dy;

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = hit;
            }
        }

        return nearest;
    }
}
