## ADDED Requirements

### Requirement: Scene class defines level structure
系统 SHALL 提供 `Scene` 基类，定义关卡/场景的结构（Unity: `Scene` + 场景脚本）。
Scene SHALL 包含：
- `name` — 场景名称
- `init()` — 场景初始化，创建实体和设置地图（Unity: `Awake` / `Start` 阶段）
- `update(deltaTime)` — 场景级逻辑更新（如波次控制、胜负判定）
- `destroy()` — 场景销毁，清理所有实体
- 持有对 `EntityManager`、`PhysicsSystem` 等系统的引用

#### Scenario: Scene initialization
- **WHEN** SceneManager 加载一个 Scene
- **THEN** Scene 的 `init()` 被调用，场景中的实体和地图被创建

#### Scenario: Scene cleanup on switch
- **WHEN** 从 Scene A 切换到 Scene B
- **THEN** Scene A 的 `destroy()` 被调用，所有属于 A 的实体被销毁，然后 Scene B 的 `init()` 被调用

### Requirement: SceneManager handles scene transitions
系统 SHALL 提供 `SceneManager` 单例，管理场景的加载和切换（Unity: `SceneManager`）。
SceneManager SHALL 支持：
- `register(sceneName, SceneClass)` — 注册场景类
- `loadScene(sceneName)` — 加载指定场景（Unity: `SceneManager.LoadScene()`）
- `getCurrentScene()` — 获取当前活跃场景
- `restart()` — 重新加载当前场景

SceneManager 在切换场景时 SHALL：
1. 调用当前场景的 `destroy()`
2. 清空 EntityManager 中的所有实体
3. 创建新场景实例并调用 `init()`

#### Scenario: Load scene by name
- **WHEN** 调用 `SceneManager.loadScene('level1')`
- **THEN** level1 场景被初始化并开始运行

#### Scenario: Restart current scene
- **WHEN** 调用 `SceneManager.restart()`
- **THEN** 当前场景被销毁并重新初始化，等价于重新开始当前关卡

### Requirement: Demo scene for Phase 0 validation
系统 SHALL 提供一个 `DemoScene`，用于验证 Phase 0 所有引擎功能。
DemoScene SHALL：
- 生成一个 20×15 的瓦片地图（草地 + 少量墙壁）
- 创建一个玩家实体（蓝色方块，WASD 移动，带碰撞体）
- 创建 3-5 个静态障碍物实体（灰色方块，带碰撞体）
- 摄像机跟随玩家
- 玩家不能穿过墙壁瓦片和障碍物

#### Scenario: Player moves on map
- **WHEN** 游戏启动进入 DemoScene，按下 WASD 键
- **THEN** 蓝色方块在瓦片地图上移动，摄像机跟随，遇到墙壁/障碍物时停下
