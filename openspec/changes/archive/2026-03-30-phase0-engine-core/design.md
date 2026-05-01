## Context

本项目是一款俯视角自动射击生存游戏（吸血鬼幸存者式），最终目标平台为 Unity + C#。当前阶段使用 JavaScript + Canvas 2D 实现原型。Phase 0 的目标是搭建引擎核心骨架，为后续所有游戏功能提供基础设施。

当前状态：空白项目，仅有 `rules.md` 和 OpenSpec 配置。

关键约束：
- 所有架构必须模拟 Unity 的 GameObject + Component 模式
- 零外部依赖，纯 Vanilla JS
- 必须支持后续 1:1 迁移到 Unity C#

## Goals / Non-Goals

**Goals:**
- 搭建完整的 Entity/Component 生命周期框架（→ Unity MonoBehaviour/GameObject）
- 实现稳定的 GameLoop（→ Unity 主循环）
- 实现 Canvas 2D 渲染管线（→ Unity SpriteRenderer + Tilemap）
- 实现简易 2D 碰撞检测（→ Unity Physics2D）
- 搭建 InputManager 抽象层骨架（→ Unity Input System）
- 搭建 Scene 管理骨架（→ Unity SceneManager）

**Non-Goals:**
- 不实现任何游戏逻辑（战斗、技能、升级 — 属于 P1-P3）
- 不实现触屏输入和虚拟摇杆（属于 P4）
- 不实现音效系统（优先级最低，预留接口即可）
- 不做性能优化（空间分区、对象池等留到需要时再做）
- 不实现网络功能

## Decisions

### D1: 组件架构选择 — 经典 Component 模式

**选择**：基于继承的 Component 基类模式（模拟 Unity MonoBehaviour）

**映射**：`Component` 基类 → `MonoBehaviour`，`Entity` → `GameObject`

**替代方案**：
- ECS（Entity Component System）纯数据驱动：性能更好，但架构差异太大，不利于 Unity 迁移
- Mixin 模式：灵活但难以映射到 Unity 的组件概念

**理由**：Unity 的核心编程模型就是 Component 挂载到 GameObject，我们需要最小化迁移成本。

### D2: 组件生命周期

**设计**：

```
                 ┌──────────────────────────────────┐
                 │         Component 生命周期        │
                 │                                    │
                 │  constructor()  ← 初始化字段       │
                 │       │                            │
                 │       ▼                            │
  Entity.addComponent()  │                            │
                 │       ▼                            │
                 │    start()     ← 首帧前调用一次    │
                 │       │         引用其他组件        │
                 │       ▼                            │
                 │  ┌─ update(dt) ← 每帧调用 ──┐     │
                 │  └──────────────────────────┘     │
                 │       │                            │
                 │       ▼ (Entity被销毁时)            │
                 │  onDestroy()   ← 清理资源          │
                 └──────────────────────────────────┘
```

**映射**：
| JS | Unity C# |
|----|----------|
| `constructor(config)` | `Awake()` + `[SerializeField]` |
| `start()` | `Start()` |
| `update(deltaTime)` | `Update()` |
| `onDestroy()` | `OnDestroy()` |

### D3: 实体管理策略

**选择**：全局 `EntityManager` 单例管理所有实体

**映射**：`EntityManager` → `Object.FindObjectsOfType<T>()` / `GameObject.Find()`

**设计**：
- 每个 Entity 有唯一 `id` 和可选 `tag`
- 支持按 tag 查找：`findByTag('player')` → `GameObject.FindWithTag("Player")`
- 支持按组件类型查找：`findByComponent(HealthComponent)` → `FindObjectOfType<HealthComponent>()`
- 延迟销毁：标记 `pendingDestroy`，在帧末统一清理（避免迭代中修改数组）

### D4: GameLoop 设计

**选择**：固定时间步 + 可变渲染

```
┌────────────────────── Game Loop ──────────────────────┐
│                                                        │
│   requestAnimationFrame(loop)                          │
│        │                                               │
│        ▼                                               │
│   计算 deltaTime = (now - lastTime) / 1000             │
│   clamp deltaTime to max 0.1s (防止跳帧)              │
│        │                                               │
│        ▼                                               │
│   ┌─ UPDATE PHASE ─────────────────────────────┐      │
│   │ 1. InputManager.update()      ← 采集输入    │      │
│   │ 2. EntityManager.updateAll(dt) ← 更新组件   │      │
│   │ 3. PhysicsSystem.update()      ← 碰撞检测   │      │
│   │ 4. EntityManager.cleanup()     ← 延迟销毁   │      │
│   └─────────────────────────────────────────────┘      │
│        │                                               │
│        ▼                                               │
│   ┌─ RENDER PHASE ─────────────────────────────┐      │
│   │ 1. Canvas clear                             │      │
│   │ 2. CameraSystem.apply()        ← 摄像机变换  │      │
│   │ 3. TilemapRenderer.render()    ← 地图底层    │      │
│   │ 4. RenderSystem.renderAll()    ← 精灵排序绘制│      │
│   │ 5. UI overlay (DOM-based)      ← HUD 层     │      │
│   └─────────────────────────────────────────────┘      │
│        │                                               │
│        ▼                                               │
│   requestAnimationFrame(loop)  ← 下一帧               │
└────────────────────────────────────────────────────────┘
```

**映射**：整体等价于 Unity 的 PlayerLoop（Update → LateUpdate → OnRenderObject）

### D5: 碰撞检测方案

**选择**：AABB + Circle 双模式碰撞

**映射**：
| JS | Unity |
|----|-------|
| `ColliderComponent('aabb', {w, h})` | `BoxCollider2D` |
| `ColliderComponent('circle', {radius})` | `CircleCollider2D` |
| `PhysicsSystem.checkCollision(a, b)` | Unity 自动碰撞回调 |

**碰撞检测算法**：
- AABB vs AABB：标准矩形重叠检测
- Circle vs Circle：距离 < 半径之和
- AABB vs Circle：最近点距离检测
- 碰撞回调：`onCollisionEnter(other)` / `onCollisionStay(other)` / `onCollisionExit(other)`

**当前不做空间分区**（O(n²) 暴力检测），怪物数量预计 <100，性能足够。

### D6: 渲染层级

```
Layer 0: 瓦片地图 (TilemapRenderer)
Layer 1: 地面物体 (掉落物、阴影)
Layer 2: 角色/怪物 (SpriteRenderer, 按 Y 轴排序)
Layer 3: 空中物体 (投射物)
Layer 4: UI (DOM overlay)
```

**映射**：等价于 Unity 的 Sorting Layer + Order in Layer

### D7: 输入管理架构

```
┌─────────────── InputManager ───────────────┐
│                                             │
│  ┌─────────────┐    ┌──────────────────┐   │
│  │ KeyboardInput│    │ TouchInput (P4)  │   │
│  │  Provider    │    │  Provider        │   │
│  └──────┬──────┘    └───────┬──────────┘   │
│         └──────┬────────────┘              │
│                ▼                            │
│     ┌─────────────────┐                    │
│     │  Unified API     │                    │
│     │  getAxis(name)   │                    │
│     │  getKey(key)     │                    │
│     │  getKeyDown(key) │                    │
│     │  getKeyUp(key)   │                    │
│     └─────────────────┘                    │
│                                             │
│  keyBindings: Map<action, keyCode>          │
│  (可配置，存 localStorage)                   │
└─────────────────────────────────────────────┘
```

**映射**：`InputManager` → Unity 新 Input System 的 `InputAction`

### D8: 瓦片地图数据格式

**配置化**（JSON）：

```json
{
  "width": 30,
  "height": 30,
  "tileSize": 32,
  "layers": [
    {
      "name": "ground",
      "data": [0,0,1,1,0,0,...]
    },
    {
      "name": "walls",
      "data": [0,0,0,2,2,0,...]
    }
  ],
  "tileTypes": {
    "0": { "color": "#4a7c59", "walkable": true, "name": "grass" },
    "1": { "color": "#8B7355", "walkable": true, "name": "dirt" },
    "2": { "color": "#696969", "walkable": false, "name": "wall" }
  }
}
```

**映射**：`tileTypes` → Unity Tilemap Palette，`layers` → Tilemap 图层

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| JS 组件模式与 Unity 不完全对齐 | 迁移时需要手动调整 | 保持命名和生命周期严格一致，用注释标注差异 |
| Canvas 2D 性能限制 | 大量实体时帧率下降 | 预留对象池接口，当前控制实体数量 <200 |
| O(n²) 碰撞检测 | 实体多时性能瓶颈 | 预留网格分区接口，当前足够使用 |
| 无类型检查 (JS) | 运行时错误难以发现 | 使用 JSDoc 注解，关键参数做运行时断言 |
| 模块加载兼容性 | 旧浏览器不支持 ES Modules | 目标现代浏览器，必要时可加 bundle 步骤 |

## Open Questions

- Q1: 是否需要在 Phase 0 就实现简易的像素动画系统（帧动画），还是留到 Phase 1？→ **建议 Phase 1，Phase 0 用静态色块即可**
- Q2: 地图数据是硬编码在 JS 中还是用 JSON 文件加载？→ **建议 JSON 加载，符合数据驱动原则，但 Phase 0 可内联一份默认地图**
