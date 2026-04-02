/**
 * BattleRoom — 战斗房间
 * Unity equivalent: GameManager (Dedicated Server) + NetworkManager
 *
 * 管理最多 4 人的合作 PvE 战斗房间
 * 服务器权威：所有游戏逻辑由此房间驱动
 */
import { Room, Client } from '@colyseus/core';
import { BattleRoomState } from '../schema/BattleState';
export declare class BattleRoom extends Room<BattleRoomState> {
    maxClients: number;
    /** 角色配置表（从 characters.json 加载） */
    private characters;
    /** 关卡配置（从 levels.json 加载） */
    private levels;
    /** 玩家 ready 状态追踪 */
    private readyPlayers;
    /** 游戏是否已开始 */
    private gameStarted;
    /** Server tick 间隔引用 */
    private tickInterval;
    /** 服务端游戏子系统 */
    private physics;
    private spawner;
    private ai;
    private combat;
    private difficultyScaler;
    /** 公式配置 */
    private formulas;
    /** 难度配置 */
    private difficultyConfig;
    onCreate(options: any): void;
    onJoin(client: Client, options: any): void;
    onLeave(client: Client, consented: boolean): void;
    onDispose(): void;
    /** 处理玩家移动输入 */
    private _handleInput;
    /** 处理玩家 ready 状态 */
    private _handleReady;
    /** 处理角色切换 */
    private _handleSelectChar;
    /** 处理技能选择 */
    private _handleSkillChoice;
    /** 处理主动技能释放 */
    private _handleUseSkill;
    /** 启动游戏 */
    private _startGame;
    /** 停止游戏 */
    private _stopGame;
    /** 每 tick 执行的游戏逻辑 (20Hz) */
    private _gameTick;
    /** 检查关卡进度（Boss 门、通关） */
    private _checkLevelProgress;
    /** 在服务端物理层打开 Boss 门（将墙壁瓦片改为可通行） */
    private _openBossGatePhysics;
    /** 检查是否全员死亡 */
    private _checkGameOver;
    /** Boss 被击杀 → 切换到下一关 */
    private _onBossDefeated;
    /** 加载下一关 */
    private _loadNextLevel;
    /** 加载共享 JSON 配置 */
    private _loadConfigs;
}
//# sourceMappingURL=BattleRoom.d.ts.map