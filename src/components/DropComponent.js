import { Component } from '../core/Component.js';

/**
 * DropComponent — 掉落物行为组件（经验球等）
 * Unity equivalent: 掉落物拾取脚本
 */
export class DropComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.dropType = config.dropType || 'exp';
        this.value = config.value || 5;
        this.pickupRange = config.pickupRange || 80;
        this.magnetSpeed = config.magnetSpeed || 300;
        this.isBeingMagnetized = false;

        this.entityManager = config.entityManager || null;
        this.eventSystem = config.eventSystem || null;
    }

    update(deltaTime) {
        if (!this.entityManager) return;

        const player = this.entityManager.findByTag('player');
        if (!player || !player.active) return;

        const pos = this.entity.transform.position;
        const ppos = player.transform.position;
        const dx = ppos.x - pos.x;
        const dy = ppos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 磁吸触发
        if (dist < this.pickupRange) {
            this.isBeingMagnetized = true;
        }

        // 磁吸飞行
        if (this.isBeingMagnetized && dist > 5) {
            const speed = this.magnetSpeed * deltaTime;
            const nx = dx / dist;
            const ny = dy / dist;
            pos.x += nx * speed;
            pos.y += ny * speed;
        }

        // 拾取判定
        if (dist < 10) {
            if (this.eventSystem) {
                this.eventSystem.emit('onPickup', {
                    dropType: this.dropType,
                    value: this.value,
                    entity: this.entity
                });
            }
            if (this.entityManager) {
                this.entityManager.remove(this.entity);
            }
        }
    }
}
