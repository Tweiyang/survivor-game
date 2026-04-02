"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Colyseus Server Entry Point
 * Unity equivalent: Dedicated Server Build entry
 *
 * 启动 express + Colyseus，注册 BattleRoom
 */
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const core_1 = require("@colyseus/core");
const ws_transport_1 = require("@colyseus/ws-transport");
const BattleRoom_1 = require("./rooms/BattleRoom");
const PORT = Number(process.env.PORT) || 2567;
const app = (0, express_1.default)();
// CORS — 允许 GitHub Pages 及其他域名的跨域请求
app.use((_req, res, next) => {
    const origin = _req.headers.origin || '';
    // 允许 *.github.io、localhost、以及所有 Render 域名
    if (origin.endsWith('.github.io') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.onrender.com')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});
const httpServer = (0, http_1.createServer)(app);
const gameServer = new core_1.Server({
    transport: new ws_transport_1.WebSocketTransport({ server: httpServer }),
});
// 注册房间类型
gameServer.define('battle', BattleRoom_1.BattleRoom)
    .filterBy(['levelId']); // 按关卡 ID 过滤匹配
gameServer.listen(PORT).then(() => {
    console.log(`[Server] 🎮 Colyseus server listening on ws://localhost:${PORT}`);
    console.log(`[Server] Room types: battle (max 4 players)`);
}).catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map