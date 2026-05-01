/**
 * ServerAI — 服务端怪物 AI
 * Unity equivalent: NavMeshAgent (Server Build)
 *
 * 怪物追击最近玩家逻辑 + 接触伤害检测
 */
import { MapSchema } from '@colyseus/schema';
import { MonsterState } from '../schema/MonsterState';
import { PlayerState } from '../schema/PlayerState';
import { ServerPhysics } from './ServerPhysics';
export declare class ServerAI {
    private monsters;
    private players;
    private physics;
    /** 接触伤害冷却追踪: key = "monsterId:playerId", value = 剩余冷却时间 */
    private contactCooldowns;
    /** 接触伤害事件回调 */
    onContactDamage: ((playerId: string, damage: number, monsterId: string) => void) | null;
    constructor(monsters: MapSchema<MonsterState>, players: MapSchema<PlayerState>, physics: ServerPhysics);
    /**
     * 每 tick 更新怪物 AI
     * @param dt 秒
     */
    update(dt: number): void;
}
//# sourceMappingURL=ServerAI.d.ts.map