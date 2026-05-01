/**
 * ExperienceSystem — 经验值与升级系统
 * [Network] 经验/升级应由服务器权威计算
 */
export class ExperienceSystem {
    /**
     * @param {object} config
     * @param {object} config.eventSystem
     * @param {object} config.formulas - formulas.json 数据
     */
    constructor(config = {}) {
        this.eventSystem = config.eventSystem || null;
        this.formulas = config.formulas || {};

        /** @type {number} 当前等级 */
        this.level = 1;
        /** @type {number} 当前经验 */
        this.currentExp = 0;
        /** @type {number} 升级所需经验 */
        this.expToNextLevel = this._calcExpToLevel(1);
        /** @type {number} 击杀数 */
        this.killCount = 0;

        // 监听拾取事件
        if (this.eventSystem) {
            this._onPickup = this._onPickup.bind(this);
            this.eventSystem.on('onPickup', this._onPickup);
        }
    }

    /** @private 计算升级所需经验 */
    _calcExpToLevel(level) {
        const base = this.formulas.baseExpToLevel || 50;
        const mult = this.formulas.expLevelMultiplier || 1.3;
        return Math.round(base * Math.pow(mult, level - 1));
    }

    /** @private 拾取回调 */
    _onPickup(data) {
        if (data.dropType === 'exp') {
            this.addExp(data.value);
            // 拾取音效
            if (this.eventSystem) {
                this.eventSystem.emit('onSFX', { soundId: 'exp_pickup' });
            }
        }
    }

    /**
     * 增加经验值
     * @param {number} amount
     */
    addExp(amount) {
        this.currentExp += amount;

        // 检查升级（支持连升多级）
        while (this.currentExp >= this.expToNextLevel) {
            this.currentExp -= this.expToNextLevel;
            this.level++;
            this.expToNextLevel = this._calcExpToLevel(this.level);

            if (this.eventSystem) {
                // 升级音效
                this.eventSystem.emit('onSFX', { soundId: 'level_up' });
                /* P2 将在 onLevelUp 事件上挂载技能选择弹窗 */
                this.eventSystem.emit('onLevelUp', {
                    level: this.level,
                    expSystem: this
                });
            }

            console.log(`[ExpSystem] Level UP! → Lv.${this.level} (next: ${this.expToNextLevel} exp)`);
        }
    }

    /**
     * 获取经验条比例 0~1
     * @returns {number}
     */
    getExpRatio() {
        return this.expToNextLevel > 0 ? this.currentExp / this.expToNextLevel : 0;
    }

    /** 重置（场景重启时） */
    reset() {
        this.level = 1;
        this.currentExp = 0;
        this.expToNextLevel = this._calcExpToLevel(1);
        this.killCount = 0;
    }

    /** 清理事件监听 */
    dispose() {
        if (this.eventSystem && this._onPickup) {
            this.eventSystem.off('onPickup', this._onPickup);
        }
    }
}
