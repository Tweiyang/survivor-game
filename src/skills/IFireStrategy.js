/**
 * IFireStrategy — 开火策略接口基类
 * Unity equivalent: C# interface IFireStrategy
 *
 * 所有武器开火行为的抽象基类，不同武器类型通过实现此接口
 * 提供不同的攻击方式。
 */
export class IFireStrategy {
    /**
     * 执行一次开火
     * @param {import('../core/Entity.js').Entity} owner — 武器持有者实体
     * @param {import('../core/Entity.js').Entity} target — 目标实体
     * @param {object} config — 当前等级的武器配置
     * @param {object} systems — 游戏系统引用
     * @returns {boolean} 是否成功开火
     */
    tryFire(owner, target, config, systems) {
        // 子类重写
        return false;
    }
}
