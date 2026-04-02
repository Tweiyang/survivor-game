/**
 * TilemapRenderer — Canvas 2D 瓦片地图渲染器
 * Unity equivalent: UnityEngine.Tilemaps.TilemapRenderer
 * 
 * 基于 TilemapData 在 Canvas 上绘制瓦片地图
 * 实现视锥裁剪，只渲染可见瓦片
 */
export class TilemapRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('./TilemapData.js').TilemapData} tilemapData
     */
    constructor(ctx, tilemapData) {
        /** @type {CanvasRenderingContext2D} */
        this._ctx = ctx;

        /** @type {import('./TilemapData.js').TilemapData} */
        this._data = tilemapData;
    }

    /**
     * 渲染瓦片地图（带视锥裁剪）
     * @param {import('../systems/CameraSystem.js').CameraSystem} camera
     */
    render(camera) {
        const ts = this._data.tileSize;
        const data = this._data;

        // 计算摄像机可见区域的瓦片范围（视锥裁剪）
        const camLeft = camera.position.x - camera.viewportWidth / 2;
        const camTop = camera.position.y - camera.viewportHeight / 2;
        const camRight = camLeft + camera.viewportWidth;
        const camBottom = camTop + camera.viewportHeight;

        const startX = Math.max(0, Math.floor(camLeft / ts));
        const startY = Math.max(0, Math.floor(camTop / ts));
        const endX = Math.min(data.width - 1, Math.floor(camRight / ts));
        const endY = Math.min(data.height - 1, Math.floor(camBottom / ts));

        // 计算偏移（世界坐标 → 屏幕坐标）
        const offsetX = camera.viewportWidth / 2 - camera.position.x;
        const offsetY = camera.viewportHeight / 2 - camera.position.y;

        // 绘制地面层
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = data.getGroundTile(x, y);
                if (tile) {
                    this._ctx.fillStyle = tile.color;
                    this._ctx.fillRect(
                        x * ts + offsetX,
                        y * ts + offsetY,
                        ts,
                        ts
                    );
                }
            }
        }

        // 绘制墙壁层
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const tile = data.getWallTile(x, y);
                if (tile) {
                    this._ctx.fillStyle = tile.color;
                    this._ctx.fillRect(
                        x * ts + offsetX,
                        y * ts + offsetY,
                        ts,
                        ts
                    );

                    // 给墙壁加一个简单的立体感（顶部高光 + 底部阴影）
                    this._ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    this._ctx.fillRect(
                        x * ts + offsetX,
                        y * ts + offsetY,
                        ts,
                        2
                    );
                    this._ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    this._ctx.fillRect(
                        x * ts + offsetX,
                        y * ts + offsetY + ts - 2,
                        ts,
                        2
                    );
                }
            }
        }

        // 绘制网格线（可选，调试用）
        if (this._showGrid) {
            this._ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            this._ctx.lineWidth = 0.5;
            for (let y = startY; y <= endY + 1; y++) {
                this._ctx.beginPath();
                this._ctx.moveTo(startX * ts + offsetX, y * ts + offsetY);
                this._ctx.lineTo((endX + 1) * ts + offsetX, y * ts + offsetY);
                this._ctx.stroke();
            }
            for (let x = startX; x <= endX + 1; x++) {
                this._ctx.beginPath();
                this._ctx.moveTo(x * ts + offsetX, startY * ts + offsetY);
                this._ctx.lineTo(x * ts + offsetX, (endY + 1) * ts + offsetY);
                this._ctx.stroke();
            }
        }
    }

    /**
     * 显示/隐藏网格线
     * @param {boolean} show
     */
    setShowGrid(show) {
        this._showGrid = show;
    }

    /**
     * 更新地图数据
     * @param {import('./TilemapData.js').TilemapData} tilemapData
     */
    setData(tilemapData) {
        this._data = tilemapData;
    }
}
