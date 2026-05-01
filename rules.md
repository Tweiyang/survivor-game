
# 🎮 俯视角自动射击生存游戏 — 开发规范 (Rules)

> 本文件是项目的核心约定规范，供开发者和 AI 辅助工具共同遵守。

---

## 1. 项目概述

- **游戏类型**：俯视角（Top-Down）自动射击生存游戏
- **操作模式**：玩家控制角色移动，角色自动锁定并攻击最近敌人（吸血鬼幸存者式）
- **关卡模式**：固定关卡制，每关有明确怪物波次配置和 Boss，击败 Boss 进入下一关
- **目标平台**：PC（键盘）+ 移动端（触屏）
- **联机模式**：支持多人联机（P5），首选 Colyseus 服务器方案，通过 NetworkManager 抽象层隔离

---

## 2. 技术架构规范

### 2.1 双轨开发策略（JS 原型 → Unity 正式版）

本项目最终目标是 **Unity + C#**，当前阶段因设备限制使用 **JavaScript + Canvas 2D** 实现原型。所有代码设计必须遵循以下原则：

| 原则 | 说明 |
|------|------|
| **组件化架构** | 模拟 Unity 的 GameObject + Component 模式，每个功能作为 Component 挂载到 Entity 上 |
| **生命周期对齐** | 组件必须实现 `start()` / `update(deltaTime)` / `onDestroy()` 生命周期，对应 Unity 的 `Start()` / `Update()` / `OnDestroy()` |
| **数据驱动** | 所有配置数据使用 JSON 文件，模拟 Unity 的 ScriptableObject，方便后续迁移为 `.asset` 文件 |
| **接口预留** | 关键系统提供 Unity API 等价的接口注释，如 `/* Unity: GetComponent<T>() */` |
| **命名规范** | 类名使用 PascalCase，方法名使用 camelCase（JS 阶段），注释标注对应的 Unity C# PascalCase 方法名 |

### 2.2 Unity 概念映射表

```
Unity C#                    →    JS 等价实现
────────────────────────────────────────────────────
MonoBehaviour               →    Component 基类
GameObject                  →    Entity 类
Transform                   →    TransformComponent
Prefab                      →    EntityFactory + JSON 模板
ScriptableObject            →    JSON 配置文件
SpriteRenderer              →    SpriteRendererComponent (Canvas 2D)
Tilemap                     →    TilemapRenderer (Canvas 2D 瓦片)
Physics2D.OverlapCircle     →    CollisionSystem.overlapCircle()
Rigidbody2D                 →    RigidbodyComponent (简易物理)
Collider2D                  →    ColliderComponent (AABB / Circle)
SceneManager.LoadScene      →    SceneManager.loadScene()
Input.GetAxis               →    InputManager.getAxis()
UnityEvent                  →    EventEmitter 事件系统
Coroutine                   →    async/await 或 Timer 系统
AudioSource                 →    AudioManager (已实现，Web Audio API 合成音效)
AudioClip                   →    SoundBank (sounds.json 数据驱动配置)
AudioMixer                  →    三级 GainNode (master → sfx/bgm)
```

### 2.3 项目结构

```
project/
├── index.html                    # 入口页面
├── rules.md                      # 本规范文件
├── assets/
│   ├── sprites/                  # 像素画精灵素材
│   └── data/                     # 配置数据 (模拟 ScriptableObject)
│       ├── player.json           # 玩家基础属性配置
│       ├── monsters.json         # 怪物配置表
│       ├── skills.json           # 技能配置表
│       ├── skill-combos.json     # 技能组合配置表
│       ├── levels.json           # 关卡配置表
│       ├── formulas.json         # 战斗公式参数
│       └── sounds.json           # 音效/BGM 配置表（模拟 AudioClip 库）
├── src/
│   ├── core/                     # 引擎核心层
│   │   ├── GameLoop.js           # 游戏主循环 (requestAnimationFrame)
│   │   ├── Entity.js             # GameObject 等价
│   │   ├── Component.js          # MonoBehaviour 等价基类
│   │   ├── Scene.js              # 场景/关卡管理
│   │   ├── EntityManager.js      # 实体管理器 (查找/销毁)
│   │   └── EventSystem.js        # 全局事件系统
│   ├── components/               # 可复用组件
│   │   ├── TransformComponent.js
│   │   ├── SpriteRenderer.js     # Canvas 2D 精灵渲染
│   │   ├── ColliderComponent.js  # 碰撞体
│   │   ├── RigidbodyComponent.js # 简易物理
│   │   ├── HealthComponent.js    # 生命值
│   │   ├── CombatComponent.js    # 战斗属性
│   │   └── DropComponent.js      # 掉落物
│   ├── systems/                  # 全局系统
│   │   ├── RenderSystem.js       # 渲染管线
│   │   ├── PhysicsSystem.js      # 碰撞检测
│   │   ├── InputManager.js       # 输入管理 (键盘 + 触屏)
│   │   ├── CombatSystem.js       # 战斗计算
│   │   ├── SkillSystem.js        # 技能管理
│   │   ├── LevelManager.js       # 关卡/波次管理
│   │   ├── ExperienceSystem.js   # 经验/升级
│   │   ├── CameraSystem.js       # 摄像机跟随
│   │   ├── AudioManager.js       # 音频管理器（Backend 抽象）
│   │   ├── WebAudioBackend.js    # Web Audio API 后端实现
│   │   ├── BGMController.js      # BGM 序列器（程序化音乐）
│   │   ├── NetworkManager.js     # Colyseus 客户端连接管理 (P5)
│   │   ├── PredictionSystem.js   # 客户端预测 + 服务端校正 (P5)
│   │   ├── InterpolationSystem.js # 远程实体插值平滑 (P5)
│   │   └── StateSynchronizer.js  # Schema → EntityManager 同步 (P5)
│   ├── entities/                 # 预制体工厂
│   │   ├── PlayerFactory.js
│   │   ├── MonsterFactory.js
│   │   ├── ProjectileFactory.js
│   │   └── DropItemFactory.js
│   ├── ai/                       # 怪物 AI
│   │   ├── MonsterAI.js          # AI 基类
│   │   ├── ChaseAI.js            # 追踪型
│   │   ├── PatrolAI.js           # 巡逻型
│   │   └── BossAI.js             # Boss 专用 AI
│   ├── map/                      # 地图系统
│   │   ├── TilemapData.js        # 瓦片数据
│   │   ├── TilemapRenderer.js    # 瓦片渲染
│   │   └── Pathfinding.js        # 寻路算法
│   └── ui/                       # UI 层
│       ├── HUD.js                # 血条/经验条/技能图标
│       ├── SkillSelectUI.js      # 升级技能三选一弹窗
│       ├── GameOverUI.js         # 死亡/通关界面
│       ├── KeyBindingUI.js       # 键位自定义界面
│       └── VirtualJoystick.js    # 移动端虚拟摇杆
└── openspec/                     # OpenSpec 设计文档
```

### 2.4 技术选型

| 类别 | 选择 | 说明 |
|------|------|------|
| 渲染 | Canvas 2D API | 最接近 Unity SpriteRenderer 的思维模型 |
| 模块化 | ES Modules (import/export) | 每个类一个文件，原生浏览器支持 |
| 美术 | 简笔画像素风 | Canvas 绘制 + 可选 PNG 精灵图 |
| 物理 | 自实现 AABB + Circle 碰撞 | 不引入第三方库，方便 Unity 迁移 |
| 寻路 | 简易 A* 算法 | 基于瓦片网格 |
| 音效 | Web Audio API + OscillatorNode 合成 | ✅ 已实现 |

### 2.5 HTML 试验方案运行须知（仅限 JS 原型阶段）

> ⚠️ **以下经验仅适用于 JS + Canvas 2D 的 HTML 试验方案，迁移到 Unity 后不再适用。**

#### 2.5.1 ES Module 需要 HTTP 服务器

浏览器安全策略禁止 `file://` 协议加载 ES Module（`<script type="module">`）。**直接双击 `index.html` 无法运行游戏**，必须通过 HTTP 服务器访问：

```bash
# 方案 A：Python 内置服务器（推荐，无需安装额外依赖）
python -m http.server 8080

# 方案 B：Node.js npx serve
npx serve -l 3000

# 方案 C：VS Code Live Server 插件
# 安装后右键 index.html → "Open with Live Server"
```

项目根目录提供了 `start-game.bat` 一键启动脚本。

#### 2.5.2 浏览器原生 ES Module 不支持 import JSON

```javascript
// ❌ 错误：浏览器原生不支持（需要 Webpack/Vite 等 bundler）
import config from './data/config.json';

// ✅ 正确：使用 fetch 动态加载
const res = await fetch('./assets/data/config.json');
const config = await res.json();
```

Import Assertions（`import config from './x.json' with { type: 'json' }`）虽是新标准但兼容性不佳，项目统一使用 `fetch`。

#### 2.5.3 async 场景初始化必须 await

`Scene.init()` 如果包含 `fetch` 等异步操作，则必须声明为 `async`，调用方（`SceneManager.loadScene`）必须 `await` 其完成。否则：
- 数据未加载完毕就开始渲染，导致空白/报错
- `fetch` 抛出的异常不会被捕获，错误静默吞没

```javascript
// SceneManager.loadScene 必须是 async 并 await init()
async loadScene(sceneName) {
    // ...
    await this._currentScene.init();  // ✅ 等待异步初始化完成
}
```

#### 2.5.4 私有属性访问需提供 getter

浏览器环境下 `_currentScene` 是约定私有，外部通过属性名直接访问可行但不规范。应提供 getter：

```javascript
get currentScene() { return this._currentScene; }
```

#### 2.5.5 禁止在 JSDoc 块内嵌套块注释

JavaScript 中 `/** ... */` 和 `/* ... */` 使用相同的结束标记 `*/`。在 JSDoc 注释块内部嵌套 `/* ... */` 会导致注释提前关闭，后续代码变成语法错误（典型报错：`Unexpected token '*'`）。

```javascript
// ❌ 错误：嵌套的 */ 会提前关闭 JSDoc 块，导致语法错误
/**
 * MyClass — 某某模块
 * /* Network: 需要服务器验证 */
 */
export class MyClass { }

// ✅ 正确：使用 [方括号] 或 @tag 替代块注释
/**
 * MyClass — 某某模块
 * [Network] 需要服务器验证
 */
export class MyClass { }

// ✅ 正确：将联网注释放在 JSDoc 外部用单行注释
// Network: 需要服务器验证
export class MyClass { }
```

> **注意**：此规则同样适用于 Unity C# 的 XML 文档注释。虽然 C# 的 `/// <summary>` 不存在完全相同的问题，但嵌套 `/* */` 在 C# 中同样会造成语法错误。因此建议 **统一使用 `[Network]` 方括号标注格式**，JS 和 C# 通用。

---

## 3. 游戏设计规范

### 3.1 核心游戏循环

```
进入关卡 → 生成地图和玩家 → 按波次刷怪 → 玩家移动+自动攻击
    ↑                                              │
    │         ┌─ 杀怪获得经验 ←─────────────────────┘
    │         │        │
    │         │    经验满升级
    │         │        │
    │         │    技能三选一弹窗 (暂停战斗)
    │         │        │
    │         └─ 继续战斗 ←── 选择技能
    │                  │
    │          精英/Boss掉落技能 (地面拾取)
    │                  │
    │          击败关底Boss
    │                  │
    └──── 通关结算 → 进入下一关
```

### 3.2 战斗公式

```javascript
// 基础伤害计算
baseDamage = attackPower × skillMultiplier

// 暴击判定
isCrit = random() < critRate
finalDamage = isCrit ? baseDamage × critMultiplier : baseDamage

// 防御减伤
actualDamage = max(1, finalDamage - defense × defenseRatio)

// 配置参数 (formulas.json)
{
    "defenseRatio": 0.5,        // 防御减伤系数
    "baseCritMultiplier": 1.5,  // 基础暴击倍率
    "levelScaling": 1.1         // 每级属性成长系数
}
```

### 3.3 技能系统规则

1. **技能分类**：
   - **被动属性技能**：攻速+、暴击+、移速+、血量+ 等纯属性提升
   - **武器技能**：自动化枪械（机关枪、散弹枪、喷火枪等），角色自动开火
   - **主动技能**：角色绑定，按键释放（P3 随多角色一起实现）
2. **获取途径**：升级三选一弹窗（被动 + 武器）/ 主动技能跟角色绑定不掉落
3. **等级叠加**：重复获得相同技能时，技能等级 +1，效果按配置增强
4. **武器上限**：最多同时携带 4 把武器，满载后新武器不出现在选择池中
5. **被动上限**：被动技能无数量上限，单个被动最高 5 级
6. **掉落权重**：每个技能在 `skills.json` 中配置 `selectWeight`（三选一权重）
7. **武器实现**：混合架构——基础枪械用 ProjectileFactory 投射物模型，特殊武器（喷火/激光等）用策略模式自定义 fire() 实现
8. **属性加成**：被动通过 `SkillComponent.getStatModifier()` 汇总，不直接修改 base 值，各组件在计算时实时查询加成

### 3.4 多角色系统规则

1. **数据驱动**：角色数据存放在 `characters.json`（Unity 迁移为 `CharacterScriptableObject`）
2. **角色差异**：不同角色有不同基础属性、初始武器、外观、绑定主动技能
3. **工厂模式**：`PlayerFactory` 按 `characterId` 加载对应配置，不硬编码角色逻辑
4. **主动技能绑定**：通过策略模式 `ActiveSkill` 绑定，角色类型决定技能实例
5. **选角界面**：独立场景 `CharacterSelectScene`，选角结果传递给 `BattleScene`
6. **角色数量**：≥ 3 个可选角色（P3 实现）
7. **世界观**：未来科幻背景，角色以枪械输出为主
8. /* Network: 选角信息随 join 事件发送，其他玩家需看到正确的角色外观 */

### 3.5 怪物设计规则

| 类型 | 特征 | 掉落 |
|------|------|------|
| **普通怪** | 低血量，简单追踪 AI | 经验值 |
| **精英怪** | 高血量，特殊行为模式 | 经验 + 概率掉落技能 |
| **Boss** | 多阶段 AI，独特攻击模式 | 经验 + 必定掉落技能 + 通关钥匙 |

### 3.5 关卡地图规范

**地图形式**：线性主路 + 可选岔路小房间（JSON 手工配置）

**房间类型**：
| 类型 | 说明 |
|------|------|
| `start` | 起点房间，含 `playerSpawn` 玩家出生点 |
| `corridor` | 走廊（连接房间） |
| `normal` | 普通战斗房间 |
| `side` | 岔路小房间（可选探索，不影响通关） |
| `boss` | Boss 房间，含 `gate`（门）配置 |

**刷怪机制**：
- 怪物在关卡加载时预先放置在固定位置（自由探索模式，非波次）
- 每个房间的 `spawns` 数组定义刷怪点：`{ gridX, gridY, monsterType, isBoss }`
- 怪物不会重生

**Boss 门机制**：
- Boss 房间入口初始为墙壁（不可通行）
- 当击杀数 ≥ `killsToOpenBoss` 时门自动打开（瓦片动态替换为地面）
- HUD 实时显示击杀进度和门状态

**通关流程**：
```
关卡加载 → 构建地图 + 放置所有怪物 + Boss 门关闭
  ↓
玩家自由探索击杀
  ↓
击杀数 ≥ killsToOpenBoss → Boss 门打开 → HUD 提示
  ↓
进入 Boss 房间 → 击败 Boss
  ↓
触发通关事件 → 显示通关 UI → 下一关 / 返回选角
```

### 3.6 关卡配置结构

```jsonc
// levels.json 关卡配置（房间拼接制）
{
    "levels": [
        {
            "id": "level_1",
            "name": "幽暗走廊",
            "killsToOpenBoss": 5,
            "rooms": [
                {
                    "id": "start",
                    "type": "start",
                    "offsetX": 0, "offsetY": 0,
                    "width": 10, "height": 10,
                    "playerSpawn": { "gridX": 5, "gridY": 5 },
                    "spawns": [
                        { "gridX": 8, "gridY": 2, "monsterType": "slime" }
                    ],
                    "groundData": [/* ... width×height 个瓦片ID */],
                    "wallData": [/* ... -1 表示无墙壁 */]
                },
                {
                    "id": "boss_room",
                    "type": "boss",
                    "offsetX": 16, "offsetY": 0,
                    "width": 12, "height": 10,
                    "gate": { "gridX": 0, "gridY": 4, "width": 1, "height": 2 },
                    "spawns": [
                        { "gridX": 8, "gridY": 5, "monsterType": "boss_slime", "isBoss": true }
                    ],
                    "groundData": [/* ... */],
                    "wallData": [/* ... */]
                }
            ]
        }
    ]
}
```

**瓦片 ID 映射**：
| ID | 名称 | 可行走 | 颜色 |
|----|------|--------|------|
| 0 | grass | ✅ | #4a7c59 |
| 1 | dark_grass | ✅ | #3d6b4e |
| 2 | dirt | ✅ | #8B7355 |
| 3 | wall | ❌ | #696969 |
| 4 | stone | ❌ | #505050 |

### 3.7 音频系统规范（P6）

#### 3.7.1 架构概览

```
游戏逻辑层 (BattleScene, CombatSystem, etc.)
       │ 调用 AudioManager.playSFX / playBGM
       ▼
AudioManager 抽象层 (Backend 策略接口)
       │ 可替换后端
       ▼
WebAudioBackend (当前)  /  UnityAudioBackend (未来)
```

- **AudioManager**：全局单例，管理 SFX/BGM 音量、音效 SoundBank 和后端切换
- **WebAudioBackend**：使用 `OscillatorNode` + `GainNode` 合成 8-bit 风格音效
- **BGMController**：基于音符序列的程序化背景音乐播放器，支持循环和交叉淡入淡出

#### 3.7.2 音量控制（三级 GainNode）

```
AudioContext
  └─ masterGain (总音量)
       ├── sfxGain (音效音量)
       └── bgmGain (背景音乐音量)
```

| 级别 | 节点 | 默认值 | 控制方式 |
|------|------|--------|---------|
| Master | `masterGain` | 0.5 | 暂停菜单滑块 |
| SFX | `sfxGain` | 0.7 | 暂停菜单滑块 |
| BGM | `bgmGain` | 0.4 | 暂停菜单滑块 |

#### 3.7.3 数据驱动配置（sounds.json）

```jsonc
{
    "sfx": {
        "shoot":    { "type": "square",   "freq": 880, "duration": 0.08, "ramp": 440 },
        "hit":      { "type": "sawtooth", "freq": 220, "duration": 0.10, "ramp": 110 },
        "kill":     { "type": "square",   "freq": 523, "duration": 0.15, "ramp": 800 },
        "levelUp":  { "type": "sine",     "freq": 523, "duration": 0.30, "ramp": 1047 }
    },
    "bgm": {
        "battle": {
            "bpm": 140,
            "wave": "square",
            "notes": ["C4","E4","G4","C5", ...]  // 循环音符序列
        }
    }
}
```

#### 3.7.4 Backend 接口约定

```javascript
// IBackend 接口 — 所有后端必须实现
init(masterGain, sfxGain, bgmGain)   // 初始化，接收 GainNode 引用
playSynth(sfxConfig)                  // 播放一次性合成音效
playBGM(bgmConfig, bgmGain)         // 启动 BGM 循环
stopBGM()                            // 停止 BGM
resume()                             // 恢复 AudioContext（应对浏览器 autoplay 策略）
```

#### 3.7.5 集成点

| 游戏事件 | 触发音效 | 调用方式 |
|---------|---------|---------|
| 玩家射击 | `shoot` | `AudioManager.playSFX('shoot')` |
| 怪物受击 | `hit` | `AudioManager.playSFX('hit')` |
| 怪物死亡 | `kill` | `AudioManager.playSFX('kill')` |
| 玩家升级 | `levelUp` | `AudioManager.playSFX('levelUp')` |
| 进入战斗场景 | `battle` BGM | `AudioManager.playBGM('battle')` |
| 暂停/恢复 | 静音/恢复 BGM | `bgmGain.gain` 置零/恢复 |

#### 3.7.6 浏览器 Autoplay 策略

现代浏览器要求用户交互后才允许播放音频。解决方案：
- 在用户首次点击（如"开始游戏"按钮）时调用 `AudioManager.resume()`
- `resume()` 内部调用 `AudioContext.resume()` 解除挂起状态

#### 3.7.7 Unity 迁移指南

```
JS 当前实现                  →    Unity 等价
─────────────────────────────────────────────
AudioManager                →    AudioManager (MonoBehaviour 单例)
WebAudioBackend             →    UnityAudioBackend (AudioSource.PlayOneShot)
sounds.json                 →    SoundBank ScriptableObject
BGMController               →    Unity AudioSource (loop=true) + AudioMixer
OscillatorNode 合成          →    预录制 AudioClip 资源
三级 GainNode               →    AudioMixer + AudioMixerGroup
```

---

## 4. 输入系统规范（P4）

### 4.1 抽象输入层

所有游戏逻辑只通过 `InputManager` 的抽象接口读取输入，不直接监听键盘/触屏事件：

```javascript
// 游戏逻辑中的调用方式（与平台无关）
const moveX = InputManager.getAxis('horizontal');  // -1 ~ 1
const moveY = InputManager.getAxis('vertical');    // -1 ~ 1

/* Unity 等价:
 * float moveX = Input.GetAxis("Horizontal");
 * float moveY = Input.GetAxis("Vertical");
 */
```

### 4.2 默认键位

| 动作 | 键盘默认 | 触屏 |
|------|----------|------|
| 向上移动 | W | 虚拟摇杆 ↑ |
| 向下移动 | S | 虚拟摇杆 ↓ |
| 向左移动 | A | 虚拟摇杆 ← |
| 向右移动 | D | 虚拟摇杆 → |
| 暂停 | ESC | 暂停按钮 |

### 4.3 键位自定义

- PC 端支持通过设置界面修改键位映射
- 键位配置存储在 `localStorage`
- 提供"恢复默认"功能

---

## 5. 编码规范

### 5.1 命名约定

| 元素 | JS 阶段 | Unity C# 对应 |
|------|---------|---------------|
| 类名 | `PascalCase` | `PascalCase` |
| 方法名 | `camelCase` | `PascalCase`（注释标注） |
| 常量 | `UPPER_SNAKE_CASE` | `PascalCase` 或 `UPPER_SNAKE_CASE` |
| 文件名 | `PascalCase.js` | `PascalCase.cs` |
| 配置文件 | `kebab-case.json` | 转为 `.asset` |

### 5.2 组件编写模板

```javascript
import { Component } from '../core/Component.js';

/**
 * 示例组件
 * Unity equivalent: public class ExampleComponent : MonoBehaviour
 */
export class ExampleComponent extends Component {
    /**
     * @param {object} config - 配置参数
     */
    constructor(config = {}) {
        super();
        this.speed = config.speed || 5;
        // Unity: [SerializeField] private float speed = 5f;
    }

    /** Unity: void Start() */
    start() {
        // 初始化逻辑
    }

    /**
     * Unity: void Update()
     * @param {number} deltaTime - 帧间隔时间（秒）
     */
    update(deltaTime) {
        // 每帧逻辑
        // Unity: transform.position → this.entity.transform.position
    }

    /** Unity: void OnDestroy() */
    onDestroy() {
        // 清理逻辑
    }
}
```

### 5.3 代码注释要求

- 每个类头部注释说明对应的 Unity 等价概念
- 关键方法标注 Unity API 对应写法
- 使用 `/* Unity: ... */` 格式标记迁移注意点

### 5.4 禁止事项

- ❌ 不使用任何第三方游戏引擎框架（Phaser, PixiJS 等）— 目的是 1:1 映射 Unity 架构
- ❌ 不使用 jQuery 或 React 等 Web 框架 — 纯 Vanilla JS
- ❌ 不在组件中直接监听 DOM 事件 — 统一通过 InputManager
- ❌ 不硬编码游戏数值 — 所有数值来自 JSON 配置
- ❌ 不使用全局变量存储游戏状态 — 通过 Entity/Component/System 管理

---

## 6. 开发阶段与优先级

| 阶段 | 优先级 | 内容 | 前置依赖 |
|------|--------|------|----------|
| Phase 0 | P0 | 引擎核心骨架（Entity/Component/GameLoop/Render/Collision/Event） | 无 |
| Phase 1 | P1 | 基础战斗（玩家/怪物/攻击/死亡/掉落/战斗公式/HUD） | Phase 0 |
| Phase 2 | P2 | 升级与技能（经验/升级弹窗/技能叠加/技能掉落/技能组合） | Phase 1 |
| Phase 3 | P3 | 多关卡战斗（关卡配置/波次系统/Boss战/寻路/通关流程） | Phase 1 + Phase 2 |
| Phase 4 | P4 | 多端输入（键盘/触屏/虚拟摇杆/键位自定义） | Phase 0（可并行） |
| Phase 5 | P5 | 联网联机（NetworkManager/Colyseus/房间/状态同步/多玩家） | Phase 1 + Phase 4 |
| Phase 6 | P6 | 音频系统（AudioManager/Web Audio 合成/BGM 序列器/音量 UI） | Phase 1（可并行） |

> **注意**：Phase 4 的 InputManager 抽象层应在 Phase 0 时就搭好骨架，Phase 4 是完善和扩展。
> **注意**：Phase 5 的 NetworkManager 抽象层应在 P1-P4 开发中持续预留联网接口，P5 是具体实现。

---

## 7. 测试与验证

- 每个 Phase 完成后，应能独立运行并演示核心功能
- Phase 0 完成：能看到瓦片地图上有一个可移动的角色方块
- Phase 1 完成：角色能自动射击并杀死怪物，怪物死亡有掉落
- Phase 2 完成：杀怪升级后弹出技能选择，技能有可见效果
- Phase 3 完成：完整的关卡体验——进入、刷怪、Boss、通关、下一关
- Phase 4 完成：手机上能用虚拟摇杆流畅操控
- Phase 5 完成：两个浏览器窗口能同时进入同一关卡，看到彼此角色并协作战斗
- Phase 6 完成：射击/受击/击杀有 8-bit 音效，战斗场景有循环 BGM，暂停菜单可调节音量

---

## 8. 联网联机规范（P5）

### 8.1 架构原则：三层抽象

```
游戏逻辑层 (CombatSystem, SkillSystem, LevelManager...)
       │ 只调用 NetworkManager 接口
       ▼
NetworkManager 抽象层 (INetworkProvider 接口)
       │ 可替换实现
       ▼
具体实现层 (LocalProvider / ColyseusProvider / UnityNGOProvider)
```

所有联机相关逻辑必须通过 `NetworkManager` 抽象层访问，游戏逻辑层禁止直接调用底层联网 API。这与 `InputManager` 的设计模式一致。

### 8.2 首选方案：Colyseus

| 要素 | 选择 | 说明 |
|------|------|------|
| 服务器框架 | Colyseus (Node.js) | 专为游戏设计，内置房间/大厅/状态同步 |
| 通信协议 | WebSocket | Colyseus 原生支持 |
| 状态同步 | Schema 增量同步 | Colyseus 自动处理序列化和增量更新 |
| JS 客户端 | colyseus.js SDK | npm 包 |
| Unity 客户端 | colyseus-unity SDK | NuGet 包，替换 Provider 即可 |
| 可替换性 | ✅ 通过 INetworkProvider | 后续可替换为 Unity NGO / Mirror / Photon |

### 8.3 NetworkManager 核心接口（预留）

```javascript
/**
 * INetworkProvider 接口定义
 * Unity equivalent: 自定义 INetworkTransport 接口
 */
// 连接管理
connect(roomId, options)      // 加入/创建房间
disconnect()                  // 离开房间
isLocal()                     // 是否单机模式（P0-P4 默认 true）
isHost()                      // 是否房主/权威端
getPlayerId()                 // 本机玩家 ID

// 状态同步
syncEntityState(entityId, state)  // 同步实体状态
onEntitySync(callback)            // 收到远端实体状态更新

// 事件通信
sendEvent(eventType, data)        // 发送游戏事件到服务器
onEvent(eventType, callback)      // 订阅服务器事件

// 玩家管理
getPlayerCount()                  // 房间内玩家数
onPlayerJoin(callback)            // 玩家加入回调
onPlayerLeave(callback)           // 玩家离开回调
```

### 8.4 P0-P4 联网预留规则

在 P0-P4 阶段开发时，以下模块必须考虑联网预留：

| 模块 | 预留要求 | 标注方式 |
|------|---------|---------|
| **Entity** | 预留 `networkId` 和 `ownerId` 属性 | `/* Network: 联机时由服务器分配 */` |
| **PlayerFactory** | 支持通过回调创建"其他玩家"实体，不硬编码单个玩家 | `/* Network: 服务器通知创建远程玩家 */` |
| **CombatSystem** | 伤害计算标注权威端 | `/* Network: 伤害应由 Host/服务器计算 */` |
| **SkillSystem** | 技能选择通过事件发送 | `/* Network: 选择结果需广播给其他客户端 */` |
| **LevelManager** | 波次/怪物生成由 Host 控制 | `/* Network: Host 决定生成，Client 接收 */` |
| **ExperienceSystem** | 经验/升级判定标注权威端 | `/* Network: 服务器权威计算 */` |

### 8.5 联网注释规范

在 P0-P4 代码中，用以下格式标注联网预留点（使用方括号标注，兼容 JSDoc/XML 注释块，JS 和 C# 通用）：

```javascript
// 单行标注（推荐 — 放在 JSDoc 内或代码行上方均可）
// [Network] 此方法在联机模式下应由服务器权威调用

// 在 JSDoc 内使用
/**
 * 伤害计算
 * [Network] 伤害应由 Host/服务器计算
 */

// 多行标注
// [Network-TODO]
// 联机时需要：
// 1. Host 端计算伤害并广播结果
// 2. Client 端只播放表现，不做逻辑判定
// 3. 通过 NetworkManager.sendEvent('damage', {...}) 同步
```

> ⚠️ **禁止使用 `/* Network: ... */` 格式**，因为它在 JSDoc 块内会导致注释提前关闭（见 2.5.5）。

### 8.6 跨配置文件 ID 一致性

多个 JSON 配置文件间通过 `id` 互相引用时，**引用方的 ID 值必须与被引用方的 key/id 完全一致**。否则运行时查找失败，无报错仅返回 `false`/`undefined`，功能静默失效。

```
// ❌ characters.json 用了"美名"，skills.json 里实际叫另一个 ID
"initialWeapon": "energy_pistol"     // characters.json
"pistol": { "id": "pistol", ... }    // skills.json → 查找失败！

// ✅ 引用 ID 必须与 skills.json 中的 key 完全一致
"initialWeapon": "pistol"            // characters.json → 匹配 skills.json 的 key
```

**规则**：新增配置文件引用其他配置文件的 ID 时，必须先确认目标文件中实际存在的 key 值。此规则同样适用于 Unity ScriptableObject 之间的 ID 引用字段。

### 8.7 事件数据结构一致性

`EventSystem.emit()` 的 data 参数和对应 `on()` 回调中的解构方式 **必须保持一致**。否则接收方拿到 `undefined`，条件判断失效，导致逻辑错误（如全部实体死亡都触发 GameOver）。

```javascript
// ❌ 不一致 — emit 直接传 entity，回调却解构 data.entity
eventSystem.emit('onDeath', this.entity);       // data = entity
_onDeath(data) {
    if (data.entity.tag !== 'player') return;    // data.entity = undefined → 判断失效
}

// ✅ 方案 A — emit 包装为对象（推荐，便于扩展）
eventSystem.emit('onDeath', { entity: this.entity, cause: 'combat' });
_onDeath(data) {
    if (data.entity.tag !== 'player') return;    // ✅ 正确
}

// ✅ 方案 B — 回调做兼容处理
_onDeath(data) {
    const entity = data.entity || data;          // 兼容两种格式
    if (entity.tag !== 'player') return;
}
```

**建议**：所有事件数据统一使用 **对象包装格式** `{ entity, ... }`，便于未来扩展字段。此规则 JS/C# 通用。

### 8.8 同步模型选择

| 同步方式 | 适用内容 | 说明 |
|---------|---------|------|
| **状态同步** | 玩家位置/血量/技能状态 | Colyseus Schema 自动增量同步 |
| **事件同步** | 伤害/技能释放/物品拾取 | sendEvent 发送，所有客户端处理 |
| **权威计算** | 伤害数值/经验/掉落 | 仅 Host/Server 计算，结果广播 |
| **客户端预测** | 本地玩家移动 | 先预测后修正，减少延迟感 |

### 8.9 服务端实现详情（已实现）

#### 8.9.1 服务端目录

服务端代码位于 `server/` 目录，使用 TypeScript + Colyseus 框架。详见 `server/README.md`。

```
server/src/
├── index.ts                   # Express + Colyseus 启动入口 (端口 2567)
├── rooms/BattleRoom.ts        # 战斗房间（20Hz 游戏循环）
├── schema/                    # Colyseus Schema 定义
│   ├── BattleState.ts         # 房间顶层状态 (MapSchema<PlayerState>, etc.)
│   ├── PlayerState.ts         # x, y, hp, maxHp, level, characterId, lastSeq
│   ├── MonsterState.ts        # x, y, hp, maxHp, monsterType
│   ├── ProjectileState.ts     # x, y, vx, vy, damage, ownerId
│   ├── DropState.ts           # x, y, dropType, value
│   └── LevelState.ts          # currentLevel, waveIndex, bossOpen
└── systems/                   # 服务端子系统
    ├── ServerPhysics.ts       # 墙壁碰撞 (AABB)
    ├── ServerSpawner.ts       # 波次怪物生成
    ├── ServerAI.ts            # 怪物追击 AI (追最近玩家)
    ├── ServerCombat.ts        # 投射物 + 伤害 + 经验 + 升级
    └── DifficultyScaler.ts    # 多人难度缩放
```

#### 8.9.2 Schema 状态定义

| Schema | 关键字段 | 同步方式 |
|--------|---------|---------|
| `BattleState` | `players: MapSchema<PlayerState>`, `monsters: MapSchema<MonsterState>`, `projectiles: MapSchema<ProjectileState>`, `drops: MapSchema<DropState>`, `level: LevelState`, `gamePhase`, `countdown` | 自动增量 |
| `PlayerState` | `x, y, hp, maxHp, level, characterId, speed, lastSeq` | 自动增量 |
| `MonsterState` | `x, y, hp, maxHp, monsterType, speed` | 自动增量 |
| `ProjectileState` | `x, y, vx, vy, damage, ownerId` | 自动增量 |
| `DropState` | `x, y, dropType, value` | 自动增量 |
| `LevelState` | `currentLevel, waveIndex, bossOpen` | 自动增量 |

#### 8.9.3 消息协议

**客户端 → 服务端**：

| 类型 | 数据 | 说明 |
|------|------|------|
| `input` | `{ seq, dx, dy, dt }` | 带序号的移动输入（用于服务端回放 + 客户端预测校验） |
| `ready` | `{}` | 玩家准备就绪 |
| `selectChar` | `{ characterId }` | 选择角色 |
| `skillChoice` | `{ skillId }` | 升级选技能 |
| `useSkill` | `{}` | 释放主动技能 |
| `ping` | `{}` | RTT 测量 |

**服务端 → 客户端**：

| 类型 | 数据 | 说明 |
|------|------|------|
| `damageEvent` | `{ targetId, targetType, damage, isCrit, killerId, killed }` | 伤害瞬时事件（不持久化到 Schema） |
| `sfxEvent` | `{ soundId, x, y }` | 音效触发 |
| `levelUp` | `{ playerId, newLevel, skillOptions }` | 升级通知 |
| `notification` | `{ text, type }` | 系统提示 |
| `pong` | `{}` | RTT 响应 |

### 8.10 客户端联网子系统（已实现）

#### 8.10.1 NetworkManager (`src/systems/NetworkManager.js`)

全局单例，管理 Colyseus 客户端 SDK 连接生命周期。

```javascript
// 核心 API
NetworkManager.getInstance()          // 获取单例
networkManager.connect(url)           // 连接 Colyseus 服务器
networkManager.createRoom(roomName, options) // 创建房间
networkManager.joinRoom(roomId, options)     // 加入房间
networkManager.leaveRoom()            // 离开房间
networkManager.send(type, data)       // 发消息到服务端
networkManager.isOnline               // 是否在线模式 (getter)
networkManager.room                   // 当前 Room 实例 (getter)
networkManager.sessionId              // 本地 sessionId (getter)
```

**模式切换**：
- `isOnline === false`（默认）：所有逻辑本地运行，BattleScene 使用本地 Spawner/Combat
- `isOnline === true`：BattleScene 切换为网络模式，怪物/掉落由服务端控制

#### 8.10.2 PredictionSystem (`src/systems/PredictionSystem.js`)

客户端预测 + 服务端校正系统：

- **输入缓冲区**: 128 帧循环缓冲，每帧记录 `{ seq, dx, dy, dt }`
- **预测执行**: 本地立即执行移动，不等服务端确认
- **校正流程**: 收到服务端确认 `(confirmedSeq, confirmedX, confirmedY)` 后，对比本地预测位置。若偏差 > 1px，从确认点重放之后所有未确认输入
- **渲染平滑**: 校正不直接跳变，而是计算 `renderOffset` 并以指数衰减收敛，消除肉眼可见的跳动

```javascript
// 每帧调用
predictionSystem.processInput(dx, dy, dt)       // 记录并本地执行
predictionSystem.reconcile(seq, serverX, serverY) // 服务端确认时调用
predictionSystem.getRenderOffset()               // 获取平滑偏移量
```

#### 8.10.3 InterpolationSystem (`src/systems/InterpolationSystem.js`)

远程实体平滑系统：

- **渲染延迟**: 100ms（可配置）
- **缓冲区**: 每个远程实体维护一个时间戳快照队列
- **插值算法**: 在两个快照之间线性插值，渲染时间 = `now - RENDER_DELAY`
- **外推保护**: 若快照过旧（> 500ms），使用最后一个快照位置

```javascript
interpolation.pushSnapshot(entityId, x, y)   // 收到服务端状态更新时推入
interpolation.getInterpolatedPosition(entityId) // 渲染时获取平滑位置
interpolation.removeEntity(entityId)          // 实体离开时清理
```

#### 8.10.4 StateSynchronizer (`src/systems/StateSynchronizer.js`)

服务端 Schema → 本地 EntityManager 映射器：

- **players.onAdd / onRemove**: 创建/销毁远程玩家 Entity
- **monsters.onAdd / onRemove**: 创建/销毁怪物 Entity
- **drops.onAdd / onRemove**: 创建/销毁掉落物 Entity
- **damageEvent 消息**: 播放伤害飘字 + 音效
- **sfxEvent 消息**: 播放位置音效
- **本地玩家**: 通过 `sessionId` 识别，不创建重复 Entity

### 8.11 BattleScene 联网模式分支

`BattleScene.init()` 根据 `sceneData.isOnline` 切换行为：

| 功能 | 离线模式 | 在线模式 |
|------|---------|---------|
| 怪物生成 | 本地 LevelManager 波次生成 | 服务端 ServerSpawner，通过 StateSynchronizer 同步 |
| 玩家移动 | 直接修改 Transform | PredictionSystem 本地预测 + 服务端校正 |
| 战斗计算 | 本地 CombatSystem | 服务端 ServerCombat，客户端仅播放表现 |
| 远程玩家 | 无 | InterpolationSystem 插值渲染 |
| 怪物位置 | 本地 AI 驱动 | InterpolationSystem 插值渲染 |
| 掉落物 | 本地生成 | 服务端生成，StateSynchronizer 同步 |

### 8.12 HUD 联网扩展

在线模式下 HUD 新增两个区域：

- **右上角 — 队友面板**: 显示所有远程玩家的名称、血条、等级
- **右下角 — 网络状态**: 显示连接状态（Connected/Disconnected）和实时 Ping 值

### 8.13 大厅与房间流程

```
CharacterSelectScene → LobbyScene → BattleScene (online)
                     ↘ BattleScene (offline / 直接单机)
```

**LobbyScene** 提供：
- 创建房间（携带角色 ID 创建 BattleRoom）
- 获取可用房间列表
- 加入已有房间
- 单人游戏入口（跳过联网）

### 8.14 多人难度缩放

```
HP_multiplier = 1.0 + (playerCount - 1) × 0.5
Spawn_multiplier = 同上

1 人 = 1.0x | 2 人 = 1.5x | 3 人 = 2.0x | 4 人 = 2.5x
```

### 8.15 Unity 迁移指南（P5）

```
JS 当前实现                          →    Unity 等价
────────────────────────────────────────────────────────
NetworkManager (Colyseus JS SDK)    →    NetworkManager (Colyseus Unity SDK / NGO)
PredictionSystem                    →    ClientNetworkTransform + 自定义预测
InterpolationSystem                 →    NetworkTransform (interpolation)
StateSynchronizer                   →    NetworkObject.OnNetworkSpawn callbacks
BattleRoom (Node.js Colyseus)       →    保留 Colyseus 服务端 / 迁移为 Unity NGO Host
Schema 定义 (TypeScript)            →    ColyseusSchema C# codegen / NetworkVariable
LobbyScene                         →    Unity Lobby + Relay Service
damageEvent/sfxEvent 消息            →    ClientRpc / ServerRpc
```

---

## 9. 部署规范（P7）

### 9.1 部署架构

```
前端（静态托管）                    后端（游戏服务器 / 可选）
┌──────────────────────┐          ┌──────────────────────┐
│ GitHub Pages         │          │ Render Web Service   │
│ *.github.io          │──WSS───▶│ Colyseus Server      │
│ HTML + ES Module     │          │ Node.js + TypeScript │
│ 无需构建工具          │          │ /health 健康检查     │
└──────────────────────┘          └──────────────────────┘
```

- **前端**：GitHub Pages，`git push` 即部署，零构建步骤
- **后端**：Render 免费 Web Service，支持 WebSocket，从 GitHub 自动部署
- **单人模式**不依赖后端，前端可独立运行
- **多人模式**需后端可用，不可用时优雅降级

### 9.2 环境自适应

服务器地址由 `NetworkManager._resolveServerUrl()` 自动判断：

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1（最高） | `<meta name="game-server">` | HTML 中的 meta 标签，部署时配置 |
| 2 | `window.location.hostname` | `localhost`/`127.0.0.1` → `ws://localhost:2567` |
| 3（回退） | 当前域名 + `:2567` | 生产环境默认（需 meta 标签覆盖才正确） |

**Unity 映射**：等价于 Unity 的 `ScriptableObject` 配置 + `BuildSettings` 环境区分。

### 9.3 配置约定

```html
<!-- index.html — 部署时将 YOUR_SERVER 替换为实际 Render 地址 -->
<meta name="game-server" content="wss://your-service.onrender.com">
```

- 本地开发不需要修改 meta 标签（自动检测 localhost）
- 生产部署时**必须**将 `YOUR_SERVER` 替换为实际 Render 服务地址
- 仅需部署前端即可获得完整单人体验

### 9.4 连接失败降级策略

| 场景 | 行为 |
|------|------|
| 后端正常 | 单人 + 多人均可用 |
| 后端休眠（Render 冷启动） | 显示"⏳ 连接中..."，30秒后可用 |
| 后端不可用 | 显示"⚠ 服务器不可用"，单人模式仍正常 |
| meta 标签未配置 | 控制台 warn，多人不可用，单人正常 |

### 9.5 部署文件

| 文件 | 用途 |
|------|------|
| `DEPLOY.md` | 完整部署教程（前端 + 后端 + 连接配置） |
| `server/render.yaml` | Render Blueprint 配置（构建/启动/健康检查） |
| `index.html` meta 标签 | 生产服务器地址配置点 |

---

---

## 10. Unity 移植规范（Phase U）

### 10.1 总体原则

- Unity 代码全部生成在 `Unity/` 文件夹下，不影响现有 Web 版
- 服务端代码（`server/`）完全不动，Unity 客户端复用 Colyseus Node.js 后端
- 使用 Unity 2022 LTS，C# 10
- 联网方案：**colyseus-unity SDK**（NuGet: `com.colyseus.sdk`）

### 10.2 架构映射

| Web JS | Unity C# |
|--------|----------|
| Entity + Component | GameObject + MonoBehaviour |
| JSON 配置 | ScriptableObject |
| EntityFactory | Prefab + Factory 脚本 |
| EventSystem | C# `event Action<T>` + EventBus 单例 |
| SceneManager | `UnityEngine.SceneManagement` |
| Canvas 2D | SpriteRenderer + Tilemap |
| PhysicsSystem | Unity Physics2D |
| InputManager | Unity Input System (New) |
| AudioManager | AudioSource + AudioMixer |
| Colyseus JS SDK | colyseus-unity C# SDK |

### 10.3 命名规范（C#）

| 元素 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `PlayerController` |
| 方法名 | PascalCase | `TakeDamage()` |
| 私有字段 | _camelCase | `_currentHp` |
| 序列化字段 | `[SerializeField]` + _camelCase | `[SerializeField] float _moveSpeed` |
| 常量 | PascalCase | `MaxHealth` |
| 接口 | I前缀 | `IDamageable` |

### 10.4 文件夹结构

所有 Unity 代码位于 `Unity/Assets/` 下，详见 Phase 1 生成。

*最后更新：2026-04-03（Section 10 Unity 移植规范）*
