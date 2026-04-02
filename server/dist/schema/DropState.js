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
exports.DropState = void 0;
/**
 * DropState Schema
 * Unity equivalent: NetworkVariable<DropData> on NetworkObject
 */
const schema_1 = require("@colyseus/schema");
class DropState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        /** 服务器分配的唯一 ID */
        this.id = '';
        /** 掉落物类型: exp_orb / health_orb */
        this.dropType = 'exp_orb';
        /** 位置 */
        this.x = 0;
        this.y = 0;
        /** 经验值（exp_orb 用） */
        this.value = 10;
        /** 是否已被拾取 */
        this.collected = false;
    }
}
exports.DropState = DropState;
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], DropState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)('string'),
    __metadata("design:type", String)
], DropState.prototype, "dropType", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], DropState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)('float32'),
    __metadata("design:type", Number)
], DropState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)('uint16'),
    __metadata("design:type", Number)
], DropState.prototype, "value", void 0);
__decorate([
    (0, schema_1.type)('boolean'),
    __metadata("design:type", Boolean)
], DropState.prototype, "collected", void 0);
//# sourceMappingURL=DropState.js.map