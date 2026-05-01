import { Entity } from '../core/Entity.js';
import { SpriteRenderer } from '../components/SpriteRenderer.js';
import { DropComponent } from '../components/DropComponent.js';

/**
 * DropItemFactory — 掉落物实体工厂
 */
export class DropItemFactory {
    constructor(systems) {
        this.systems = systems;
    }

    /**
     * 生成经验球掉落
     * @param {object} config
     * @param {{x:number,y:number}} config.position
     * @param {number} config.expValue - 总经验值
     * @param {number} [config.expPerBall=5] - 每球经验
     */
    spawnDrops(config) {
        const expPerBall = config.expPerBall || 5;
        let count = Math.ceil(config.expValue / expPerBall);
        count = Math.min(count, 5); // 上限 5 个

        // 场上经验球过多时直接加经验
        const existingDrops = this.systems.entityManager.findAllByTag('drop');
        if (existingDrops.length >= 50) {
            this.systems.eventSystem.emit('onPickup', {
                dropType: 'exp',
                value: config.expValue,
                entity: null
            });
            return;
        }

        for (let i = 0; i < count; i++) {
            const entity = new Entity('ExpBall', 'drop');

            // 从死亡位置随机散开
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 30;
            entity.transform.setPosition(
                config.position.x + offsetX,
                config.position.y + offsetY
            );

            entity.addComponent(new SpriteRenderer({
                width: 8, height: 8,
                color: '#44FF88',
                shape: 'circle',
                sortingLayer: 1,
                opacity: 0.9
            }));

            entity.addComponent(new DropComponent({
                dropType: 'exp',
                value: expPerBall,
                entityManager: this.systems.entityManager,
                eventSystem: this.systems.eventSystem
            }));

            this.systems.entityManager.add(entity);
        }
    }
}
