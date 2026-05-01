import { ColliderComponent } from '../components/ColliderComponent.js';

/**
 * PhysicsSystem — 碰撞检测系统
 * Unity equivalent: Physics2D 引擎
 * 
 * 每帧检测所有 ColliderComponent 之间的碰撞
 * 支持 AABB×AABB / Circle×Circle / AABB×Circle
 * 维护碰撞状态：Enter / Stay / Exit
 */
export class PhysicsSystem {
    /**
     * @param {import('../core/EntityManager.js').EntityManager} entityManager
     */
    constructor(entityManager) {
        /** @type {import('../core/EntityManager.js').EntityManager} */
        this._entityManager = entityManager;

        /** @type {Set<string>} 上一帧的碰撞对（用于 Enter/Stay/Exit 检测）*/
        this._previousCollisions = new Set();

        /** @type {Set<string>} 当前帧的碰撞对 */
        this._currentCollisions = new Set();

        /** @type {import('../map/TilemapData.js').TilemapData|null} 地图数据（用于碰撞推开时的墙壁检查） */
        this._tilemapData = null;
    }

    /**
     * 注入地图数据（用于防止碰撞推力将实体推入墙壁）
     * @param {import('../map/TilemapData.js').TilemapData} tilemapData
     */
    setTilemapData(tilemapData) {
        this._tilemapData = tilemapData;
    }

    /**
     * 检查目标位置是否可以被推到（不在墙壁内）
     * @private
     * @param {number} x 世界坐标 X
     * @param {number} y 世界坐标 Y
     * @param {number} [halfSize=10] 实体半尺寸
     * @returns {boolean}
     */
    _canPushTo(x, y, halfSize = 10) {
        if (!this._tilemapData) return true; // 没有地图数据时不限制
        return this._tilemapData.isWalkable(x - halfSize, y - halfSize) &&
               this._tilemapData.isWalkable(x + halfSize, y - halfSize) &&
               this._tilemapData.isWalkable(x - halfSize, y + halfSize) &&
               this._tilemapData.isWalkable(x + halfSize, y + halfSize);
    }

    /**
     * 生成碰撞对的唯一键
     * @private
     */
    _pairKey(idA, idB) {
        return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
    }

    /**
     * 每帧执行碰撞检测
     * Unity: Physics2D 自动在 FixedUpdate 后执行
     */
    update() {
        this._currentCollisions.clear();

        const entities = this._entityManager.findByComponent(ColliderComponent);

        // O(n²) 暴力碰撞检测
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const a = entities[i];
                const b = entities[j];

                if (!a.active || !b.active) continue;

                const colA = a.getComponent(ColliderComponent);
                const colB = b.getComponent(ColliderComponent);

                if (!colA.enabled || !colB.enabled) continue;

                if (this._checkCollision(colA, colB)) {
                    const key = this._pairKey(a.id, b.id);
                    this._currentCollisions.add(key);

                    const isTrigger = colA.isTrigger || colB.isTrigger;

                    if (this._previousCollisions.has(key)) {
                        // Stay — 持续碰撞
                        this._notifyCollision(a, b, isTrigger ? 'onTriggerStay' : 'onCollisionStay');
                    } else {
                        // Enter — 首次碰撞
                        this._notifyCollision(a, b, isTrigger ? 'onTriggerEnter' : 'onCollisionEnter');
                    }

                    // 非 trigger 碰撞产生分离推力
                    if (!isTrigger) {
                        this._resolveCollision(colA, colB);
                    }
                }
            }
        }

        // Exit — 检查上一帧有但本帧没有的碰撞对
        for (const key of this._previousCollisions) {
            if (!this._currentCollisions.has(key)) {
                const [idA, idB] = key.split(':').map(Number);
                const a = this._entityManager.entities.find(e => e.id === idA);
                const b = this._entityManager.entities.find(e => e.id === idB);

                if (a && b) {
                    const colA = a.getComponent(ColliderComponent);
                    const colB = b.getComponent(ColliderComponent);
                    const isTrigger = (colA && colA.isTrigger) || (colB && colB.isTrigger);
                    this._notifyCollision(a, b, isTrigger ? 'onTriggerExit' : 'onCollisionExit');
                }
            }
        }

        // 交换缓冲区
        this._previousCollisions = new Set(this._currentCollisions);
    }

    /**
     * 检测两个碰撞体是否重叠
     * @private
     * @param {ColliderComponent} a
     * @param {ColliderComponent} b
     * @returns {boolean}
     */
    _checkCollision(a, b) {
        if (a.type === 'aabb' && b.type === 'aabb') {
            return this._aabbVsAabb(a, b);
        }
        if (a.type === 'circle' && b.type === 'circle') {
            return this._circleVsCircle(a, b);
        }
        // AABB vs Circle (或 Circle vs AABB)
        if (a.type === 'aabb' && b.type === 'circle') {
            return this._aabbVsCircle(a, b);
        }
        if (a.type === 'circle' && b.type === 'aabb') {
            return this._aabbVsCircle(b, a);
        }
        return false;
    }

    /**
     * AABB vs AABB 碰撞检测
     * @private
     */
    _aabbVsAabb(a, b) {
        const boundsA = a.getBounds();
        const boundsB = b.getBounds();
        return boundsA.left < boundsB.right &&
               boundsA.right > boundsB.left &&
               boundsA.top < boundsB.bottom &&
               boundsA.bottom > boundsB.top;
    }

    /**
     * Circle vs Circle 碰撞检测
     * @private
     */
    _circleVsCircle(a, b) {
        const centerA = a.getWorldCenter();
        const centerB = b.getWorldCenter();
        const dx = centerA.x - centerB.x;
        const dy = centerA.y - centerB.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (a.radius + b.radius);
    }

    /**
     * AABB vs Circle 碰撞检测
     * @private
     * @param {ColliderComponent} aabb
     * @param {ColliderComponent} circle
     */
    _aabbVsCircle(aabb, circle) {
        const bounds = aabb.getBounds();
        const center = circle.getWorldCenter();

        // 找到 AABB 上离圆心最近的点
        const closestX = Math.max(bounds.left, Math.min(center.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(center.y, bounds.bottom));

        const dx = center.x - closestX;
        const dy = center.y - closestY;
        return (dx * dx + dy * dy) < (circle.radius * circle.radius);
    }

    /**
     * 碰撞分离（简易推开）
     * @private
     */
    _resolveCollision(colA, colB) {
        const a = colA.entity;
        const b = colB.entity;

        // 通过 constructor.name 查找 RigidbodyComponent，避免循环依赖
        let rigidA = null, rigidB = null;
        for (const comp of a._components) {
            if (comp.constructor.name === 'RigidbodyComponent') {
                rigidA = comp;
                break;
            }
        }
        for (const comp of b._components) {
            if (comp.constructor.name === 'RigidbodyComponent') {
                rigidB = comp;
                break;
            }
        }

        const centerA = colA.getWorldCenter();
        const centerB = colB.getWorldCenter();

        let dx = centerA.x - centerB.x;
        let dy = centerA.y - centerB.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) {
            // 完全重叠，随机推一个方向
            dx = 1;
            dy = 0;
        } else {
            dx /= dist;
            dy /= dist;
        }

        // 计算重叠量
        let overlap = 0;
        if (colA.type === 'aabb' && colB.type === 'aabb') {
            const boundsA = colA.getBounds();
            const boundsB = colB.getBounds();
            const overlapX = Math.min(boundsA.right - boundsB.left, boundsB.right - boundsA.left);
            const overlapY = Math.min(boundsA.bottom - boundsB.top, boundsB.bottom - boundsA.top);
            overlap = Math.min(overlapX, overlapY);
        } else if (colA.type === 'circle' && colB.type === 'circle') {
            overlap = (colA.radius + colB.radius) - dist;
        } else {
            overlap = 4; // 简单固定值
        }

        if (overlap <= 0) return;

        // 分离推力分配
        const aKinematic = rigidA ? rigidA.isKinematic : true;
        const bKinematic = rigidB ? rigidB.isKinematic : true;

        if (!aKinematic && !bKinematic) {
            // 两者都可推，各推一半（检查墙壁）
            const axNew = a.transform.position.x + dx * overlap * 0.5;
            const ayNew = a.transform.position.y + dy * overlap * 0.5;
            const bxNew = b.transform.position.x - dx * overlap * 0.5;
            const byNew = b.transform.position.y - dy * overlap * 0.5;
            if (this._canPushTo(axNew, ayNew)) {
                a.transform.position.x = axNew;
                a.transform.position.y = ayNew;
            }
            if (this._canPushTo(bxNew, byNew)) {
                b.transform.position.x = bxNew;
                b.transform.position.y = byNew;
            }
        } else if (!aKinematic) {
            const axNew = a.transform.position.x + dx * overlap;
            const ayNew = a.transform.position.y + dy * overlap;
            if (this._canPushTo(axNew, ayNew)) {
                a.transform.position.x = axNew;
                a.transform.position.y = ayNew;
            }
        } else if (!bKinematic) {
            const bxNew = b.transform.position.x - dx * overlap;
            const byNew = b.transform.position.y - dy * overlap;
            if (this._canPushTo(bxNew, byNew)) {
                b.transform.position.x = bxNew;
                b.transform.position.y = byNew;
            }
        }
    }

    /**
     * 通知碰撞回调
     * @private
     */
    _notifyCollision(entityA, entityB, callbackName) {
        for (const comp of entityA._components) {
            if (typeof comp[callbackName] === 'function') {
                comp[callbackName](entityB);
            }
        }
        for (const comp of entityB._components) {
            if (typeof comp[callbackName] === 'function') {
                comp[callbackName](entityA);
            }
        }
    }

    // ============================================================
    // 静态查询方法
    // ============================================================

    /**
     * 查询圆形范围内的所有碰撞体
     * Unity: Physics2D.OverlapCircleAll(center, radius)
     * @param {{x: number, y: number}} center
     * @param {number} radius
     * @param {string} [layerFilter] - 可选碰撞层过滤
     * @returns {import('../core/Entity.js').Entity[]}
     */
    overlapCircle(center, radius, layerFilter) {
        const results = [];
        const entities = this._entityManager.findByComponent(ColliderComponent);

        for (const entity of entities) {
            if (!entity.active) continue;
            const col = entity.getComponent(ColliderComponent);
            if (!col || !col.enabled) continue;
            if (layerFilter && col.layer !== layerFilter) continue;

            const colCenter = col.getWorldCenter();
            const dx = colCenter.x - center.x;
            const dy = colCenter.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let colRadius = col.type === 'circle' ? col.radius : Math.max(col.width, col.height) / 2;

            if (dist < radius + colRadius) {
                results.push(entity);
            }
        }

        return results;
    }

    /**
     * 射线检测（简易版）
     * Unity: Physics2D.Raycast(origin, direction, distance)
     * @param {{x: number, y: number}} origin
     * @param {{x: number, y: number}} direction - 归一化方向
     * @param {number} distance
     * @param {string} [layerFilter]
     * @returns {import('../core/Entity.js').Entity|null} 第一个命中的实体
     */
    raycast(origin, direction, distance, layerFilter) {
        const entities = this._entityManager.findByComponent(ColliderComponent);
        let closest = null;
        let closestDist = distance;

        const steps = Math.ceil(distance / 4);

        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * distance;
            const px = origin.x + direction.x * t;
            const py = origin.y + direction.y * t;

            for (const entity of entities) {
                if (!entity.active) continue;
                const col = entity.getComponent(ColliderComponent);
                if (!col || !col.enabled) continue;
                if (layerFilter && col.layer !== layerFilter) continue;

                const bounds = col.getBounds();
                if (px >= bounds.left && px <= bounds.right &&
                    py >= bounds.top && py <= bounds.bottom) {
                    if (t < closestDist) {
                        closestDist = t;
                        closest = entity;
                    }
                }
            }
        }

        return closest;
    }
}
