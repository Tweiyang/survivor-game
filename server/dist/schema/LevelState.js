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
exports.LevelState = void 0;
/**
 * LevelState Schema
 * Unity equivalent: NetworkVariable<LevelData> on GameManager
 */
const schema_1 = require("@colyseus/schema");
class LevelState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** 当前关卡编号 */
        this.currentLevel = 1;
        /** 全队击杀总数（用于开门判定） */
        this.totalKills = 0;
        /** Boss 门是否已开启 */
        this.bossGateOpen = false;
        /** Boss 是否存活 */
        this.bossAlive = false;
        /** 游戏阶段: waiting / battle / boss / complete / gameover */
        this.phase = 'waiting';
        /** 当前波次 */
        this.currentWave = 0;
        /** 开门所需击杀数 */
        this.killsToOpenBoss = 5;
    }
}
exports.LevelState = LevelState;
__decorate([
    (0, schema_1.type)('uint8'),
    __metadata("design:type", Number)
], LevelState.prototype, "currentLevel", void 0);
__decorate([
    (0, schema_1.type)('uint16'),
    __metadata("design:type", Number)
], LevelState.prototype, "totalKills", void 0);
__decorate([
    (0, schema_1.type)('boolean'),
    __metadata("design:type", Boolean)
], LevelState.prototype, "bossGateOpen", void 0);
__decorate([
    (0, schema_1.type)('boolean'),
    __metadata("design:type", Boolean)
], LevelState.prototype, "bossAlive", void 0);
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], LevelState.prototype, "phase", void 0);
__decorate([
    (0, schema_1.type)('uint8'),
    __metadata("design:type", Number)
], LevelState.prototype, "currentWave", void 0);
__decorate([
    (0, schema_1.type)('uint16'),
    __metadata("design:type", Number)
], LevelState.prototype, "killsToOpenBoss", void 0);
//# sourceMappingURL=LevelState.js.map