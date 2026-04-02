/**
 * GameFlowTest — 服务端核心战斗流程集成测试
 *
 * 不依赖 Colyseus Transport，直接实例化子系统模拟完整游戏流程。
 * 用法: cd server && npx ts-node src/tests/GameFlowTest.ts
 *
 * 测试项:
 *   1. 怪物生成（含 Boss 门延迟）
 *   2. 投射物碰撞 → 怪物击杀
 *   3. Boss 门开启判定
 *   4. Boss 击杀 → 关卡切换
 *   5. 第二关通关 → 最终胜利
 *   6. 玩家死亡 → Game Over
 */
export {};
//# sourceMappingURL=GameFlowTest.d.ts.map