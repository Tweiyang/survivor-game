import { Component } from '../core/Component.js';
import { OverchargeSkill } from '../skills/OverchargeSkill.js';
import { ShieldBashSkill } from '../skills/ShieldBashSkill.js';
import { NanoHealSkill } from '../skills/NanoHealSkill.js';

/**
 * ActiveSkillComponent — 主动技能组件
 * Unity equivalent: MonoBehaviour（挂载在玩家 Entity 上）
 *
 * 管理角色绑定的主动技能：冷却、释放、持续效果更新。
 * 通过 IActiveSkill 策略模式支持不同技能行为。
 */

/** @type {Object<string, Function>} 主动技能策略注册表 */
const ACTIVE_SKILL_MAP = {
    'overcharge': () => new OverchargeSkill(),
    'shield_bash': () => new ShieldBashSkill(),
    'nano_heal': () => new NanoHealSkill()
};

export class ActiveSkillComponent extends Component {
    /**
     * @param {object} config
     * @param {string} config.skillId — 技能标识
     * @param {string} config.name — 技能名称
     * @param {string} config.icon — 技能图标
     * @param {number} config.cooldown — 冷却时长（秒）
     * @param {object} config.skillConfig — 完整的 activeSkillConfig
     * @param {object} config.systems — 游戏系统引用
     */
    constructor(config = {}) {
        super(config);

        /** @type {string} 技能标识 */
        this.skillId = config.skillId || '';

        /** @type {string} 技能名称 */
        this.name = config.name || '';

        /** @type {string} 技能图标 */
        this.icon = config.icon || '?';

        /** @type {number} 冷却总时长（秒） */
        this.cooldownDuration = config.cooldown || 10;

        /** @type {number} 当前冷却剩余（秒），0 表示就绪 */
        this.cooldownTimer = 0;

        /** @type {object} 技能配置参数 */
        this.skillConfig = config.skillConfig || {};

        /** @type {object} 系统引用 */
        this.systems = config.systems || {};

        /** @type {import('../skills/IActiveSkill.js').IActiveSkill|null} 技能策略实例 */
        const strategyFactory = ACTIVE_SKILL_MAP[config.skillId];
        this.strategy = strategyFactory ? strategyFactory() : null;
    }

    /**
     * 每帧更新 — 冷却递减 + 持续效果
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // 递减冷却计时器
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
            if (this.cooldownTimer < 0) this.cooldownTimer = 0;
        }

        // 更新技能持续效果（如超频的临时加成）
        if (this.strategy && typeof this.strategy.updateEffect === 'function') {
            this.strategy.updateEffect(deltaTime);
        }
    }

    /**
     * 尝试释放技能
     * @returns {boolean} 是否成功释放
     */
    tryActivate() {
        if (!this.isReady()) return false;
        if (!this.strategy) return false;

        this.strategy.execute(this.entity, this.systems, this.skillConfig);
        this.cooldownTimer = this.cooldownDuration;

        // 主动技能释放音效
        if (this.systems && this.systems.eventSystem) {
            this.systems.eventSystem.emit('onSFX', { soundId: 'active_skill' });
        }
        return true;
    }

    /**
     * 技能是否就绪
     * @returns {boolean}
     */
    isReady() {
        return this.cooldownTimer <= 0;
    }

    /**
     * 获取冷却进度百分比
     * @returns {number} 0=就绪, 1=刚释放
     */
    getCooldownPercent() {
        if (this.cooldownDuration <= 0) return 0;
        return Math.max(0, this.cooldownTimer / this.cooldownDuration);
    }

    /**
     * 获取冷却剩余秒数（向上取整）
     * @returns {number}
     */
    getCooldownSeconds() {
        return Math.ceil(Math.max(0, this.cooldownTimer));
    }
}
