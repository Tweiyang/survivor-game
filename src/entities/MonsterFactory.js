import { Entity } from '../core/Entity.js';
import { SpriteRenderer } from '../components/SpriteRenderer.js';
import { ColliderComponent } from '../components/ColliderComponent.js';
import { RigidbodyComponent } from '../components/RigidbodyComponent.js';
import { HealthComponent } from '../components/HealthComponent.js';
import { CombatComponent } from '../components/CombatComponent.js';
import { ChaseAI } from '../ai/ChaseAI.js';

/**
 * MonsterFactory — 怪物实体工厂
 * [Network] 怪物生成应由 Host 决定，广播给 Client
 */
export class MonsterFactory {
    constructor(systems, monsterConfigs) {
        this.systems = systems;
        /** @type {object} monsters.json 数据 */
        this.configs = monsterConfigs;
    }

    /**
     * @param {object} params
     * @param {string} params.type - 怪物类型（如 'slime'）
     * @param {{x:number,y:number}} params.position
     * @param {boolean} [params.isBoss=false] - 是否为 Boss
     */
    create(params) {
        const cfg = this.configs[params.type];
        if (!cfg) {
            console.error(`[MonsterFactory] Unknown type: ${params.type}`);
            return null;
        }

        const isBoss = params.isBoss || false;
        const tag = isBoss ? 'boss' : 'enemy';
        const sizeMultiplier = isBoss ? 1.8 : 1;

        const entity = new Entity(cfg.name || params.type, tag);
        entity.transform.setPosition(params.position.x, params.position.y);

        const displaySize = Math.round(cfg.size * sizeMultiplier);

        entity.addComponent(new SpriteRenderer({
            width: displaySize,
            height: displaySize,
            color: cfg.color,
            shape: cfg.shape || 'circle',
            sortingLayer: 2,
            strokeColor: isBoss ? '#FF0000' : '#000000',
            strokeWidth: isBoss ? 3 : 1
        }));

        entity.addComponent(new ColliderComponent({
            type: 'circle',
            radius: displaySize / 2,
            layer: 'enemy'
        }));

        entity.addComponent(new RigidbodyComponent({ isKinematic: false }));

        entity.addComponent(new HealthComponent({
            maxHp: cfg.maxHp,
            eventSystem: this.systems.eventSystem,
            entityManager: this.systems.entityManager
        }));

        entity.addComponent(new CombatComponent({
            attack: cfg.attack,
            defense: cfg.defense || 0,
            faction: 'enemy',
            attackRange: cfg.attackRange,
            attackSpeed: cfg.attackCooldown
        }));

        entity.addComponent(new ChaseAI({
            moveSpeed: cfg.moveSpeed,
            detectionRange: cfg.detectionRange,
            attackRange: cfg.attackRange,
            attackCooldown: cfg.attackCooldown,
            entityManager: this.systems.entityManager,
            combatSystem: this.systems.combatSystem,
            tilemapData: this.systems.tilemapData
        }));

        // 记录经验值（死亡掉落用）
        entity._expValue = cfg.expValue || 10;

        this.systems.entityManager.add(entity);
        return entity;
    }
}
