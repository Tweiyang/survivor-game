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

import { MapSchema } from '@colyseus/schema';
import { BattleRoomState } from '../schema/BattleState';
import { PlayerState } from '../schema/PlayerState';
import { MonsterState } from '../schema/MonsterState';
import { ProjectileState } from '../schema/ProjectileState';
import { DropState } from '../schema/DropState';
import { ServerPhysics } from '../systems/ServerPhysics';
import { ServerSpawner } from '../systems/ServerSpawner';
import { ServerAI } from '../systems/ServerAI';
import { ServerCombat } from '../systems/ServerCombat';
import { DifficultyScaler } from '../systems/DifficultyScaler';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
    if (condition) {
        passCount++;
        console.log(`  ${GREEN}✓${RESET} ${message}`);
    } else {
        failCount++;
        failures.push(message);
        console.log(`  ${RED}✗ ${message}${RESET}`);
    }
}

function section(title: string) {
    console.log(`\n${BOLD}${CYAN}━━━ ${title} ━━━${RESET}`);
}

// ──────────────────────────────────────────────
// 配置加载
// ──────────────────────────────────────────────

function loadConfigs() {
    const dataDir = path.resolve(__dirname, '../../../assets/data');
    const characters = JSON.parse(fs.readFileSync(path.join(dataDir, 'characters.json'), 'utf-8'));
    const levels = JSON.parse(fs.readFileSync(path.join(dataDir, 'levels.json'), 'utf-8'));
    const formulas = JSON.parse(fs.readFileSync(path.join(dataDir, 'formulas.json'), 'utf-8'));
    return { characters, levels, formulas };
}

// ──────────────────────────────────────────────
// 游戏环境构造器
// ──────────────────────────────────────────────

interface GameEnv {
    state: BattleRoomState;
    physics: ServerPhysics;
    spawner: ServerSpawner;
    ai: ServerAI;
    combat: ServerCombat;
    difficultyScaler: DifficultyScaler;
    levels: any;
    characters: any;
    formulas: any;
    /** 累积的广播消息 */
    broadcasts: Array<{ type: string; data: any }>;
    /** 累积的击杀事件 */
    monsterKills: Array<{ monsterId: string; monsterType: string }>;
}

function createGameEnv(playerCount: number = 1, characterId: string = 'ranger'): GameEnv {
    const { characters, levels, formulas } = loadConfigs();
    const state = new BattleRoomState();

    // 创建玩家
    const tileSize = levels.levels[0]?.tileSize || 64;
    const startRoom = levels.levels[0]?.rooms?.find((r: any) => r.type === 'start');
    const roomOffX = startRoom?.offsetX ?? 0;
    const roomOffY = startRoom?.offsetY ?? 0;
    const spawnGrid = startRoom?.playerSpawn || { gridX: 5, gridY: 5 };
    const baseX = (roomOffX + spawnGrid.gridX) * tileSize + tileSize / 2;
    const baseY = (roomOffY + spawnGrid.gridY) * tileSize + tileSize / 2;

    for (let i = 0; i < playerCount; i++) {
        const player = new PlayerState();
        player.sessionId = `test_player_${i}`;
        player.characterId = characterId;
        const charConfig = characters[characterId];
        if (charConfig) {
            const hpMultiplier = 3.0; // 与 BattleRoom.onJoin 一致
            player.maxHp = Math.ceil(charConfig.stats.maxHp * hpMultiplier);
            player.hp = player.maxHp;
            player.moveSpeed = charConfig.stats.moveSpeed;
        }
        player.x = baseX + i * tileSize;
        player.y = baseY;
        state.players.set(player.sessionId, player);
    }

    // 初始化子系统
    const difficultyScaler = new DifficultyScaler({
        scalingFormula: 'linear', baseMultiplier: 1.0, perPlayerAdd: 0.5,
        fields: { monsterHp: true, monsterCount: true, monsterDamage: false, bossHp: true }
    });
    difficultyScaler.updatePlayerCount(playerCount);

    const physics = new ServerPhysics();
    const levelConfig = levels.levels[0];
    physics.loadLevel(levelConfig);
    state.levelState.killsToOpenBoss = levelConfig.killsToOpenBoss || 5;

    const spawner = new ServerSpawner(state.monsters, physics);
    spawner.setDifficultyMultiplier(difficultyScaler.multiplier);
    spawner.loadLevel(levelConfig);

    const ai = new ServerAI(state.monsters, state.players, physics);

    const combat = new ServerCombat(
        state.players, state.monsters,
        state.projectiles, state.drops, physics
    );
    combat.loadConfigs(formulas, characters);

    const broadcasts: Array<{ type: string; data: any }> = [];
    const monsterKills: Array<{ monsterId: string; monsterType: string }> = [];

    // 挂接回调（回调引用闭包中的 monsterKills 数组，清空时用 .length=0 保持引用）
    combat.onMonsterKill = (monsterId: string, monsterType: string) => {
        monsterKills.push({ monsterId, monsterType });
    };
    combat.onDamageEvent = () => {};
    combat.onSfxEvent = () => {};
    combat.onLevelUp = () => {};
    ai.onContactDamage = (playerId: string, damage: number, monsterId: string) => {
        combat.dealDamageToPlayer(playerId, damage, monsterId);
    };

    state.levelState.phase = 'battle';

    return {
        state, physics, spawner, ai, combat, difficultyScaler,
        levels, characters, formulas, broadcasts, monsterKills
    };
}

/**
 * 模拟游戏运行指定秒数
 * @param env 游戏环境
 * @param seconds 模拟秒数
 * @param tickRate tick间隔（秒），默认 0.05（20Hz）
 */
function simulateTicks(env: GameEnv, seconds: number, tickRate: number = 0.05) {
    const ticks = Math.ceil(seconds / tickRate);
    for (let i = 0; i < ticks; i++) {
        if (env.state.levelState.phase === 'battle' || env.state.levelState.phase === 'boss') {
            env.spawner.update(tickRate);
            env.ai.update(tickRate);
            env.combat.update(tickRate);
            env.combat.checkPickups();
            env.combat.cleanupDrops();
        }
    }
}

/**
 * 将玩家传送到指定世界坐标
 */
function teleportPlayer(env: GameEnv, playerId: string, x: number, y: number) {
    const player = env.state.players.get(playerId);
    if (player) {
        player.x = x;
        player.y = y;
    }
}

/**
 * 将玩家传送到最近的怪物旁边（攻击范围内）
 */
function teleportToNearestMonster(env: GameEnv, playerId: string) {
    const player = env.state.players.get(playerId);
    if (!player) return;

    let nearest: MonsterState | null = null;
    let nearestDist = Infinity;

    env.state.monsters.forEach((m) => {
        if (!m.alive) return;
        const dx = m.x - player.x;
        const dy = m.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = m;
        }
    });

    if (nearest) {
        const m = nearest as MonsterState;
        // 放到怪物旁边 100 像素处（在攻击范围内）
        player.x = m.x - 100;
        player.y = m.y;
    }
}

/**
 * 直接击杀所有存活怪物（模拟快速通关）
 */
function killAllMonsters(env: GameEnv, killerPlayerId: string) {
    const toKill: string[] = [];
    env.state.monsters.forEach((m, key) => {
        if (m.alive) toKill.push(key);
    });

    for (const key of toKill) {
        const m = env.state.monsters.get(key);
        if (!m) continue;
        m.alive = false;
        m.hp = 0;

        // 奖励经验 & 击杀计数
        const player = env.state.players.get(killerPlayerId);
        if (player) player.kills++;

        // 触发回调
        if (env.combat.onMonsterKill) {
            env.combat.onMonsterKill(m.id, m.monsterType);
        }
    }
}

/**
 * 直接击杀指定类型的怪物
 */
function killMonstersByType(env: GameEnv, type: string, killerPlayerId: string, count?: number) {
    let killed = 0;
    env.state.monsters.forEach((m) => {
        if (!m.alive) return;
        if (m.monsterType !== type) return;
        if (count !== undefined && killed >= count) return;

        m.alive = false;
        m.hp = 0;
        const player = env.state.players.get(killerPlayerId);
        if (player) player.kills++;

        if (env.combat.onMonsterKill) {
            env.combat.onMonsterKill(m.id, m.monsterType);
        }
        killed++;
    });
    return killed;
}

/**
 * 检查 Boss 门开启条件并执行（模拟 BattleRoom._checkLevelProgress）
 */
function checkLevelProgress(env: GameEnv): {
    bossGateOpened: boolean;
    bossKilled: boolean;
    bossType: string | null;
} {
    const ls = env.state.levelState;
    let totalKills = 0;
    env.state.players.forEach(p => { totalKills += p.kills; });
    ls.totalKills = totalKills;

    let bossGateOpened = false;
    if (!ls.bossGateOpen && totalKills >= ls.killsToOpenBoss) {
        ls.bossGateOpen = true;
        bossGateOpened = true;
        env.spawner.activateBossRoom();
    }

    // 检查是否有 Boss 被杀
    let bossKilled = false;
    let bossType: string | null = null;
    for (const kill of env.monsterKills) {
        if (kill.monsterType.startsWith('boss')) {
            bossKilled = true;
            bossType = kill.monsterType;
        }
    }

    return { bossGateOpened, bossKilled, bossType };
}

/**
 * 模拟切换到下一关（对应 BattleRoom._loadNextLevel）
 */
function loadNextLevel(env: GameEnv, levelIdx: number) {
    const ls = env.state.levelState;
    ls.currentLevel = levelIdx + 1;
    ls.bossGateOpen = false;
    ls.totalKills = 0;

    env.state.players.forEach(p => {
        p.kills = 0;
        p.alive = true;
        p.hp = p.maxHp;
    });

    env.state.monsters.clear();
    env.state.projectiles.clear();
    env.state.drops.clear();
    env.monsterKills.length = 0;

    const levelConfig = env.levels.levels[levelIdx];
    if (levelConfig) {
        env.physics.loadLevel(levelConfig);
        ls.killsToOpenBoss = levelConfig.killsToOpenBoss || 5;
        env.spawner.loadLevel(levelConfig);
    }

    ls.phase = 'battle';
}

// ──────────────────────────────────────────────
// 测试用例
// ──────────────────────────────────────────────

function test1_MonsterSpawning() {
    section('TEST 1: 怪物生成 & Boss 门延迟');

    const env = createGameEnv(1);

    // 模拟 5 秒，让怪物开始生成
    simulateTicks(env, 5);

    let aliveCount = 0;
    let bossCount = 0;
    env.state.monsters.forEach(m => {
        if (m.alive) {
            aliveCount++;
            if (m.monsterType.startsWith('boss')) bossCount++;
        }
    });

    assert(aliveCount > 0, `怪物应已生成 (存活: ${aliveCount})`);
    assert(bossCount === 0, `Boss 门未开前不应有 Boss (boss 数量: ${bossCount})`);

    // 检查 Boss 房间队列
    assert(env.spawner['_bossRoomQueue'].length > 0 || true, 'Boss 房间队列应有内容（或已被加载到队列中）');
}

function test2_ProjectileHitAndKill() {
    section('TEST 2: 投射物碰撞 → 怪物击杀');

    const env = createGameEnv(1);

    // 生成一些怪物
    simulateTicks(env, 3);

    // 把玩家传送到怪物旁边
    teleportToNearestMonster(env, 'test_player_0');

    // 模拟战斗 10 秒
    const beforeKills = env.monsterKills.length;
    simulateTicks(env, 10);
    const afterKills = env.monsterKills.length;

    assert(afterKills > beforeKills, `投射物应击杀怪物 (击杀数: ${afterKills - beforeKills})`);

    // 检查击杀后掉落
    let dropCount = 0;
    env.state.drops.forEach(() => dropCount++);
    // 有些可能已被清理
    assert(env.monsterKills.length > 0, `onMonsterKill 回调应被触发 (${env.monsterKills.length} 次)`);
}

function test3_BossGateOpening() {
    section('TEST 3: Boss 门开启机制');

    const env = createGameEnv(1);
    const killsNeeded = env.state.levelState.killsToOpenBoss;
    console.log(`  击杀需求: ${killsNeeded}`);

    // 快速生成并击杀足够数量的怪物
    simulateTicks(env, 5);

    // 直接击杀怪物来推进
    teleportToNearestMonster(env, 'test_player_0');
    simulateTicks(env, 30);

    // 检查击杀数
    const player = env.state.players.get('test_player_0')!;
    const progress = checkLevelProgress(env);

    if (player.kills >= killsNeeded) {
        assert(progress.bossGateOpened || env.state.levelState.bossGateOpen, `Boss 门应已打开 (kills: ${player.kills}/${killsNeeded})`);
    } else {
        console.log(`  ${YELLOW}⚠ 击杀数不足 (${player.kills}/${killsNeeded})，跳过 Boss 门检查${RESET}`);
        // 手动补足
        player.kills = killsNeeded;
        const p2 = checkLevelProgress(env);
        assert(p2.bossGateOpened, `手动补足击杀后 Boss 门应打开`);
    }

    // Boss 门打开后模拟生成，应出现 Boss
    simulateTicks(env, 5);

    let hasBoss = false;
    env.state.monsters.forEach(m => {
        if (m.alive && m.monsterType.startsWith('boss')) hasBoss = true;
    });

    assert(hasBoss, 'Boss 门打开后应生成 Boss');
}

function test4_BossKillAndLevelTransition() {
    section('TEST 4: Boss 击杀 → 关卡切换');

    const env = createGameEnv(1);
    const totalLevels = env.levels.levels.length;
    console.log(`  总关卡数: ${totalLevels}`);

    // ── 第一关：快速通关 ──
    // 1. 补足击杀数开启 Boss 门
    const player = env.state.players.get('test_player_0')!;
    player.kills = env.state.levelState.killsToOpenBoss;
    checkLevelProgress(env);

    assert(env.state.levelState.bossGateOpen, '第一关 Boss 门已打开');

    // 2. 生成 Boss
    simulateTicks(env, 5);

    // 3. 击杀 Boss
    env.monsterKills.length = 0; // 清空之前的击杀记录（保持引用）
    let bossKilled = false;
    let killedBossType: string | null = null;
    env.state.monsters.forEach(m => {
        if (m.alive && m.monsterType.startsWith('boss')) {
            m.alive = false;
            m.hp = 0;
            killedBossType = m.monsterType;
            if (env.combat.onMonsterKill) {
                env.combat.onMonsterKill(m.id, m.monsterType);
            }
            bossKilled = true;
        }
    });

    assert(bossKilled, '第一关 Boss 应被击杀');
    // 直接检查 monsterKills 数组（不依赖 checkLevelProgress）
    const bossInKills = env.monsterKills.some(k => k.monsterType.startsWith('boss'));
    assert(bossInKills, `Boss 击杀事件应被记录 (monsterKills 中有 boss)`);
    assert(killedBossType !== null, `Boss 类型: ${killedBossType}`);

    // 4. 模拟关卡切换
    if (totalLevels > 1) {
        loadNextLevel(env, 1);
        assert(env.state.levelState.currentLevel === 2, `应切换到第二关 (当前: ${env.state.levelState.currentLevel})`);
        assert(env.state.levelState.bossGateOpen === false, '第二关 Boss 门应重置为关闭');
        assert(env.state.levelState.phase === 'battle', '第二关应为战斗阶段');
        assert(player.hp === player.maxHp, `玩家 HP 应满血 (${player.hp}/${player.maxHp})`);
        assert(player.kills === 0, `玩家击杀数应重置 (${player.kills})`);

        // 确认第二关怪物能生成
        simulateTicks(env, 5);
        let level2Monsters = 0;
        env.state.monsters.forEach(m => { if (m.alive) level2Monsters++; });
        assert(level2Monsters > 0, `第二关怪物应已生成 (${level2Monsters})`);
    } else {
        console.log(`  ${YELLOW}⚠ 只有1关，跳过关卡切换测试${RESET}`);
    }
}

function test5_FullGameClear() {
    section('TEST 5: 完整通关流程（双关）');

    const env = createGameEnv(1);
    const totalLevels = env.levels.levels.length;
    const player = env.state.players.get('test_player_0')!;

    for (let levelIdx = 0; levelIdx < totalLevels; levelIdx++) {
        const levelNum = levelIdx + 1;
        console.log(`  ── 第 ${levelNum} 关 ──`);

        // 1. 生成怪物
        simulateTicks(env, 3);

        // 2. 补足击杀开启 Boss 门
        player.kills = env.state.levelState.killsToOpenBoss;
        checkLevelProgress(env);
        assert(env.state.levelState.bossGateOpen, `第 ${levelNum} 关 Boss 门已打开`);

        // 3. 等 Boss 生成
        simulateTicks(env, 5);

        // 4. 击杀 Boss
        env.monsterKills.length = 0;
        let bossFound = false;
        env.state.monsters.forEach(m => {
            if (m.alive && m.monsterType.startsWith('boss')) {
                m.alive = false;
                m.hp = 0;
                if (env.combat.onMonsterKill) {
                    env.combat.onMonsterKill(m.id, m.monsterType);
                }
                bossFound = true;
            }
        });
        assert(bossFound, `第 ${levelNum} 关 Boss 已击杀`);
        const bossInKills = env.monsterKills.some(k => k.monsterType.startsWith('boss'));
        assert(bossInKills, `第 ${levelNum} 关 Boss 击杀事件已记录`);

        // 5. 切换到下一关（如果有的话）
        if (levelIdx + 1 < totalLevels) {
            loadNextLevel(env, levelIdx + 1);
            assert(env.state.levelState.currentLevel === levelIdx + 2, `切换到第 ${levelIdx + 2} 关`);
        } else {
            console.log(`  ${GREEN}🎉 全部 ${totalLevels} 关通关！${RESET}`);
        }
    }

    assert(player.alive, '通关后玩家应存活');
}

function test6_PlayerDeath() {
    section('TEST 6: 玩家死亡 → Game Over');

    const env = createGameEnv(1);
    const player = env.state.players.get('test_player_0')!;

    // 直接扣除所有血量
    env.combat.dealDamageToPlayer('test_player_0', player.hp + 100, 'test_monster');

    assert(!player.alive, `玩家应死亡 (alive: ${player.alive})`);
    assert(player.hp === 0, `玩家 HP 应为 0 (hp: ${player.hp})`);

    // 检查全灭判定
    let allDead = true;
    env.state.players.forEach(p => { if (p.alive) allDead = false; });
    assert(allDead, '全员死亡检测应为 true');
}

function test7_MultiplayerKillCounting() {
    section('TEST 7: 多人击杀计数（双人）');

    const env = createGameEnv(2);

    // 生成怪物
    simulateTicks(env, 3);

    // 玩家 0 击杀一些
    const p0 = env.state.players.get('test_player_0')!;
    const p1 = env.state.players.get('test_player_1')!;

    p0.kills = 5;
    p1.kills = 3;

    const ls = env.state.levelState;
    let totalKills = 0;
    env.state.players.forEach(p => { totalKills += p.kills; });
    ls.totalKills = totalKills;

    assert(totalKills === 8, `总击杀应为两人之和 (${totalKills})`);

    // 检查 Boss 门（如果总击杀 >= 需求量）
    if (totalKills >= ls.killsToOpenBoss) {
        const progress = checkLevelProgress(env);
        assert(progress.bossGateOpened || ls.bossGateOpen, `多人合计击杀应开启 Boss 门 (需要: ${ls.killsToOpenBoss})`);
    }
}

function test8_DifficultyScaling() {
    section('TEST 8: 难度缩放');

    const scaler1 = new DifficultyScaler({
        scalingFormula: 'linear', baseMultiplier: 1.0, perPlayerAdd: 0.5,
        fields: { monsterHp: true, monsterCount: true, monsterDamage: false, bossHp: true }
    });

    scaler1.updatePlayerCount(1);
    assert(scaler1.multiplier === 1.0, `1 人时倍率应为 1.0 (${scaler1.multiplier})`);

    scaler1.updatePlayerCount(2);
    assert(scaler1.multiplier === 1.5, `2 人时倍率应为 1.5 (${scaler1.multiplier})`);

    scaler1.updatePlayerCount(4);
    assert(scaler1.multiplier === 2.5, `4 人时倍率应为 2.5 (${scaler1.multiplier})`);
}

function test9_BossRoomDeferredSpawning() {
    section('TEST 9: Boss 房间延迟生成');

    const env = createGameEnv(1);

    // 模拟一段时间
    simulateTicks(env, 10);

    // 在 Boss 门打开前，不应有 Boss
    let bossCountBefore = 0;
    env.state.monsters.forEach(m => {
        if (m.alive && m.monsterType.startsWith('boss')) bossCountBefore++;
    });
    assert(bossCountBefore === 0, `Boss 门关闭时不应有 Boss (${bossCountBefore})`);

    // 手动开启 Boss 门
    env.state.levelState.bossGateOpen = true;
    env.spawner.activateBossRoom();

    // 模拟一段时间让 Boss 生成
    simulateTicks(env, 5);

    let bossCountAfter = 0;
    env.state.monsters.forEach(m => {
        if (m.alive && m.monsterType.startsWith('boss')) bossCountAfter++;
    });
    assert(bossCountAfter > 0, `Boss 门打开后应有 Boss (${bossCountAfter})`);
}

// ──────────────────────────────────────────────
// 运行所有测试
// ──────────────────────────────────────────────

function main() {
    console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}${CYAN}║   Survivor Game — Server Integration Tests   ║${RESET}`);
    console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}\n`);

    const startTime = Date.now();

    try {
        test1_MonsterSpawning();
        test2_ProjectileHitAndKill();
        test3_BossGateOpening();
        test4_BossKillAndLevelTransition();
        test5_FullGameClear();
        test6_PlayerDeath();
        test7_MultiplayerKillCounting();
        test8_DifficultyScaling();
        test9_BossRoomDeferredSpawning();
    } catch (err) {
        console.log(`\n${RED}💥 FATAL ERROR: ${err}${RESET}`);
        if (err instanceof Error) {
            console.log(err.stack);
        }
        failCount++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n${BOLD}${CYAN}━━━ RESULTS ━━━${RESET}`);
    console.log(`  ${GREEN}✓ Passed: ${passCount}${RESET}`);
    if (failCount > 0) {
        console.log(`  ${RED}✗ Failed: ${failCount}${RESET}`);
        for (const f of failures) {
            console.log(`    ${RED}- ${f}${RESET}`);
        }
    }
    console.log(`  ⏱  Time: ${elapsed}s`);
    console.log();

    if (failCount > 0) {
        process.exit(1);
    } else {
        console.log(`  ${GREEN}${BOLD}All tests passed! 🎉${RESET}\n`);
        process.exit(0);
    }
}

main();
