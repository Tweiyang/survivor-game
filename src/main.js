/**
 * 游戏主入口 — 串联所有引擎系统
 * Unity equivalent: 项目入口场景的初始化脚本
 */

import { EntityManager } from './core/EntityManager.js';
import { EventSystem } from './core/EventSystem.js';
import { SceneManager } from './core/SceneManager.js';
import { GameLoop } from './core/GameLoop.js';
import { InputManager } from './systems/InputManager.js';
import { TouchInputProvider } from './systems/TouchInputProvider.js';
import { DeviceDetector } from './systems/DeviceDetector.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { TilemapData } from './map/TilemapData.js';
import { TilemapRenderer } from './map/TilemapRenderer.js';
import { BattleScene } from './scenes/BattleScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { AudioManager } from './systems/AudioManager.js';
import { BGMController } from './systems/BGMController.js';
import { NetworkManager } from './systems/NetworkManager.js';
import { LobbyScene } from './scenes/LobbyScene.js';

// ============================================================
// 1. 初始化 Canvas
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 通知摄像机视口变化
    if (camera) {
        camera.resize(canvas.width, canvas.height);
    }
}

// ============================================================
// 2. 初始化所有游戏系统
// ============================================================
const entityManager = new EntityManager();
const eventSystem = new EventSystem();
const inputManager = new InputManager();

// P4: 设备检测
const deviceDetector = new DeviceDetector();
const initialDevice = deviceDetector.detect();

// 如果初始检测为触屏，立即切换到 TouchInputProvider
if (initialDevice === 'touch') {
    inputManager.setProvider(new TouchInputProvider(canvas));
}

// 注册运行时设备切换
deviceDetector.onDeviceChange((newType) => {
    if (newType === 'touch') {
        inputManager.setProvider(new TouchInputProvider(canvas));
        console.log('[Game] Switched to touch input');
    } else {
        inputManager.useKeyboard();
        console.log('[Game] Switched to keyboard input');
    }
});
deviceDetector.startRuntimeDetection();

// 初始摄像机（尺寸在 resize 时更新）
const camera = new CameraSystem(window.innerWidth, window.innerHeight);

// 渲染系统
const renderSystem = new RenderSystem(ctx, camera, entityManager);

// 物理系统
const physicsSystem = new PhysicsSystem(entityManager);

// 瓦片地图（先创建空的，场景 init 时替换数据）
const defaultTilemap = new TilemapData();
const tilemapRenderer = new TilemapRenderer(ctx, defaultTilemap);

// 系统集合（传递给场景和其他模块）
const systems = {
    entityManager,
    eventSystem,
    inputManager,
    camera,
    renderSystem,
    physicsSystem,
    tilemapRenderer,
    ctx,
    canvas
};

// 场景管理器
const sceneManager = new SceneManager(systems);

// 将 gameLoop 和 sceneManager 也挂到 systems 上（BattleScene 需要）
systems.sceneManager = sceneManager;

// ============================================================
// 3. 注册场景
// ============================================================
sceneManager.register('battle', BattleScene);
sceneManager.register('character-select', CharacterSelectScene);
sceneManager.register('lobby', LobbyScene);

// ============================================================
// 4. 创建 GameLoop
// ============================================================
const gameLoop = new GameLoop({
    inputManager,
    entityManager,
    physicsSystem,
    renderSystem,
    camera,
    sceneManager,
    tilemapRenderer,
    ctx,
    canvas
});

// 将 gameLoop 挂到 systems（GameOverUI 需要引用来暂停/恢复）
systems.gameLoop = gameLoop;

// ============================================================
// 5. 调试信息 + 场景 UI 渲染
// ============================================================
gameLoop.onDebugRender = (ctx, deltaTime) => {
    // 场景级 UI（HUD、GameOver）
    const currentScene = sceneManager.currentScene;
    if (currentScene && typeof currentScene.renderUI === 'function') {
        currentScene.renderUI(deltaTime);
    }

    // 调试 HUD（右上角）
    const player = entityManager.findByTag('player');
    const playerPos = player ? player.transform.position : { x: 0, y: 0 };

    // 从场景获取额外数据
    const expSys = currentScene && currentScene.experienceSystem;
    const level = expSys ? expSys.level : '-';
    const kills = expSys ? expSys.killCount : '-';

    const debugX = canvas.width - 240;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(debugX, 8, 228, 100);

    ctx.font = '13px monospace';
    ctx.fillStyle = '#00FF88';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${gameLoop.fps}`, debugX + 8, 16);
    ctx.fillText(`Entities: ${entityManager.count}`, debugX + 8, 34);
    ctx.fillText(`Player: (${Math.round(playerPos.x)}, ${Math.round(playerPos.y)})`, debugX + 8, 52);
    ctx.fillText(`Level: ${level}  Kills: ${kills}`, debugX + 8, 70);
    ctx.fillText(`Paused: ${gameLoop.isPaused}  Input: ${inputManager.getCurrentDeviceType()}`, debugX + 8, 88);
    ctx.restore();

    // P4: 渲染触屏虚拟控件（摇杆/按钮，仅 touch 模式生效）
    inputManager.render(ctx);

    // 触屏 canvas 尺寸适配
    if (inputManager.getCurrentDeviceType() === 'touch' && inputManager._provider && inputManager._provider.updateLayout) {
        inputManager._provider.updateLayout(canvas.width, canvas.height);
    }
};

// ============================================================
// 6. 暂停逻辑（P4: 键盘 ESC + 触屏 pause action 统一处理）
// ============================================================
// 保留键盘 ESC 直接监听（因为 GameLoop 暂停后不再 update InputManager）
window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        // AudioManager BGM 暂停联动
        const audioMgr = AudioManager.getInstance();
        const bgm = audioMgr ? audioMgr.bgmController : null;

        if (gameLoop.isPaused) {
            gameLoop.resume();
            if (bgm) bgm.resume();
        } else {
            gameLoop.pause();
            if (bgm) bgm.pause();
        }
    }
});
// 触屏暂停按钮在 GameLoop update 中通过 action 检测：
// 由于暂停后 GameLoop 不 update，需要额外监听 touch 事件处理恢复
// 这里通过在 GameLoop 的 update 中加入 pause action 检测来实现

// ============================================================
// 7. 启动！
// ============================================================
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// P6: 初始化音频系统 + P3: 加载选角场景，完成后启动游戏循环
(async () => {
    // 初始化 AudioManager 单例：加载 sounds.json，注册 SFX/BGM bank
    const audioManager = AudioManager.getInstance();
    await audioManager.init();

    // BGMController 延迟到首次用户交互再初始化（避免 AudioContext autoplay 限制）
    // _ensureContext() 会在用户首次 playSFX / resume() 时懒初始化
    audioManager._deferredBGMInit = () => {
        if (audioManager.bgmController) return; // 已初始化
        const backend = audioManager.backend;
        const audioCtx = backend.context;       // 此时已在用户手势中
        const bgmGain = backend.bgmGain;
        audioManager.bgmController = new BGMController(audioCtx, bgmGain);
        audioManager.applyPendingVolumes();
        console.log('[Game] 🔊 BGMController deferred init complete');
    };

    // 将 audioManager 挂到 systems 方便场景访问
    systems.audioManager = audioManager;

    console.log('[Game] 🔊 AudioManager initialized, BGMController wired');

    // P5: 初始化 NetworkManager 单例
    const networkManager = NetworkManager.getInstance();
    networkManager.setEventSystem(eventSystem);
    systems.networkManager = networkManager;

    console.log('[Game] 🌐 NetworkManager initialized');

    await sceneManager.loadScene('character-select');
    gameLoop.start();
    console.log('[Game] 🎮 俯视角自动射击生存游戏 — Phase 5 Multiplayer Co-op');
    console.log('[Game] 选择角色 → WASD 移动 | ESC 暂停 | 空格键主动技能 | 升级选择技能');
})();
