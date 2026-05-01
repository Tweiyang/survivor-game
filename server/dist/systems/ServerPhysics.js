"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerPhysics = void 0;
/** 瓦片类型定义（对应客户端 TilemapData.tileTypes） */
const TILE_TYPES = {
    0: { walkable: true }, // 空地
    1: { walkable: true }, // 地板
    2: { walkable: true }, // 地板变体
    3: { walkable: false }, // 墙壁
    4: { walkable: false }, // 石头
    5: { walkable: true }, // 门（可通行）
};
class ServerPhysics {
    constructor() {
        /** 地图宽度（瓦片数） */
        this.mapWidth = 0;
        /** 地图高度（瓦片数） */
        this.mapHeight = 0;
        /** 瓦片大小（像素） */
        this.tileSize = 64;
        /** 墙壁层数据（1D 数组，-1 = 无墙） */
        this.wallLayer = [];
        /** 地面层数据 */
        this.groundLayer = [];
    }
    /**
     * 从 levels.json 的关卡配置初始化地图
     * 复用客户端 TilemapData.fromRooms 算法
     */
    loadLevel(levelConfig) {
        this.tileSize = levelConfig.tileSize || 64;
        const rooms = levelConfig.rooms || [];
        // 计算地图总尺寸（兼容 offsetX/offsetY 和 x/y 两种格式）
        let maxW = 0, maxH = 0;
        for (const room of rooms) {
            const rx = room.offsetX ?? room.x ?? 0;
            const ry = room.offsetY ?? room.y ?? 0;
            const right = rx + (room.width || 0);
            const bottom = ry + (room.height || 0);
            if (right > maxW)
                maxW = right;
            if (bottom > maxH)
                maxH = bottom;
        }
        this.mapWidth = maxW;
        this.mapHeight = maxH;
        // 初始化图层（-1 = 无墙，-2 = 虚空/未覆盖区域）
        const total = maxW * maxH;
        this.wallLayer = new Array(total).fill(-1);
        this.groundLayer = new Array(total).fill(-2); // -2 = 虚空（不可行走）
        // 填充房间数据（兼容 1D groundData/wallData 和 2D ground/walls）
        for (const room of rooms) {
            const roomX = room.offsetX ?? room.x ?? 0;
            const roomY = room.offsetY ?? room.y ?? 0;
            const w = room.width || 0;
            const h = room.height || 0;
            // 解析地面数据
            const groundData1D = room.groundData || null;
            const groundData2D = room.ground || null;
            // 解析墙壁数据
            const wallData1D = room.wallData || null;
            const wallData2D = room.walls || null;
            for (let ly = 0; ly < h; ly++) {
                for (let lx = 0; lx < w; lx++) {
                    const gx = roomX + lx;
                    const gy = roomY + ly;
                    const idx = gy * maxW + gx;
                    const localIdx = ly * w + lx;
                    // 地面层
                    if (groundData1D) {
                        this.groundLayer[idx] = groundData1D[localIdx] ?? 1;
                    }
                    else if (groundData2D && groundData2D[ly]) {
                        this.groundLayer[idx] = groundData2D[ly][lx] ?? 1;
                    }
                    else {
                        this.groundLayer[idx] = 1; // 默认地板
                    }
                    // 墙壁层
                    if (wallData1D) {
                        this.wallLayer[idx] = wallData1D[localIdx] ?? -1;
                    }
                    else if (wallData2D && wallData2D[ly]) {
                        this.wallLayer[idx] = wallData2D[ly][lx] ?? -1;
                    }
                }
            }
        }
        console.log(`[ServerPhysics] Map loaded: ${this.mapWidth}×${this.mapHeight} tiles, tileSize=${this.tileSize}`);
    }
    /**
     * 判断世界坐标是否可行走
     * 复用客户端 TilemapData.isWalkable 逻辑
     */
    isWalkable(worldX, worldY) {
        // 地图未加载时不限制移动
        if (this.mapWidth === 0 || this.mapHeight === 0) {
            return true;
        }
        const gx = Math.floor(worldX / this.tileSize);
        const gy = Math.floor(worldY / this.tileSize);
        // 超出地图边界不可行走
        if (gx < 0 || gx >= this.mapWidth || gy < 0 || gy >= this.mapHeight) {
            return false;
        }
        const idx = gy * this.mapWidth + gx;
        // 检查墙壁层
        const wallId = this.wallLayer[idx];
        if (wallId !== -1) {
            const tileType = TILE_TYPES[wallId];
            if (tileType && !tileType.walkable) {
                return false;
            }
        }
        // 检查地面层（-2 = 虚空，不可行走）
        const groundId = this.groundLayer[idx];
        if (groundId === -2) {
            return false;
        }
        const groundType = TILE_TYPES[groundId];
        if (groundType && !groundType.walkable) {
            return false;
        }
        return true;
    }
    /**
     * 解决实体移动的墙壁碰撞
     * 输入当前位置和目标位置，返回合法位置
     *
     * @param fromX 当前 X
     * @param fromY 当前 Y
     * @param toX 目标 X
     * @param toY 目标 Y
     * @param radius 实体碰撞半径
     * @returns 合法的 {x, y} 位置
     */
    resolveMovement(fromX, fromY, toX, toY, radius = 16) {
        // 先尝试完整移动
        if (this._isAreaWalkable(toX, toY, radius)) {
            return { x: toX, y: toY };
        }
        // 分轴检测：尝试仅 X 移动
        let resultX = fromX;
        let resultY = fromY;
        if (this._isAreaWalkable(toX, fromY, radius)) {
            resultX = toX;
        }
        if (this._isAreaWalkable(resultX, toY, radius)) {
            resultY = toY;
        }
        return { x: resultX, y: resultY };
    }
    /**
     * 检测圆形区域是否全部可行走
     * 检查圆心和四个边缘点
     */
    _isAreaWalkable(cx, cy, radius) {
        return this.isWalkable(cx, cy) &&
            this.isWalkable(cx - radius, cy) &&
            this.isWalkable(cx + radius, cy) &&
            this.isWalkable(cx, cy - radius) &&
            this.isWalkable(cx, cy + radius);
    }
    /**
     * 圆形 vs 圆形碰撞检测
     * 用于投射物命中检测和怪物接触伤害
     */
    circleVsCircle(x1, y1, r1, x2, y2, r2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        const distSq = dx * dx + dy * dy;
        const radiusSum = r1 + r2;
        return distSq < radiusSum * radiusSum;
    }
    /**
     * 获取地图世界尺寸（像素）
     */
    getWorldBounds() {
        return {
            width: this.mapWidth * this.tileSize,
            height: this.mapHeight * this.tileSize
        };
    }
}
exports.ServerPhysics = ServerPhysics;
//# sourceMappingURL=ServerPhysics.js.map