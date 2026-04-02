# 🎮 战斗服务器 (Colyseus)

Phase 5 多人合作模式的权威服务端。基于 [Colyseus](https://colyseus.io/) 框架，使用 TypeScript 编写。

## 📋 系统要求

- **Node.js** ≥ 16.x
- **npm** ≥ 8.x

## 🚀 快速开始

```bash
# 1. 安装依赖
cd server
npm install

# 2. 启动开发服务器（热重载）
npm run dev

# 3. 或者构建后运行
npm run build
npm start
```

服务器默认监听 **http://localhost:2567**。

## 📁 目录结构

```
server/
├── src/
│   ├── index.ts              # 入口：Express + Colyseus 启动
│   ├── rooms/
│   │   └── BattleRoom.ts     # 战斗房间逻辑（生命周期 + 20Hz 游戏循环）
│   ├── schema/               # Colyseus Schema 状态定义
│   │   ├── BattleState.ts    # 房间顶层状态
│   │   ├── PlayerState.ts    # 玩家状态
│   │   ├── MonsterState.ts   # 怪物状态
│   │   ├── ProjectileState.ts# 投射物状态
│   │   ├── DropState.ts      # 掉落物状态
│   │   └── LevelState.ts     # 关卡进度状态
│   └── systems/              # 服务端游戏子系统
│       ├── ServerPhysics.ts  # 墙壁碰撞检测
│       ├── ServerSpawner.ts  # 波次怪物生成
│       ├── ServerAI.ts       # 怪物追击 AI
│       ├── ServerCombat.ts   # 投射物 + 伤害 + 经验
│       └── DifficultyScaler.ts # 多人难度缩放
├── package.json
└── tsconfig.json
```

## 🔌 消息协议

### 客户端 → 服务端

| 类型 | 数据 | 说明 |
|------|------|------|
| `input` | `{ seq, dx, dy, dt }` | 移动输入（预测用） |
| `ready` | `{}` | 玩家准备就绪 |
| `selectChar` | `{ characterId }` | 切换角色 |
| `skillChoice` | `{ skillId }` | 升级选技能 |
| `useSkill` | `{}` | 释放主动技能 |
| `ping` | `{}` | 延迟测量 |

### 服务端 → 客户端

| 类型 | 数据 | 说明 |
|------|------|------|
| `damageEvent` | `{ targetId, targetType, damage, isCrit, killerId, killed }` | 伤害事件 |
| `sfxEvent` | `{ soundId, x, y }` | 音效触发 |
| `levelUp` | `{ playerId, newLevel, skillOptions }` | 玩家升级 |
| `notification` | `{ text, type }` | 通知消息 |
| `pong` | `{}` | 延迟测量响应 |

## ⚙️ 配置文件

服务端从 `assets/data/` 目录加载共享配置：

- `characters.json` — 角色属性
- `levels.json` — 关卡地图和刷怪配置
- `formulas.json` — 战斗公式
- `difficulty.json` — 多人难度缩放参数

## 🔧 开发调试

1. 启动服务器: `npm run dev`
2. 打开浏览器访问 `index.html` (需要本地 HTTP 服务器)
3. 选角 → 大厅 → 创建房间
4. 再开一个浏览器窗口，加入同一房间
5. 全员 Ready 后开始战斗

### Colyseus Monitor (可选)

访问 `http://localhost:2567/colyseus` 查看房间状态（需要 `@colyseus/monitor` 依赖）。

## 📊 游戏循环

- **Tick Rate**: 20Hz (50ms 间隔)
- **权威模式**: 服务端计算所有游戏逻辑
- **同步方式**: Colyseus Schema 自动二进制差分同步
- **最大玩家**: 4 人/房间

## 🎯 难度缩放公式

```
multiplier = baseMultiplier + (playerCount - 1) × perPlayerAdd

默认：1.0 + (n-1) × 0.5
  1人 = 1.0x
  2人 = 1.5x
  3人 = 2.0x
  4人 = 2.5x
```

影响字段：怪物 HP、怪物数量、Boss HP。
