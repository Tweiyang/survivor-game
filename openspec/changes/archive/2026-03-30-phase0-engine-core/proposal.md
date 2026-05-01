## Why

**Phase: P0 — 引擎核心骨架**

项目从零开始，需要先搭建游戏引擎的基础框架，才能支撑后续所有游戏功能（战斗、技能、关卡等）的开发。这套引擎框架模拟 Unity 的 GameObject + Component 架构，使用 JavaScript + Canvas 2D 实现，确保后续可以 1:1 迁移到 Unity C#。没有这个基础层，任何游戏逻辑都无法运行。

## What Changes

- 新建项目入口 `index.html`，包含 Canvas 画布和模块加载
- 实现 `Component` 基类，提供 `start()` / `update(dt)` / `onDestroy()` 生命周期
- 实现 `Entity` 类（等价 GameObject），支持组件的添加/获取/移除
- 实现 `EntityManager`，管理所有活跃实体的创建、查找和销毁
- 实现 `GameLoop`，基于 `requestAnimationFrame` 驱动 update → render 循环
- 实现 `EventSystem` 全局事件总线，支持 `on` / `off` / `emit`
- 实现 `TransformComponent`，管理位置、旋转、缩放
- 实现 `SpriteRenderer` 组件，Canvas 2D 绘制像素风精灵（简单几何图形）
- 实现 `ColliderComponent`（AABB + Circle）和 `PhysicsSystem` 碰撞检测
- 实现 `RigidbodyComponent`，提供速度驱动的简易运动
- 实现 `RenderSystem`，管理渲染排序和摄像机偏移
- 实现 `CameraSystem`，支持跟随目标实体
- 实现 `TilemapRenderer`，Canvas 2D 绘制瓦片地图
- 实现 `InputManager` 骨架，抽象键盘输入，提供 `getAxis()` / `getKey()` 接口
- 实现 `Scene` 管理器骨架，支持场景初始化和切换

## Capabilities

### New Capabilities
- `engine-core`: 游戏引擎核心框架——Entity/Component 生命周期管理、GameLoop、EntityManager
- `rendering`: Canvas 2D 渲染管线——SpriteRenderer、TilemapRenderer、RenderSystem、CameraSystem
- `physics`: 简易 2D 物理系统——ColliderComponent、RigidbodyComponent、PhysicsSystem（AABB/Circle 碰撞检测）
- `input`: 输入管理抽象层——InputManager 骨架，键盘输入，预留触屏扩展
- `scene-management`: 场景/关卡管理骨架——Scene 初始化与切换

### Modified Capabilities
（无，这是全新项目）

## Impact

- **新建文件**：约 15-20 个 JS 模块文件 + 1 个 HTML 入口
- **依赖**：零外部依赖，纯 Vanilla JS + 原生 Canvas API
- **后续影响**：所有 Phase 1-4 的功能都将构建在此引擎框架之上
- **验证标准**：Phase 0 完成后，应能看到一个瓦片地图上有一个可通过 WASD 移动的像素角色方块，且碰撞检测正常工作
