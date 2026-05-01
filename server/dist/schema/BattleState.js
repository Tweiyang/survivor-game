"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleRoomState = void 0;
/**
 * BattleRoomState — 房间顶层状态 Schema
 * Unity equivalent: NetworkManager + GameState NetworkVariable
 *
 * 包含所有需要同步到客户端的游戏状态
 * Colyseus 自动计算并发送 delta patch
 */
const schema_1 = require("@colyseus/schema");
const PlayerState_1 = require("./PlayerState");
const MonsterState_1 = require("./MonsterState");
const ProjectileState_1 = require("./ProjectileState");
const DropState_1 = require("./DropState");
const LevelState_1 = require("./LevelState");
class BattleRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** 所有玩家状态，以 sessionId 为 key */
        this.players = new schema_1.MapSchema();
        /** 所有怪物状态，以服务器自增 ID 为 key */
        this.monsters = new schema_1.MapSchema();
        /** 所有投射物状态 */
        this.projectiles = new schema_1.MapSchema();
        /** 所有掉落物状态 */
        this.drops = new schema_1.MapSchema();
        /** 关卡进度状态 */
        this.levelState = new LevelState_1.LevelState();
    }
}
exports.BattleRoomState = BattleRoomState;
__decorate([
    (0, schema_1.type)({ map: PlayerState_1.PlayerState }),
    __metadata("design:type", Object)
], BattleRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: MonsterState_1.MonsterState }),
    __metadata("design:type", Object)
], BattleRoomState.prototype, "monsters", void 0);
__decorate([
    (0, schema_1.type)({ map: ProjectileState_1.ProjectileState }),
    __metadata("design:type", Object)
], BattleRoomState.prototype, "projectiles", void 0);
__decorate([
    (0, schema_1.type)({ map: DropState_1.DropState }),
    __metadata("design:type", Object)
], BattleRoomState.prototype, "drops", void 0);
__decorate([
    (0, schema_1.type)(LevelState_1.LevelState),
    __metadata("design:type", Object)
], BattleRoomState.prototype, "levelState", void 0);
//# sourceMappingURL=BattleState.js.map