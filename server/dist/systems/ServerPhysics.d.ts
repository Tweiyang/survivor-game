export declare class ServerPhysics {
    /** 地图宽度（瓦片数） */
    mapWidth: number;
    /** 地图高度（瓦片数） */
    mapHeight: number;
    /** 瓦片大小（像素） */
    tileSize: number;
    /** 墙壁层数据（1D 数组，-1 = 无墙） */
    wallLayer: number[];
    /** 地面层数据 */
    groundLayer: number[];
    /**
     * 从 levels.json 的关卡配置初始化地图
     * 复用客户端 TilemapData.fromRooms 算法
     */
    loadLevel(levelConfig: any): void;
    /**
     * 判断世界坐标是否可行走
     * 复用客户端 TilemapData.isWalkable 逻辑
     */
    isWalkable(worldX: number, worldY: number): boolean;
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
    resolveMovement(fromX: number, fromY: number, toX: number, toY: number, radius?: number): {
        x: number;
        y: number;
    };
    /**
     * 检测圆形区域是否全部可行走
     * 检查圆心和四个边缘点
     */
    private _isAreaWalkable;
    /**
     * 圆形 vs 圆形碰撞检测
     * 用于投射物命中检测和怪物接触伤害
     */
    circleVsCircle(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean;
    /**
     * 获取地图世界尺寸（像素）
     */
    getWorldBounds(): {
        width: number;
        height: number;
    };
}
//# sourceMappingURL=ServerPhysics.d.ts.map