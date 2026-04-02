/**
 * ServerSpawner — 服务端怪物生成器
 * Unity equivalent: EnemySpawner (Server Build)
 *
 * 按 levels.json 配置生成波次怪物，应用难度缩放倍率
 */
import { MapSchema } from '@colyseus/schema';
import { MonsterState } from '../schema/MonsterState';
import { ServerPhysics } from './ServerPhysics';

/** 生成点配置 */
interface SpawnPoint {
    x: number;
    y: number;
    type: string;
    count?: number;
    interval?: number;
}

/** 怪物基础属性 */
const MONSTER_STATS: Record<string, { hp: number; speed: number; damage: number; radius: number }> = {
    slime:       { hp: 30,  speed: 60,  damage: 5,  radius: 16 },
    bat:         { hp: 20,  speed: 90,  damage: 3,  radius: 12 },
    skeleton:    { hp: 50,  speed: 50,  damage: 8,  radius: 18 },
    boss_slime:  { hp: 150, speed: 45,  damage: 12, radius: 28 },
    boss_golem:  { hp: 300, speed: 40,  damage: 15, radius: 32 },
};

export class ServerSpawner {
    /** 怪物 Map 引用 */
    private monsters: MapSchema<MonsterState>;

    /** 物理系统引用 */
    private physics: ServerPhysics;

    /** 难度缩放倍率 */
    private difficultyMultiplier: number = 1.0;

    /** 生成点队列 */
    private spawnQueue: Array<{
        type: string;
        x: number;
        y: number;
        timer: number;
        remaining: number;
        interval: number;
    }> = [];

    /** 怪物 ID 自增计数器 */
    private nextMonsterId: number = 1;

    /** Boss 房间暂存队列（门开后再生成） */
    private _bossRoomQueue: Array<{
        type: string;
        x: number;
        y: number;
        timer: number;
        remaining: number;
        interval: number;
    }> = [];

    /** 瓦片大小 */
    private tileSize: number = 64;

    constructor(monsters: MapSchema<MonsterState>, physics: ServerPhysics) {
        this.monsters = monsters;
        this.physics = physics;
        this.tileSize = physics.tileSize;
    }

    /** 设置难度倍率 */
    setDifficultyMultiplier(multiplier: number) {
        this.difficultyMultiplier = multiplier;
    }

    /**
     * 从关卡配置初始化生成点
     * 解析 rooms[].spawners 配置
     * Boss 房间的怪物会被暂存，等 Boss 门打开后再加入生成队列
     */
    loadLevel(levelConfig: any) {
        this.spawnQueue = [];
        this._bossRoomQueue = [];

        const rooms = levelConfig.rooms || [];
        for (const room of rooms) {
            // 兼容 "spawns" 和 "spawners" 两种字段名
            const spawns = room.spawns || room.spawners || [];
            if (spawns.length === 0) continue;

            const isBossRoom = room.type === 'boss';

            // 兼容 offsetX/offsetY 和 x/y
            const roomX = room.offsetX ?? room.x ?? 0;
            const roomY = room.offsetY ?? room.y ?? 0;

            for (const sp of spawns) {
                // 兼容 gridX/gridY 和 x/y 坐标格式
                const spGridX = sp.gridX ?? sp.x ?? 0;
                const spGridY = sp.gridY ?? sp.y ?? 0;

                // 瓦片坐标 → 世界坐标（中心点）
                const worldX = (roomX + spGridX) * this.tileSize + this.tileSize / 2;
                const worldY = (roomY + spGridY) * this.tileSize + this.tileSize / 2;

                // 兼容 monsterType 和 type 字段名
                const monsterType = sp.monsterType || sp.type || 'slime';

                // 应用难度缩放到数量
                const baseCount = sp.count || 1;
                const scaledCount = Math.ceil(baseCount * this.difficultyMultiplier);

                const entry = {
                    type: monsterType,
                    x: worldX,
                    y: worldY,
                    timer: 0,
                    remaining: scaledCount,
                    interval: sp.interval || 2.0,
                };

                if (isBossRoom) {
                    // Boss 房间的怪物（包括 Boss）暂存，门开后再生成
                    this._bossRoomQueue.push(entry);
                } else {
                    this.spawnQueue.push(entry);
                }
            }
        }

        console.log(`[ServerSpawner] Loaded ${this.spawnQueue.length} spawn points + ${this._bossRoomQueue.length} boss room spawns (deferred), difficulty: ${this.difficultyMultiplier}x`);
    }

    /**
     * Boss 门打开后，将 Boss 房间的怪物加入生成队列
     */
    activateBossRoom() {
        if (this._bossRoomQueue.length === 0) return;
        console.log(`[ServerSpawner] Activating boss room spawns: ${this._bossRoomQueue.length} entries`);
        this.spawnQueue.push(...this._bossRoomQueue);
        this._bossRoomQueue = [];
    }

    /**
     * 每 tick 更新
     * @param dt 秒
     */
    update(dt: number) {
        for (const sp of this.spawnQueue) {
            if (sp.remaining <= 0) continue;

            sp.timer += dt;
            if (sp.timer >= sp.interval) {
                sp.timer -= sp.interval;
                this._spawnMonster(sp.type, sp.x, sp.y);
                sp.remaining--;
            }
        }
    }

    /**
     * 生成 Boss
     */
    spawnBoss(type: string, x: number, y: number) {
        const stats = MONSTER_STATS[type] || MONSTER_STATS['boss_golem'];

        const monster = new MonsterState();
        const id = `boss_${this.nextMonsterId++}`;
        monster.id = id;
        monster.monsterType = type;
        monster.x = x;
        monster.y = y;
        monster.hp = Math.ceil(stats.hp * this.difficultyMultiplier);
        monster.maxHp = monster.hp;
        monster.alive = true;

        this.monsters.set(id, monster);
        console.log(`[ServerSpawner] Boss spawned: ${type} at (${x}, ${y}) HP=${monster.hp}`);
    }

    /**
     * 获取存活怪物数量
     */
    getAliveCount(): number {
        let count = 0;
        this.monsters.forEach(m => { if (m.alive) count++; });
        return count;
    }

    /**
     * 检查是否所有生成完毕且怪物全灭
     */
    isAllCleared(): boolean {
        const allSpawned = this.spawnQueue.every(sp => sp.remaining <= 0);
        return allSpawned && this.getAliveCount() === 0;
    }

    // ─────────── Private ───────────

    /** 生成一只怪物 */
    private _spawnMonster(type: string, x: number, y: number) {
        const stats = MONSTER_STATS[type] || MONSTER_STATS['slime'];

        const monster = new MonsterState();
        const id = `m_${this.nextMonsterId++}`;
        monster.id = id;
        monster.monsterType = type;
        monster.x = x;
        monster.y = y;

        // 应用难度缩放到血量
        monster.hp = Math.ceil(stats.hp * this.difficultyMultiplier);
        monster.maxHp = monster.hp;
        monster.alive = true;

        this.monsters.set(id, monster);
    }
}
