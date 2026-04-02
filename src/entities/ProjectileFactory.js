import { Entity } from '../core/Entity.js';
import { SpriteRenderer } from '../components/SpriteRenderer.js';
import { ProjectileComponent } from '../components/ProjectileComponent.js';

/**
 * ProjectileFactory — 投射物实体工厂
 * [Network] 投射物创建应由 Host 权威，Client 做预测
 */
export class ProjectileFactory {
    constructor(systems) {
        this.systems = systems;
    }

    /**
     * @param {object} config
     * @param {Entity} config.owner - 发射者
     * @param {{x:number,y:number}} config.position
     * @param {{x:number,y:number}} config.direction
     * @param {number} config.speed
     * @param {number} config.damage
     * @param {string} config.faction
     * @param {string} [config.color='#FFDD44']
     * @param {number} [config.size=6]
     */
    create(config) {
        const entity = new Entity('Projectile', 'projectile');
        entity.transform.setPosition(config.position.x, config.position.y);

        entity.addComponent(new SpriteRenderer({
            width: config.size || 6,
            height: config.size || 6,
            color: config.color || '#FFDD44',
            shape: 'circle',
            sortingLayer: 3 // 空中层
        }));

        entity.addComponent(new ProjectileComponent({
            direction: config.direction,
            speed: config.speed,
            damage: config.damage,
            faction: config.faction,
            owner: config.owner,
            combatSystem: this.systems.combatSystem,
            entityManager: this.systems.entityManager,
            tilemapData: this.systems.tilemapData
        }));

        this.systems.entityManager.add(entity);
        return entity;
    }
}
