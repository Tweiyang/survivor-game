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
exports.MonsterState = void 0;
/**
 * MonsterState Schema
 * Unity equivalent: NetworkVariable<MonsterData> on NetworkObject
 */
const schema_1 = require("@colyseus/schema");
class MonsterState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** 服务器分配的唯一 ID */
        this.id = '';
        /** 怪物类型: slime / bat / skeleton / boss_golem 等 */
        this.monsterType = 'slime';
        /** 位置（服务器权威） */
        this.x = 0;
        this.y = 0;
        /** 生命值 */
        this.hp = 30;
        this.maxHp = 30;
        /** 存活状态 */
        this.alive = true;
    }
}
exports.MonsterState = MonsterState;
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], MonsterState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], MonsterState.prototype, "monsterType", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], MonsterState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], MonsterState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)('int16'),
    __metadata("design:type", Number)
], MonsterState.prototype, "hp", void 0);
__decorate([
    (0, schema_1.type)('int16'),
    __metadata("design:type", Number)
], MonsterState.prototype, "maxHp", void 0);
__decorate([
    (0, schema_1.type)('boolean'),
    __metadata("design:type", Boolean)
], MonsterState.prototype, "alive", void 0);
//# sourceMappingURL=MonsterState.js.map