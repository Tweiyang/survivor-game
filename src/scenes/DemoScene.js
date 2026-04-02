import { Scene } from '../core/Scene.js';
import { Entity } from '../core/Entity.js';
import { SpriteRenderer } from '../components/SpriteRenderer.js';
import { ColliderComponent } from '../components/ColliderComponent.js';
import { RigidbodyComponent } from '../components/RigidbodyComponent.js';
import { Component } from '../core/Component.js';
import { TilemapData } from '../map/TilemapData.js';

// ============================================================
// PlayerController — 玩家移动控制组件（Demo 用）
// Unity equivalent: public class PlayerController : MonoBehaviour
// ============================================================
class PlayerController extends Component {
    constructor(config = {}) {
        super(config);
        /** @type {number} 移动速度（像素/秒）*/
        this.moveSpeed = config.moveSpeed || 150;
        /** @type {import('../map/TilemapData.js').TilemapData|null} */
        this.tilemapData = config.tilemapData || null;
    }

    /**
     * Unity: void Update()
     * @param {number} deltaTime
     */
    update(deltaTime) {
        const input = this.entity._inputManager; // DemoScene 会注入
        if (!input) return;

        const moveX = input.getAxis('horizontal');
        const moveY = input.getAxis('vertical');

        // 计算目标位置
        const transform = this.entity.transform;
        const newX = transform.position.x + moveX * this.moveSpeed * deltaTime;
        const newY = transform.position.y + moveY * this.moveSpeed * deltaTime;

        // 瓦片碰撞检测（检查四个角）
        const halfSize = 12; // 碰撞检测用的半尺寸（略小于视觉尺寸）

        if (this.tilemapData) {
            // 分轴检测，先 X 再 Y（允许沿墙滑行）
            let canMoveX = true;
            let canMoveY = true;

            // 检测 X 方向
            if (moveX !== 0) {
                canMoveX = this.tilemapData.isWalkable(newX - halfSize, transform.position.y - halfSize) &&
                           this.tilemapData.isWalkable(newX + halfSize, transform.position.y - halfSize) &&
                           this.tilemapData.isWalkable(newX - halfSize, transform.position.y + halfSize) &&
                           this.tilemapData.isWalkable(newX + halfSize, transform.position.y + halfSize);
            }

            // 检测 Y 方向
            if (moveY !== 0) {
                canMoveY = this.tilemapData.isWalkable(transform.position.x - halfSize, newY - halfSize) &&
                           this.tilemapData.isWalkable(transform.position.x + halfSize, newY - halfSize) &&
                           this.tilemapData.isWalkable(transform.position.x - halfSize, newY + halfSize) &&
                           this.tilemapData.isWalkable(transform.position.x + halfSize, newY + halfSize);
            }

            if (canMoveX) transform.position.x = newX;
            if (canMoveY) transform.position.y = newY;
        } else {
            transform.position.x = newX;
            transform.position.y = newY;
        }

        // 更新 Rigidbody velocity（用于碰撞系统的方向判断）
        const rb = this.getComponent(RigidbodyComponent);
        if (rb) {
            rb.velocity.x = moveX * this.moveSpeed;
            rb.velocity.y = moveY * this.moveSpeed;
        }
    }
}

// ============================================================
// DemoScene — Phase 0 验证场景
// ============================================================
export class DemoScene extends Scene {
    constructor(name, systems) {
        super(name, systems);

        /** @type {TilemapData|null} */
        this.tilemapData = null;

        /** @type {Entity|null} */
        this.player = null;
    }

    /**
     * 初始化 Demo 场景
     */
    init() {
        const { entityManager, camera } = this.systems;

        // 1. 创建瓦片地图
        this.tilemapData = new TilemapData({ width: 20, height: 15, tileSize: 32 });

        // 更新 TilemapRenderer 的数据
        if (this.systems.tilemapRenderer) {
            this.systems.tilemapRenderer.setData(this.tilemapData);
        }

        // 设置摄像机边界
        const mapSize = this.tilemapData.getWorldSize();
        camera.setBounds(0, 0, mapSize.width, mapSize.height);

        // 2. 创建玩家实体
        this.player = new Entity('Player', 'player');
        this.player.transform.setPosition(
            3 * this.tilemapData.tileSize + 16,  // 第 3 格中心
            3 * this.tilemapData.tileSize + 16
        );

        // 玩家精灵 — 蓝色方块
        this.player.addComponent(new SpriteRenderer({
            width: 28,
            height: 28,
            color: '#4488FF',
            shape: 'rect',
            sortingLayer: 2,
            strokeColor: '#2266DD',
            strokeWidth: 2
        }));

        // 玩家碰撞体
        this.player.addComponent(new ColliderComponent({
            type: 'aabb',
            width: 24,
            height: 24,
            layer: 'player'
        }));

        // 玩家物理体（非运动学，可被推）
        this.player.addComponent(new RigidbodyComponent({
            maxSpeed: 200,
            isKinematic: false
        }));

        // 玩家控制器
        const controller = new PlayerController({
            moveSpeed: 150,
            tilemapData: this.tilemapData
        });
        this.player.addComponent(controller);

        // 注入 InputManager 引用
        this.player._inputManager = this.systems.inputManager;

        entityManager.add(this.player);

        // 设置摄像机跟随
        camera.setTarget(this.player);
        camera.snapToTarget();

        // 3. 创建障碍物实体
        const obstaclePositions = [
            { x: 7, y: 7 },
            { x: 12, y: 5 },
            { x: 15, y: 10 },
            { x: 5, y: 11 },
            { x: 16, y: 3 }
        ];

        for (const pos of obstaclePositions) {
            const obstacle = new Entity('Obstacle', 'obstacle');
            obstacle.transform.setPosition(
                pos.x * this.tilemapData.tileSize + 16,
                pos.y * this.tilemapData.tileSize + 16
            );

            obstacle.addComponent(new SpriteRenderer({
                width: 28,
                height: 28,
                color: '#888888',
                shape: 'rect',
                sortingLayer: 2,
                strokeColor: '#666666',
                strokeWidth: 2
            }));

            obstacle.addComponent(new ColliderComponent({
                type: 'aabb',
                width: 28,
                height: 28,
                layer: 'obstacle'
            }));

            // 障碍物是运动学物体（不会被推动）
            obstacle.addComponent(new RigidbodyComponent({
                isKinematic: true
            }));

            entityManager.add(obstacle);
        }

        // 4. 添加一些装饰性小物体（展示不同形状和渲染层级）
        const decorPositions = [
            { x: 4, y: 4, color: '#66AA44', shape: 'circle' },
            { x: 9, y: 8, color: '#AA6644', shape: 'triangle' },
            { x: 13, y: 12, color: '#6644AA', shape: 'circle' },
        ];

        for (const dec of decorPositions) {
            const decor = new Entity('Decor', 'decor');
            decor.transform.setPosition(
                dec.x * this.tilemapData.tileSize + 16,
                dec.y * this.tilemapData.tileSize + 16
            );

            decor.addComponent(new SpriteRenderer({
                width: 16,
                height: 16,
                color: dec.color,
                shape: dec.shape,
                sortingLayer: 1,  // 地面层
                opacity: 0.7
            }));

            entityManager.add(decor);
        }

        console.log('[DemoScene] Initialized with', entityManager.count, 'entities');
    }

    /**
     * 场景级更新
     * @param {number} deltaTime
     */
    update(deltaTime) {
        // ESC 暂停/恢复（由 GameLoop 层处理更合适，这里演示）
    }

    /**
     * 场景销毁
     */
    destroy() {
        this.tilemapData = null;
        this.player = null;
        console.log('[DemoScene] Destroyed');
    }
}
