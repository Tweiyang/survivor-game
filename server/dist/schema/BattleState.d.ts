/**
 * BattleRoomState — 房间顶层状态 Schema
 * Unity equivalent: NetworkManager + GameState NetworkVariable
 *
 * 包含所有需要同步到客户端的游戏状态
 * Colyseus 自动计算并发送 delta patch
 */
import { Schema, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState';
import { MonsterState } from './MonsterState';
import { ProjectileState } from './ProjectileState';
import { DropState } from './DropState';
import { LevelState } from './LevelState';
export declare class BattleRoomState extends Schema {
    /** 所有玩家状态，以 sessionId 为 key */
    players: MapSchema<PlayerState, string>;
    /** 所有怪物状态，以服务器自增 ID 为 key */
    monsters: MapSchema<MonsterState, string>;
    /** 所有投射物状态 */
    projectiles: MapSchema<ProjectileState, string>;
    /** 所有掉落物状态 */
    drops: MapSchema<DropState, string>;
    /** 关卡进度状态 */
    levelState: LevelState;
}
//# sourceMappingURL=BattleState.d.ts.map