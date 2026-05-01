/**
 * IActiveSkill — 主动技能策略接口
 * Unity equivalent: C# interface IActiveSkill
 *
 * 定义主动技能的行为。每个角色绑定一个具体策略实现。
 * 与 IFireStrategy（武器开火策略）同属策略模式家族。
 */
export class IActiveSkill {
    /**
     * 执行技能效果
     * @param {import('../core/Entity.js').Entity} owner — 技能持有者（玩家 Entity）
     * @param {object} systems — 游戏系统引用
     * @param {object} config — 来自 characters.json 的 activeSkillConfig
     */
    execute(owner, systems, config) {
        throw new Error('IActiveSkill.execute() must be implemented');
    }

    /**
     * 获取技能描述
     * @returns {string}
     */
    getDescription() {
        return '';
    }
}
