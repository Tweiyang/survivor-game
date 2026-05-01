/**
 * ServerSpawner — 服务端怪物生成器
 * Unity equivalent: EnemySpawner (Server Build)
 *
 * 按 levels.json 配置生成波次怪物，应用难度缩放倍率
 */
import { MapSchema } from '@colyseus/schema';
import { MonsterState } from '../schema/MonsterState';
import { ServerPhysics } from './ServerPhysics';
export declare class ServerSpawner {
    /** 怪物 Map 引用 */
    private monsters;
    /** 物理系统引用 */
    private physics;
    /** 难度缩放倍率 */
    private difficultyMultiplier;
    /** 生成点队列 */
    private spawnQueue;
    /** 怪物 ID 自增计数器 */
    private nextMonsterId;
    /** Boss 房间暂存队列（门开后再生成） */
    private _bossRoomQueue;
    /** 瓦片大小 */
    private tileSize;
    constructor(monsters: MapSchema<MonsterState>, physics: ServerPhysics);
    /** 设置难度倍率 */
    setDifficultyMultiplier(multiplier: number): void;
    /**
     * 从关卡配置初始化生成点
     * 解析 rooms[].spawners 配置
     * Boss 房间的怪物会被暂存，等 Boss 门打开后再加入生成队列
     */
    loadLevel(levelConfig: any): void;
    /**
     * Boss 门打开后，将 Boss 房间的怪物加入生成队列
     */
    activateBossRoom(): void;
    /**
     * 每 tick 更新
     * @param dt 秒
     */
    update(dt: number): void;
    /**
     * 生成 Boss
     */
    spawnBoss(type: string, x: number, y: number): void;
    /**
     * 获取存活怪物数量
     */
    getAliveCount(): number;
    /**
     * 检查是否所有生成完毕且怪物全灭
     */
    isAllCleared(): boolean;
    /** 生成一只怪物 */
    private _spawnMonster;
}
//# sourceMappingURL=ServerSpawner.d.ts.map