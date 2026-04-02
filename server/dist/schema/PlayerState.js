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
exports.PlayerState = exports.SkillEntry = void 0;
/**
 * PlayerState Schema
 * Unity equivalent: NetworkVariable<PlayerData> on NetworkObject
 *
 * 服务器权威的玩家状态，自动增量同步到所有客户端
 */
const schema_1 = require("@colyseus/schema");
class SkillEntry extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.skillId = '';
        this.level = 0;
    }
}
exports.SkillEntry = SkillEntry;
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], SkillEntry.prototype, "skillId", void 0);
__decorate([
    (0, schema_1.type)('uint8'),
    __metadata("design:type", Number)
], SkillEntry.prototype, "level", void 0);
class PlayerState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** Colyseus session ID */
        this.sessionId = '';
        /** 角色 ID: warrior / mage / ranger */
        this.characterId = 'warrior';
        /** 位置（服务器权威） */
        this.x = 0;
        this.y = 0;
        /** 生命值 */
        this.hp = 100;
        this.maxHp = 100;
        /** 经验和等级（各自独立） */
        this.level = 1;
        this.exp = 0;
        /** 个人击杀数 */
        this.kills = 0;
        /** 存活状态 */
        this.alive = true;
        /** 准备状态（大厅用） */
        this.ready = false;
        /** 最后处理的输入序号（用于客户端 Reconciliation） */
        this.inputSeq = 0;
        /** 移动速度（从角色配置读取） */
        this.moveSpeed = 120;
        /** 已获得技能列表 */
        this.skills = new schema_1.ArraySchema();
    }
}
exports.PlayerState = PlayerState;
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], PlayerState.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], PlayerState.prototype, "characterId", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], PlayerState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], PlayerState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)('int16'),
    __metadata("design:type", Number)
], PlayerState.prototype, "hp", void 0);
__decorate([
    (0, schema_1.type)('int16'),
    __metadata("design:type", Number)
], PlayerState.prototype, "maxHp", void 0);
__decorate([
    (0, schema_1.type)('uint8'),
    __metadata("design:type", Number)
], PlayerState.prototype, "level", void 0);
__decorate([
    (0, schema_1.type)('uint32'),
    __metadata("design:type", Number)
], PlayerState.prototype, "exp", void 0);
__decorate([
    (0, schema_1.type)('uint16'),
    __metadata("design:type", Number)
], PlayerState.prototype, "kills", void 0);
__decorate([
    (0, schema_1.type)('boolean'),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "alive", void 0);
__decorate([
    (0, schema_1.type)('boolean'),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "ready", void 0);
__decorate([
    (0, schema_1.type)('uint32'),
    __metadata("design:type", Number)
], PlayerState.prototype, "inputSeq", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], PlayerState.prototype, "moveSpeed", void 0);
__decorate([
    (0, schema_1.type)([SkillEntry]),
    __metadata("design:type", Object)
], PlayerState.prototype, "skills", void 0);
//# sourceMappingURL=PlayerState.js.map