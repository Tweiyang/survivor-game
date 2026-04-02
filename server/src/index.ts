/**
 * Colyseus Server Entry Point
 * Unity equivalent: Dedicated Server Build entry
 *
 * 启动 express + Colyseus，注册 BattleRoom
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { BattleRoom } from './rooms/BattleRoom';

const PORT = Number(process.env.PORT) || 2567;

const app = express();

// CORS — 允许 GitHub Pages 及其他域名的跨域请求
app.use((_req, res, next) => {
    const origin = _req.headers.origin || '';
    // 允许 *.github.io、localhost、以及所有 Render 域名
    if (origin.endsWith('.github.io') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.onrender.com')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
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

const httpServer = createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
});

// 注册房间类型
gameServer.define('battle', BattleRoom)
    .filterBy(['levelId']);  // 按关卡 ID 过滤匹配

gameServer.listen(PORT).then(() => {
    console.log(`[Server] 🎮 Colyseus server listening on ws://localhost:${PORT}`);
    console.log(`[Server] Room types: battle (max 4 players)`);
}).catch((err: Error) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
});
