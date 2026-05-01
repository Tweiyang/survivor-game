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
exports.ProjectileState = void 0;
/**
 * ProjectileState Schema
 * Unity equivalent: NetworkVariable<ProjectileData> on NetworkObject
 */
const schema_1 = require("@colyseus/schema");
class ProjectileState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** 服务器分配的唯一 ID */
        this.id = '';
        /** 发射者 sessionId */
        this.ownerId = '';
        /** 位置 */
        this.x = 0;
        this.y = 0;
        /** 方向 (归一化) */
        this.dx = 0;
        this.dy = 0;
        /** 速度（像素/秒） */
        this.speed = 300;
        /** 伤害 */
        this.damage = 10;
        /** 存活状态 */
        this.alive = true;
    }
}
exports.ProjectileState = ProjectileState;
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], ProjectileState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], ProjectileState.prototype, "ownerId", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], ProjectileState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], ProjectileState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], ProjectileState.prototype, "dx", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], ProjectileState.prototype, "dy", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], ProjectileState.prototype, "speed", void 0);
__decorate([
    (0, schema_1.type)('int16'),
    __metadata("design:type", Number)
], ProjectileState.prototype, "damage", void 0);
__decorate([
    (0, schema_1.type)('boolean'),
    __metadata("design:type", Boolean)
], ProjectileState.prototype, "alive", void 0);
//# sourceMappingURL=ProjectileState.js.map