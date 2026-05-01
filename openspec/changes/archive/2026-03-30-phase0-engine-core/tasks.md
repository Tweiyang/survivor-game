## 1. 项目骨架与入口

- [x] 1.1 创建项目目录结构（src/core/, src/components/, src/systems/, src/map/, src/ui/, src/entities/），创建 `index.html` 入口文件，包含 Canvas 元素和 ES Module 入口脚本引用。验证：浏览器打开 index.html 能看到一个黑色 Canvas 画布。
- [x] 1.2 创建 `src/core/Component.js` — Component 基类，包含 `start()` / `update(dt)` / `onDestroy()` 生命周期方法、`enabled` 属性、`entity` 引用。验证：可以 new 一个 Component 子类实例，生命周期方法可被调用。

## 2. Entity 与 EntityManager

- [x] 2.1 创建 `src/core/Entity.js` — Entity 类（GameObject 等价），支持 `addComponent()` / `getComponent()` / `removeComponent()` / `hasComponent()`，自带唯一 `id`、`name`、`tag`、`active` 属性。验证：创建 Entity 后可添加/获取/移除组件，id 自增唯一。
- [x] 2.2 创建 `src/components/TransformComponent.js` — 管理 position({x,y})、rotation、scale({x,y})，Entity 构造时自动添加。验证：`new Entity()` 后 `getComponent(TransformComponent)` 不为 null，position 默认 {x:0, y:0}。
- [x] 2.3 创建 `src/core/EntityManager.js` — 单例，支持 `add()` / `remove()` / `findByTag()` / `findAllByTag()` / `findByComponent()` / `updateAll(dt)` / `cleanup()`，实现延迟销毁。验证：添加实体后可按 tag 查找，remove 后 cleanup 才真正移除。

## 3. 事件系统

- [x] 3.1 创建 `src/core/EventSystem.js` — 全局事件总线，支持 `on(event, cb)` / `off(event, cb)` / `emit(event, ...args)`。验证：订阅事件后 emit 能触发回调，off 后不再触发。

## 4. 输入系统

- [x] 4.1 创建 `src/systems/InputManager.js` — 单例，实现 `getAxis(name)` / `getKey(key)` / `getKeyDown(key)` / `getKeyUp(key)` / `update()` 接口。实现 KeyboardInputProvider，监听 keydown/keyup，支持 WASD 默认绑定和对角归一化。验证：按 W 键时 `getAxis('vertical')` 返回 -1，同时按 W+D 返回归一化值。
- [x] 4.2 实现键位绑定配置：`setBinding()` / `resetToDefault()`，绑定存储到 localStorage。定义 InputProvider 接口供 Phase 4 扩展。验证：修改键位后按新键有效，刷新页面后键位保持。

## 5. 渲染系统

- [x] 5.1 创建 `src/components/SpriteRenderer.js` — 精灵渲染组件，支持 width/height/color/shape(rect/circle/triangle)/sortingLayer/sortingOrder/visible/opacity 属性，预留 sprite 字段。实现 `render(ctx, camera)` 方法绘制简单几何图形。验证：实体可用不同形状和颜色在 Canvas 上正确绘制。
- [x] 5.2 创建 `src/systems/RenderSystem.js` — 渲染管线，每帧收集所有 SpriteRenderer，按 sortingLayer → sortingOrder → Y 坐标排序后依次绘制。验证：不同层级的实体按正确顺序绘制，Y 轴排序产生伪深度效果。
- [x] 5.3 创建 `src/systems/CameraSystem.js` — 摄像机系统，支持 `setTarget()` 跟随目标、平滑插值、`worldToScreen()` / `screenToWorld()` 坐标转换。验证：设置玩家为目标后，摄像机平滑跟随玩家移动，坐标转换数学正确。

## 6. 瓦片地图

- [x] 6.1 创建 `src/map/TilemapData.js` — 瓦片地图数据类，定义默认地图（20×15，含草地和墙壁），支持 `getTileAt(worldX, worldY)` / `isWalkable(worldX, worldY)` 查询。验证：查询墙壁位置返回 walkable=false，草地返回 true。
- [x] 6.2 创建 `src/map/TilemapRenderer.js` — Canvas 2D 瓦片渲染，按 tileSize 逐格绘制颜色方块，实现视锥裁剪（只渲染可见瓦片）。验证：瓦片地图正确渲染在 Canvas 上，不同瓦片类型颜色不同，滚动视图只绘制可见区域。

## 7. 物理与碰撞

- [x] 7.1 创建 `src/components/ColliderComponent.js` — 碰撞体组件，支持 aabb/circle 类型、offset、isTrigger、layer 属性。验证：创建 AABB/Circle 碰撞体后，能正确返回碰撞区域的边界。
- [x] 7.2 创建 `src/components/RigidbodyComponent.js` — 速度驱动运动组件，含 velocity、maxSpeed、friction、isKinematic，update 时根据 velocity 移动 Transform。验证：设置 velocity 后实体每帧按速度移动，friction 导致减速。
- [x] 7.3 创建 `src/systems/PhysicsSystem.js` — 碰撞检测系统，实现 AABB×AABB / Circle×Circle / AABB×Circle 碰撞算法，维护碰撞状态（Enter/Stay/Exit），调用实体组件的碰撞回调，非 trigger 碰撞产生分离推力。验证：两个实体重叠时触发 onCollisionEnter，持续重叠触发 Stay，分离后触发 Exit。
- [x] 7.4 实现 `overlapCircle(center, radius, layerFilter?)` 静态查询方法。验证：给定圆心和半径，正确返回范围内所有碰撞体实体。

## 8. 场景管理

- [x] 8.1 创建 `src/core/Scene.js` — Scene 基类，定义 `init()` / `update(dt)` / `destroy()` 接口。创建 `src/core/SceneManager.js` — 单例，支持 `register()` / `loadScene()` / `getCurrentScene()` / `restart()`，切换时清理旧场景。验证：注册两个场景后可来回切换，切换时旧实体被清理。

## 9. 游戏主循环

- [x] 9.1 创建 `src/core/GameLoop.js` — 基于 requestAnimationFrame，每帧按 Input→Update→Physics→Cleanup→Render 顺序执行，deltaTime clamp 到 0.1s，支持 start/stop/pause/resume。验证：启动 GameLoop 后每帧执行正确顺序，pause 后 update 停止但画面保持。

## 10. Demo 场景整合验证

- [x] 10.1 创建 `src/scenes/DemoScene.js` — 生成 20×15 瓦片地图，创建蓝色方块玩家（WASD 移动+碰撞体），创建 3-5 个灰色障碍物（碰撞体），摄像机跟随玩家。创建 `src/main.js` 入口串联所有系统。验证：浏览器打开 index.html，看到瓦片地图上的蓝色方块，WASD 可移动，撞墙/障碍物会停下，摄像机跟随。
- [x] 10.2 在 DemoScene 中添加简易调试信息叠加层：显示 FPS、实体数量、玩家坐标。验证：画面左上角显示实时 FPS 和调试数据。