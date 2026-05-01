import { Entity } from '../core/Entity.js';
import { SpriteRenderer } from '../components/SpriteRenderer.js';
import { ColliderComponent } from '../components/ColliderComponent.js';
import { RigidbodyComponent } from '../components/RigidbodyComponent.js';
import { HealthComponent } from '../components/HealthComponent.js';
import { CombatComponent } from '../components/CombatComponent.js';
import { SkillComponent } from '../components/SkillComponent.js';
import { ActiveSkillComponent } from '../components/ActiveSkillComponent.js';
import { Component } from '../core/Component.js';

/**
 * PlayerController — 玩家移动控制组件
 * Unity equivalent: public class PlayerController : MonoBehaviour
 */
export class PlayerController extends Component {
    constructor(config = {}) {
        super(config);
        this.moveSpeed = config.moveSpeed || 150;
        this.tilemapData = config.tilemapData || null;
        this.inputManager = config.inputManager || null;
    }

    update(deltaTime) {
        const input = this.inputManager;
        if (!input) return;

        // P4: 通过 action 抽象层触发主动技能（Unity: InputAction）
        if (input.getActionDown && input.getActionDown('activeSkill')) {
            for (const comp of this.entity._components) {
                if (comp.constructor.name === 'ActiveSkillComponent') {
                    comp.tryActivate();
                    break;
                }
            }
        }

        // P5: 在线模式下移动由 PredictionSystem 接管，此处跳过
        if (this._networkMode) return;

        const moveX = input.getAxis('horizontal');
        const moveY = input.getAxis('vertical');
        if (moveX === 0 && moveY === 0) return;

        const transform = this.entity.transform;
        // P2: 移速受 modifier 加成影响
        const combat = this.entity.getComponent(CombatComponent);
        const finalSpeed = combat && typeof combat.getFinalMoveSpeed === 'function'
            ? combat.getFinalMoveSpeed(this.moveSpeed)
            : this.moveSpeed;

        const newX = transform.position.x + moveX * finalSpeed * deltaTime;
        const newY = transform.position.y + moveY * finalSpeed * deltaTime;
        // 碰撞体半径 = 角色视觉尺寸的 40%，避免卡墙
        const sprite = this.entity.getComponent ? this.entity.getComponent(SpriteRenderer) : null;
        const visualSize = sprite ? Math.max(sprite.width, sprite.height) : 24;
        const halfSize = Math.floor(visualSize * 0.4);

        if (this.tilemapData) {
            let canMoveX = true, canMoveY = true;

            if (moveX !== 0) {
                canMoveX = this.tilemapData.isWalkable(newX - halfSize, transform.position.y - halfSize) &&
                           this.tilemapData.isWalkable(newX + halfSize, transform.position.y - halfSize) &&
                           this.tilemapData.isWalkable(newX - halfSize, transform.position.y + halfSize) &&
                           this.tilemapData.isWalkable(newX + halfSize, transform.position.y + halfSize);
            }
            if (moveY !== 0) {
                canMoveY = this.tilemapData.isWalkable(transform.position.x - halfSize, newY - halfSize) &&
                           this.tilemapData.isWalkable(transform.position.x + halfSize, newY - halfSize) &&
                           this.tilemapData.isWalkable(transform.position.x - halfSize, newY + halfSize) &&
                           this.tilemapData.isWalkable(transform.position.x + halfSize, newY + halfSize);
            }

            if (canMoveX) transform.position.x = newX;
            if (canMoveY) transform.position.y = newY;
        } else {
            transform.position.x = newX;
            transform.position.y = newY;
        }
    }
}

/**
 * PlayerFactory — 玩家实体工厂
 * Unity equivalent: Factory + CharacterScriptableObject
 * [Network] 支持通过回调创建远程玩家实体，不硬编码单个玩家
 *
 * P3: 支持按 characterId 从 characters.json 加载不同角色配置
 */
export class PlayerFactory {
    /**
     * @param {object} systems — 游戏系统引用
     * @param {object} playerConfig — player.json 默认配置（fallback）
     * @param {object} [charactersConfig] — characters.json 全部角色配置
     */
    constructor(systems, playerConfig, charactersConfig) {
        this.systems = systems;
        this.config = playerConfig;
        this.charactersConfig = charactersConfig || null;
    }

    /**
     * @param {object} params
     * @param {{x:number,y:number}} params.position
     * @param {string} [params.characterId] — P3: 角色 ID
     * @param {string} [params.playerId] — 联机时的玩家 ID
     */
    create(params) {
        // P3: 按 characterId 获取角色配置，fallback 到 player.json
        const charConfig = this._getCharacterConfig(params.characterId);
        const stats = charConfig.stats || this.config;

        const entity = new Entity(charConfig.name || 'Player', 'player');
        entity.transform.setPosition(params.position.x, params.position.y);

        // [Network] 联机时通过 playerId 区分本地/远程玩家
        if (params.playerId) {
            entity.ownerId = params.playerId;
        }

        // 外观（P3: 从角色配置读取颜色/形状/尺寸）
        const size = charConfig.size || 28;
        const shapeMap = { 'circle': 'circle', 'square': 'rect', 'triangle': 'triangle' };
        entity.addComponent(new SpriteRenderer({
            width: size, height: size,
            color: charConfig.color || '#4488FF',
            shape: shapeMap[charConfig.shape] || 'rect',
            sortingLayer: 2,
            strokeColor: this._darkenColor(charConfig.color || '#4488FF'),
            strokeWidth: 2
        }));

        entity.addComponent(new ColliderComponent({
            type: 'aabb', width: size - 4, height: size - 4, layer: 'player'
        }));

        entity.addComponent(new RigidbodyComponent({
            maxSpeed: 200, isKinematic: false
        }));

        entity.addComponent(new HealthComponent({
            maxHp: stats.maxHp,
            eventSystem: this.systems.eventSystem,
            entityManager: this.systems.entityManager
        }));

        entity.addComponent(new CombatComponent({
            attack: stats.attack,
            defense: stats.defense,
            critRate: stats.critRate,
            critMultiplier: stats.critMultiplier,
            attackSpeed: stats.attackSpeed,
            attackRange: stats.attackRange,
            projectileSpeed: stats.projectileSpeed,
            faction: 'player'
        }));

        // P3: 移除 AutoAttackComponent，改由初始武器替代
        entity.addComponent(new PlayerController({
            moveSpeed: stats.moveSpeed,
            tilemapData: this.systems.tilemapData,
            inputManager: this.systems.inputManager
        }));

        // P2/P3: 挂载 SkillComponent 并添加初始武器
        const skillSystems = {
            physicsSystem: this.systems.physicsSystem,
            projectileFactory: this.systems.projectileFactory,
            combatSystem: this.systems.combatSystem,
            entityManager: this.systems.entityManager,
            eventSystem: this.systems.eventSystem
        };
        const skillComponent = new SkillComponent({
            skillPool: this.systems.skillPool || {},
            systems: skillSystems
        });
        entity.addComponent(skillComponent);

        // P3: 通过 SkillComponent 添加角色初始武器
        if (charConfig.initialWeapon) {
            skillComponent.addSkill(charConfig.initialWeapon);
        }

        // P3: 挂载 ActiveSkillComponent（主动技能）
        if (charConfig.activeSkill && charConfig.activeSkillConfig) {
            const asc = charConfig.activeSkillConfig;
            entity.addComponent(new ActiveSkillComponent({
                skillId: charConfig.activeSkill,
                name: asc.name || charConfig.activeSkill,
                icon: asc.icon || '?',
                cooldown: asc.cooldown || 10,
                skillConfig: asc,
                systems: skillSystems
            }));
        }

        this.systems.entityManager.add(entity);
        console.log(`[PlayerFactory] Created ${charConfig.name || 'Player'} (${params.characterId || 'default'})`);
        return entity;
    }

    /**
     * 获取角色配置
     * @private
     * @param {string} [characterId]
     * @returns {object} 角色配置对象
     */
    _getCharacterConfig(characterId) {
        if (this.charactersConfig && characterId && this.charactersConfig[characterId]) {
            return this.charactersConfig[characterId];
        }
        // fallback: 如果有 characters.json 则取第一个角色
        if (this.charactersConfig) {
            const firstKey = Object.keys(this.charactersConfig)[0];
            if (firstKey) return this.charactersConfig[firstKey];
        }
        // 最终 fallback: 用 player.json 的平坦结构包装
        return { stats: this.config, color: '#4488FF', shape: 'square', size: 28 };
    }

    /**
     * 简单的颜色加深（用于描边）
     * @private
     * @param {string} hex
     * @returns {string}
     */
    _darkenColor(hex) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, ((num >> 16) & 0xFF) - 40);
        const g = Math.max(0, ((num >> 8) & 0xFF) - 40);
        const b = Math.max(0, (num & 0xFF) - 40);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
}
