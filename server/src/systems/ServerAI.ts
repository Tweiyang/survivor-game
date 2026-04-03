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

/** 怪物移动速度表 */
const MONSTER_SPEEDS: Record<string, number> = {
    slime: 60,
    bat: 90,
    skeleton: 70,
    ghost: 90,
    boss_slime: 45,
    boss_skeleton: 50,
    boss_golem: 40,
};

/** 怪物碰撞半径表 */
const MONSTER_RADII: Record<string, number> = {
    slime: 16,
    bat: 12,
    skeleton: 18,
    ghost: 14,
    boss_slime: 28,
    boss_skeleton: 32,
    boss_golem: 32,
};

/** 怪物接触伤害表 */
const MONSTER_DAMAGE: Record<string, number> = {
    slime: 5,
    bat: 3,
    skeleton: 10,
    ghost: 14,
    boss_slime: 12,
    boss_skeleton: 18,
    boss_golem: 15,
};

/** 接触伤害冷却 (秒) */
const CONTACT_DAMAGE_COOLDOWN = 2.0;

export class ServerAI {
    private monsters: MapSchema<MonsterState>;
    private players: MapSchema<PlayerState>;
    private physics: ServerPhysics;

    /** 接触伤害冷却追踪: key = "monsterId:playerId", value = 剩余冷却时间 */
    private contactCooldowns: Map<string, number> = new Map();

    /** 接触伤害事件回调 */
    onContactDamage: ((playerId: string, damage: number, monsterId: string) => void) | null = null;

    constructor(
        monsters: MapSchema<MonsterState>,
        players: MapSchema<PlayerState>,
        physics: ServerPhysics
    ) {
        this.monsters = monsters;
        this.players = players;
        this.physics = physics;
    }

    /**
     * 每 tick 更新怪物 AI
     * @param dt 秒
     */
    update(dt: number) {
        // 更新接触伤害冷却
        this.contactCooldowns.forEach((cd, key) => {
            const newCd = cd - dt;
            if (newCd <= 0) {
                this.contactCooldowns.delete(key);
            } else {
                this.contactCooldowns.set(key, newCd);
            }
        });

        // 获取所有存活玩家位置
        const alivePlayers: Array<{ sessionId: string; x: number; y: number; radius: number }> = [];
        this.players.forEach((player, sessionId) => {
            if (player.alive) {
                alivePlayers.push({ sessionId, x: player.x, y: player.y, radius: 24 });
            }
        });

        if (alivePlayers.length === 0) return;

        // 更新每只怪物
        this.monsters.forEach((monster) => {
            if (!monster.alive) return;

            const speed = MONSTER_SPEEDS[monster.monsterType] || 60;
            const radius = MONSTER_RADII[monster.monsterType] || 16;

            // 寻找最近的存活玩家
            let nearest = alivePlayers[0];
            let nearestDistSq = Infinity;

            for (const p of alivePlayers) {
                const dx = p.x - monster.x;
                const dy = p.y - monster.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearest = p;
                }
            }

            // 向最近玩家移动
            const dx = nearest.x - monster.x;
            const dy = nearest.y - monster.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                const nx = dx / dist;
                const ny = dy / dist;

                const targetX = monster.x + nx * speed * dt;
                const targetY = monster.y + ny * speed * dt;

                // 碰撞检测
                const resolved = this.physics.resolveMovement(
                    monster.x, monster.y,
                    targetX, targetY,
                    radius
                );

                monster.x = resolved.x;
                monster.y = resolved.y;
            }

            // 接触伤害检测
            for (const p of alivePlayers) {
                if (this.physics.circleVsCircle(
                    monster.x, monster.y, radius,
                    p.x, p.y, p.radius
                )) {
                    const cdKey = `${monster.id}:${p.sessionId}`;
                    if (!this.contactCooldowns.has(cdKey)) {
                        const damage = MONSTER_DAMAGE[monster.monsterType] || 5;
                        this.contactCooldowns.set(cdKey, CONTACT_DAMAGE_COOLDOWN);

                        if (this.onContactDamage) {
                            this.onContactDamage(p.sessionId, damage, monster.id);
                        }
                    }
                }
            }
        });
    }
}
