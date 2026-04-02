/**
 * BattleRoomState — 房间顶层状态 Schema
 * Unity equivalent: NetworkManager + GameState NetworkVariable
 *
 * 包含所有需要同步到客户端的游戏状态
 * Colyseus 自动计算并发送 delta patch
 */
import { Schema, type, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState';
import { MonsterState } from './MonsterState';
import { ProjectileState } from './ProjectileState';
import { DropState } from './DropState';
import { LevelState } from './LevelState';

export class BattleRoomState extends Schema {
    /** 所有玩家状态，以 sessionId 为 key */
    @type({ map: PlayerState }) players = new MapSchema<PlayerState>();

    /** 所有怪物状态，以服务器自增 ID 为 key */
    @type({ map: MonsterState }) monsters = new MapSchema<MonsterState>();

    /** 所有投射物状态 */
    @type({ map: ProjectileState }) projectiles = new MapSchema<ProjectileState>();

    /** 所有掉落物状态 */
    @type({ map: DropState }) drops = new MapSchema<DropState>();

    /** 关卡进度状态 */
    @type(LevelState) levelState = new LevelState();
}
