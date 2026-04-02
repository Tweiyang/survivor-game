/**
 * TilemapData — 瓦片地图数据
 * Unity equivalent: Tilemap 数据 + TileBase 定义
 * 
 * 管理瓦片地图的网格数据和瓦片类型定义
 */

/** 默认瓦片类型定义 */
const DEFAULT_TILE_TYPES = {
    0: { color: '#4a7c59', walkable: true,  name: 'grass' },       // 草地
    1: { color: '#3d6b4e', walkable: true,  name: 'dark_grass' },  // 深色草地
    2: { color: '#8B7355', walkable: true,  name: 'dirt' },        // 泥土
    3: { color: '#696969', walkable: false, name: 'wall' },        // 墙壁
    4: { color: '#505050', walkable: false, name: 'stone' }        // 石头
};

export class TilemapData {
    /**
     * @param {object} config
     * @param {number} [config.width=20] - 地图宽度（瓦片数）
     * @param {number} [config.height=15] - 地图高度（瓦片数）
     * @param {number} [config.tileSize=32] - 瓦片大小（像素）
     * @param {object} [config.tileTypes] - 瓦片类型定义
     * @param {number[]} [config.groundData] - 地面层数据
     * @param {number[]} [config.wallData] - 墙壁层数据
     */
    constructor(config = {}) {
        /** @type {number} 地图宽度（瓦片数）*/
        this.width = config.width || 20;

        /** @type {number} 地图高度（瓦片数）*/
        this.height = config.height || 15;

        /** @type {number} 瓦片大小（像素）Unity: Grid.cellSize */
        this.tileSize = config.tileSize || 32;

        /** @type {object} 瓦片类型定义 Unity: TilePalette */
        this.tileTypes = config.tileTypes || DEFAULT_TILE_TYPES;

        /** @type {number[]} 地面层数据 */
        this.groundLayer = config.groundData || this._generateDefaultGround();

        /** @type {number[]} 墙壁层数据（-1 表示无瓦片）*/
        this.wallLayer = config.wallData || this._generateDefaultWalls();
    }

    /**
     * 生成默认地面层（草地 + 随机点缀）
     * @private
     * @returns {number[]}
     */
    _generateDefaultGround() {
        const data = [];
        for (let i = 0; i < this.width * this.height; i++) {
            // 90% 草地，10% 深色草地
            data.push(Math.random() < 0.9 ? 0 : 1);
        }
        return data;
    }

    /**
     * 生成默认墙壁层（四周围墙 + 中间一些障碍）
     * @private
     * @returns {number[]}
     */
    _generateDefaultWalls() {
        const data = new Array(this.width * this.height).fill(-1);

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const idx = y * this.width + x;

                // 四周围墙
                if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                    data[idx] = 3; // wall
                }
            }
        }

        // 中间放一些石头障碍
        const obstacles = [
            { x: 5, y: 5 }, { x: 6, y: 5 },
            { x: 10, y: 3 }, { x: 10, y: 4 }, { x: 10, y: 5 },
            { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 14, y: 9 },
            { x: 7, y: 10 }, { x: 8, y: 10 }, { x: 8, y: 11 }
        ];

        for (const obs of obstacles) {
            if (obs.x < this.width && obs.y < this.height) {
                data[obs.y * this.width + obs.x] = 4; // stone
            }
        }

        return data;
    }

    /**
     * 获取指定网格坐标的地面瓦片类型
     * @param {number} gridX - 网格 X
     * @param {number} gridY - 网格 Y
     * @returns {object|null} 瓦片类型信息
     */
    getGroundTile(gridX, gridY) {
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return null;
        }
        const tileId = this.groundLayer[gridY * this.width + gridX];
        return this.tileTypes[tileId] || null;
    }

    /**
     * 获取指定网格坐标的墙壁瓦片类型
     * @param {number} gridX
     * @param {number} gridY
     * @returns {object|null}
     */
    getWallTile(gridX, gridY) {
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return null;
        }
        const tileId = this.wallLayer[gridY * this.width + gridX];
        if (tileId === -1) return null;
        return this.tileTypes[tileId] || null;
    }

    /**
     * 世界坐标转网格坐标
     * @param {number} worldX
     * @param {number} worldY
     * @returns {{x: number, y: number}}
     */
    worldToGrid(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize)
        };
    }

    /**
     * 网格坐标转世界坐标（瓦片中心）
     * @param {number} gridX
     * @param {number} gridY
     * @returns {{x: number, y: number}}
     */
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.tileSize + this.tileSize / 2,
            y: gridY * this.tileSize + this.tileSize / 2
        };
    }

    /**
     * 获取指定世界坐标处的瓦片类型
     * Unity: Tilemap.GetTile(cellPosition)
     * @param {number} worldX
     * @param {number} worldY
     * @returns {object|null}
     */
    getTileAt(worldX, worldY) {
        const grid = this.worldToGrid(worldX, worldY);
        // 优先返回墙壁层
        const wall = this.getWallTile(grid.x, grid.y);
        if (wall) return wall;
        return this.getGroundTile(grid.x, grid.y);
    }

    /**
     * 查询指定世界坐标是否可行走
     * @param {number} worldX
     * @param {number} worldY
     * @returns {boolean}
     */
    isWalkable(worldX, worldY) {
        const grid = this.worldToGrid(worldX, worldY);

        // 超出地图边界不可行走
        if (grid.x < 0 || grid.x >= this.width || grid.y < 0 || grid.y >= this.height) {
            return false;
        }

        // 检查墙壁层
        const wallTile = this.getWallTile(grid.x, grid.y);
        if (wallTile && !wallTile.walkable) {
            return false;
        }

        // 检查地面层
        const groundTile = this.getGroundTile(grid.x, grid.y);
        if (groundTile && !groundTile.walkable) {
            return false;
        }

        return true;
    }

    /**
     * 获取地图世界尺寸（像素）
     * @returns {{width: number, height: number}}
     */
    getWorldSize() {
        return {
            width: this.width * this.tileSize,
            height: this.height * this.tileSize
        };
    }

    /**
     * 运行时动态修改瓦片（用于 Boss 门开启等）
     * Unity: Tilemap.SetTile()
     * @param {number} gridX
     * @param {number} gridY
     * @param {'ground' | 'wall'} layer — 'ground' 或 'wall'
     * @param {number} tileId — 瓦片 ID（-1 表示清除）
     */
    setTile(gridX, gridY, layer, tileId) {
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) return;
        const idx = gridY * this.width + gridX;
        if (layer === 'wall') {
            this.wallLayer[idx] = tileId;
        } else if (layer === 'ground') {
            this.groundLayer[idx] = tileId;
        }
    }

    /**
     * 从关卡房间配置构建 TilemapData（多房间拼接）
     * Unity: Tilemap Scene 构建
     * @param {Array<object>} rooms — 房间配置数组（来自 levels.json）
     * @param {number} [tileSize=32] — 瓦片大小
     * @returns {TilemapData}
     */
    static fromRooms(rooms, tileSize = 32) {
        // 1. 计算总地图尺寸（bounding box）
        let totalWidth = 0;
        let totalHeight = 0;
        for (const room of rooms) {
            totalWidth = Math.max(totalWidth, room.offsetX + room.width);
            totalHeight = Math.max(totalHeight, room.offsetY + room.height);
        }

        // 2. 初始化总地图（默认全部填充墙壁）
        const totalSize = totalWidth * totalHeight;
        const groundData = new Array(totalSize).fill(3); // 3 = wall 瓦片（不可行走区域的背景）
        const wallData = new Array(totalSize).fill(3);   // 3 = wall

        // 3. 将每个房间的瓦片数据写入总地图对应偏移位置
        for (const room of rooms) {
            for (let ry = 0; ry < room.height; ry++) {
                for (let rx = 0; rx < room.width; rx++) {
                    const roomIdx = ry * room.width + rx;
                    const totalX = room.offsetX + rx;
                    const totalY = room.offsetY + ry;
                    const totalIdx = totalY * totalWidth + totalX;

                    // 写入地面层
                    if (room.groundData && room.groundData[roomIdx] !== undefined) {
                        groundData[totalIdx] = room.groundData[roomIdx];
                    }
                    // 写入墙壁层
                    if (room.wallData && room.wallData[roomIdx] !== undefined) {
                        wallData[totalIdx] = room.wallData[roomIdx];
                    }
                }
            }
        }

        return new TilemapData({
            width: totalWidth,
            height: totalHeight,
            tileSize,
            groundData,
            wallData
        });
    }
}
