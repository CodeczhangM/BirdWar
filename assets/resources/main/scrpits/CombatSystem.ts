import { _decorator, PhysicsSystem2D, Component, BoxCollider2D, Collider2D, Contact2DType, IPhysics2DContact, Node, Enum, Graphics, Color, UITransform, Vec3 } from 'cc';
import { Log } from './Logger';
import { EntityRegistry } from './EntityRegistry';

const { ccclass, property, executionOrder } = _decorator;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function hasFlag(mask: number, flag: number): boolean {
    Log.warn("test", `mask ${mask} flag ${flag}`);
    return (mask & flag) !== 0;
}

function removeCallback<T>(list: T[], callback: T) {
    const index = list.indexOf(callback);
    if (index >= 0) {
        list.splice(index, 1);
    }
}

// ========== 枚举定义 ==========

/** 实体类型 */
export enum EntityType {
    NONE = 0,
    PLAYER = 1 << 0,
    ENEMY = 1 << 1,
    BULLET = 1 << 2,
    REWARD = 1 << 3,
    BUFF = 1 << 4,
    DEBUFF = 1 << 5,
    NEUTRAL = 1 << 6,
    OBSTACLE = 1 << 7,
    WEAPON = 1 << 8
}

/** 阵营 */
export enum Faction {
    NONE = 0,
    PLAYER = 1,
    ENEMY = 2,
    NEUTRAL = 3
}

/** 伤害类型 */
export enum DamageType {
    PHYSICAL = 'physical',
    MAGICAL = 'magical',
    TRUE = 'true',
    HEAL = 'heal'
}

/** 状态效果类型 */
export enum StatusEffectType {
    NONE = 'none',
    BURN = 'burn',
    POISON = 'poison',
    STUN = 'stun',
    SLOW = 'slow',
    REGEN = 'regen',
    CUSTOM = 'custom'
}

// ========== 接口定义 ==========

/** 击退配置 */
export interface KnockbackConfig {
    /** 击退方向。为空时自动根据 source -> target 的方向推算 */
    direction?: Vec3;
    /** 击退距离 */
    distance?: number;
}

/** 状态效果配置 */
export interface CombatStatusEffect {
    /** 唯一标识，不填则使用 type */
    id?: string;
    /** 状态类型 */
    type: StatusEffectType | string;
    /** 持续时间（秒） */
    duration: number;
    /** 周期触发间隔（秒） */
    interval?: number;
    /** 强度。燃烧/中毒表示每跳伤害，减速表示 0-1 的倍率 */
    magnitude?: number;
    /** 最大层数 */
    maxStacks?: number;
    /** 效果来源 */
    source?: CombatEntity | null;
    /** 周期触发的伤害类型 */
    tickDamageType?: DamageType;
    /** 标签 */
    tags?: string[];
    /** 自定义负载 */
    payload?: { [key: string]: any };
}

/** 运行中的状态效果 */
export interface ActiveStatusEffect extends CombatStatusEffect {
    id: string;
    elapsed: number;
    nextTick: number;
    stacks: number;
}

/** 伤害信息 */
export interface DamageInfo {
    /** 原始伤害值 */
    amount: number;
    /** 伤害类型 */
    type: DamageType;
    /** 伤害来源 */
    source?: CombatEntity | null;
    /** 是否暴击 */
    isCritical?: boolean;
    /** 命中附带的状态效果 */
    effects?: CombatStatusEffect[];
    /** 是否忽略防御 */
    ignoreDefense?: boolean;
    /** 是否绕过护盾 */
    bypassShield?: boolean;
    /** 是否允许造成死亡 */
    canTriggerDeath?: boolean;
    /** 额外伤害倍率 */
    multiplier?: number;
    /** 命中标签 */
    tags?: string[];
    /** 击退配置 */
    knockback?: KnockbackConfig;
}

/** 伤害结果 */
export interface DamageResult {
    /** 原始输入值 */
    originalAmount: number;
    /** 实际扣除生命值 */
    finalAmount: number;
    /** 被护盾吸收的值 */
    absorbedByShield: number;
    /** 实际治疗量 */
    healedAmount: number;
    /** 是否被完全阻挡 */
    wasBlocked: boolean;
    /** 是否暴击 */
    isCritical: boolean;
    /** 目标当前生命 */
    targetHealth: number;
    /** 目标当前护盾 */
    targetShield: number;
    /** 伤害/治疗来源 */
    source: CombatEntity | null;
    /** 类型 */
    type: DamageType;
}

/** 碰撞规则配置 */
export interface CollisionRule {
    /** 可以碰撞的实体类型（位掩码） */
    canCollideWith: number;
    /** 可以造成伤害的实体类型（位掩码） */
    canDamage: number;
    /** 可以被伤害的实体类型（位掩码） */
    canBeDamagedBy: number;
}

/** 战斗统计 */
export interface CombatStats {
    hits: number;
    damageDealt: number;
    damageTaken: number;
    shieldDamageDealt: number;
    shieldDamageTaken: number;
    healingDone: number;
    healingReceived: number;
    kills: number;
    deaths: number;
    collections: number;
    statusApplied: number;
}

export type StatusEffectAction = 'applied' | 'refreshed' | 'removed' | 'tick';

/** 战斗事件回调 */
export type OnDamageCallback = (damage: DamageInfo, target: CombatEntity, result: DamageResult) => void;
export type OnHitCallback = (target: CombatEntity) => void;
export type OnDeathCallback = (killer: CombatEntity | null) => void;
export type OnCollectCallback = (collector: CombatEntity) => void;
export type OnHealCallback = (requestedAmount: number, source: CombatEntity | null, actualAmount: number) => void;
export type OnShieldChangeCallback = (currentShield: number, delta: number) => void;
export type OnStatusEffectCallback = (effect: ActiveStatusEffect, action: StatusEffectAction) => void;

export type OnContactCallback = (weapon: CombatEntity) => void;

function createDefaultStats(): CombatStats {
    return {
        hits: 0,
        damageDealt: 0,
        damageTaken: 0,
        shieldDamageDealt: 0,
        shieldDamageTaken: 0,
        healingDone: 0,
        healingReceived: 0,
        kills: 0,
        deaths: 0,
        collections: 0,
        statusApplied: 0
    };
}

function cloneStatusEffect(effect: CombatStatusEffect): CombatStatusEffect {
    return {
        ...effect,
        source: effect.source ?? null,
        tags: effect.tags ? [...effect.tags] : undefined,
        payload: effect.payload ? { ...effect.payload } : undefined
    };
}

function cloneActiveStatusEffect(effect: ActiveStatusEffect): ActiveStatusEffect {
    return {
        ...effect,
        source: effect.source ?? null,
        tags: effect.tags ? [...effect.tags] : undefined,
        payload: effect.payload ? { ...effect.payload } : undefined
    };
}

function cloneDamageInfo(damage: DamageInfo): DamageInfo {
    return {
        ...damage,
        source: damage.source ?? null,
        tags: damage.tags ? [...damage.tags] : undefined,
        knockback: damage.knockback ? {
            ...damage.knockback,
            direction: damage.knockback.direction ? damage.knockback.direction.clone() : undefined
        } : undefined,
        effects: damage.effects ? damage.effects.map(effect => cloneStatusEffect(effect)) : undefined
    };
}

// ========== 预设碰撞规则 ==========

/** 预设碰撞规则 */
export class CollisionRules {
    /** 玩家规则 */
    static readonly PLAYER: CollisionRule = {
        canCollideWith: EntityType.ENEMY | EntityType.BULLET | EntityType.REWARD | EntityType.BUFF | EntityType.DEBUFF | EntityType.OBSTACLE,
        canDamage: EntityType.ENEMY,
        canBeDamagedBy: EntityType.ENEMY | EntityType.BULLET
    };

    /** 敌人规则 */
    static readonly ENEMY: CollisionRule = {
        canCollideWith: EntityType.PLAYER | EntityType.BULLET | EntityType.OBSTACLE,
        canDamage: EntityType.PLAYER,
        canBeDamagedBy: EntityType.PLAYER | EntityType.BULLET
    };

    /** 玩家子弹规则 */
    static readonly PLAYER_BULLET: CollisionRule = {
        canCollideWith: EntityType.ENEMY | EntityType.OBSTACLE,
        canDamage: EntityType.ENEMY,
        canBeDamagedBy: 0
    };

    /** 敌人子弹规则 */
    static readonly ENEMY_BULLET: CollisionRule = {
        canCollideWith: EntityType.PLAYER | EntityType.OBSTACLE,
        canDamage: EntityType.PLAYER,
        canBeDamagedBy: 0
    };

    /** 奖励规则 */
    static readonly REWARD: CollisionRule = {
        canCollideWith: EntityType.PLAYER,
        canDamage: 0,
        canBeDamagedBy: 0
    };

    /** 增益规则 */
    static readonly BUFF: CollisionRule = {
        canCollideWith: EntityType.PLAYER,
        canDamage: 0,
        canBeDamagedBy: 0
    };

    /** 减益规则 */
    static readonly DEBUFF: CollisionRule = {
        canCollideWith: EntityType.PLAYER | EntityType.ENEMY,
        canDamage: 0,
        canBeDamagedBy: 0
    };

    /** 中立实体规则 */
    static readonly NEUTRAL: CollisionRule = {
        canCollideWith: EntityType.PLAYER | EntityType.ENEMY | EntityType.BULLET | EntityType.OBSTACLE,
        canDamage: 0,
        canBeDamagedBy: 0
    };

    /** 障碍物规则 */
    static readonly OBSTACLE: CollisionRule = {
        canCollideWith: EntityType.PLAYER | EntityType.ENEMY | EntityType.BULLET,
        canDamage: 0,
        canBeDamagedBy: 0
    };

    /** 武器规则：可碰撞敌人/玩家，不能被攻击，不主动造成伤害（由持有者逻辑决定） */
    static readonly WEAPON: CollisionRule = {
        canCollideWith: EntityType.PLAYER | EntityType.ENEMY,
        canDamage: 0,
        canBeDamagedBy: 0
    };

    /** 根据实体类型和阵营获取预设规则 */
    static getRule(entityType: EntityType, faction: Faction): CollisionRule {
        switch (entityType) {
            case EntityType.PLAYER:
                return this.PLAYER;
            case EntityType.ENEMY:
                return this.ENEMY;
            case EntityType.BULLET:
                return faction === Faction.PLAYER ? this.PLAYER_BULLET : this.ENEMY_BULLET;
            case EntityType.REWARD:
                return this.REWARD;
            case EntityType.BUFF:
                return this.BUFF;
            case EntityType.DEBUFF:
                return this.DEBUFF;
            case EntityType.NEUTRAL:
                return this.NEUTRAL;
            case EntityType.OBSTACLE:
                return this.OBSTACLE;
            case EntityType.WEAPON:
                return this.WEAPON;
            default:
                return { canCollideWith: 0, canDamage: 0, canBeDamagedBy: 0 };
        }
    }
}

// ========== 战斗实体组件 ==========

/**
 * 战斗实体组件
 * 挂载到任何需要参与战斗系统的节点上
 */
@ccclass('CombatEntity')
@executionOrder(12)
export class CombatEntity extends Component {

    // ---------- Inspector 属性 ----------

    @property({ type: Enum(EntityType), tooltip: '实体类型' })
    public entityType: EntityType = EntityType.NONE;

    @property({ type: Enum(Faction), tooltip: '所属阵营' })
    public faction: Faction = Faction.NEUTRAL;

    @property({ tooltip: '小队标识。相同 teamId 会视为友方' })
    public teamId: string = '';

    @property({ tooltip: '最大生命值' })
    public maxHealth: number = 100;

    @property({ tooltip: '当前生命值（留空则使用最大生命值）' })
    public currentHealth: number = 0;

    @property({ tooltip: '攻击力' })
    public attackPower: number = 10;

    @property({ tooltip: '防御力（仅物理伤害默认生效）' })
    public defense: number = 0;

    @property({ tooltip: '最大护盾值。0 表示不限制护盾上限' })
    public maxShield: number = 0;

    @property({ tooltip: '当前护盾值' })
    public currentShield: number = 0;

    @property({ tooltip: '物理抗性（0-1）' })
    public physicalResistance: number = 0;

    @property({ tooltip: '魔法抗性（0-1）' })
    public magicalResistance: number = 0;

    @property({ tooltip: '伤害输出倍率' })
    public outgoingDamageMultiplier: number = 1;

    @property({ tooltip: '承伤倍率' })
    public incomingDamageMultiplier: number = 1;

    @property({ tooltip: '暴击率（0-1）' })
    public criticalRate: number = 0;

    @property({ tooltip: '暴击伤害倍率' })
    public criticalMultiplier: number = 2;

    @property({ tooltip: '允许友方互相伤害' })
    public allowFriendlyFire: boolean = false;

    @property({ tooltip: '是否无敌' })
    public invincible: boolean = false;

    @property({ tooltip: '是否为武器（无法被攻击，碰撞时只触发对方的 onContact 事件）' })
    public isWeapon: boolean = false;

    @property({ tooltip: '命中后自动销毁（适合子弹）' })
    public destroyOnHit: boolean = false;

    @property({ tooltip: '死亡后自动销毁节点' })
    public autoDestroyOnDeath: boolean = true;

    @property({ tooltip: '死亡销毁延迟（秒）' })
    public destroyDelay: number = 2;

    @property({ tooltip: '使用自定义碰撞规则' })
    public useCustomRule: boolean = false;

    @property({ visible: function() { return this.useCustomRule; }, tooltip: '可碰撞类型（位掩码）' })
    public customCanCollideWith: number = 0;

    @property({ visible: function() { return this.useCustomRule; }, tooltip: '可伤害类型（位掩码）' })
    public customCanDamage: number = 0;

    @property({ visible: function() { return this.useCustomRule; }, tooltip: '可被伤害类型（位掩码）' })
    public customCanBeDamagedBy: number = 0;

    @property({ tooltip: '启用调试日志' })
    public enableDebugLog: boolean = true;

    @property({ tooltip: '启用碰撞区域调试绘制' })
    public enableDebugDraw: boolean = false;

    @property({ visible: function() { return this.enableDebugDraw; }, tooltip: '调试绘制颜色' })
    public debugDrawColor: Color = new Color(0, 255, 0, 128);

    @property({ visible: function() { return this.enableDebugDraw; }, tooltip: '调试绘制线宽' })
    public debugDrawLineWidth: number = 2;

    // ---------- 私有状态 ----------
    
    private readonly MODULE_NAME = 'CombatEntity';
    private _collider: BoxCollider2D = null;
    private _collisionRule: CollisionRule = null;
    private _isAlive: boolean = true;
    private _debugGraphics: Graphics = null;
    private _activeStatusEffects: ActiveStatusEffect[] = [];
    private _stats: CombatStats = createDefaultStats();

    // 事件回调
    private _onDamage: OnDamageCallback[] = [];
    private _onHit: OnHitCallback[] = [];
    private _onDeath: OnDeathCallback[] = [];
    private _onCollect: OnCollectCallback[] = [];
    private _onHeal: OnHealCallback[] = [];
    private _onShieldChange: OnShieldChangeCallback[] = [];
    private _onStatusEffect: OnStatusEffectCallback[] = [];
    private _onContact: OnContactCallback[] = [];

    // ========== 生命周期 ==========

    onLoad() {
        // PhysicsSystem2D.instance.enable = true;
        this.maxHealth = Math.max(1, this.maxHealth);
        this.currentHealth = this.currentHealth <= 0 ? this.maxHealth : Math.min(this.currentHealth, this.maxHealth);
        this.currentShield = Math.max(0, this.maxShield > 0 ? Math.min(this.currentShield, this.maxShield) : this.currentShield);
        this.physicalResistance = clamp01(this.physicalResistance);
        this.magicalResistance = clamp01(this.magicalResistance);
        this.outgoingDamageMultiplier = Math.max(0, this.outgoingDamageMultiplier);
        this.incomingDamageMultiplier = Math.max(0, this.incomingDamageMultiplier);
        this.criticalRate = clamp01(this.criticalRate);
        this.criticalMultiplier = Math.max(1, this.criticalMultiplier);
        this.destroyDelay = Math.max(0, this.destroyDelay);
        this._isAlive = this.currentHealth > 0;

        this._collider = this.getComponent(BoxCollider2D);
        this._collider.sensor = false;
        this.useCustomRule = true;
        if (!this._collider) {
            Log.warn(this.MODULE_NAME, `节点 ${this.node.name} 没有 Collider2D 组件`);
        }

        this._initCollisionRule();

        if (this._collider) {
            Log.warn(this.MODULE_NAME, `节点 ${this.node.name}  regist collider component.`);
            this._collider.on(Contact2DType.BEGIN_CONTACT, this._onCollisionEnter, this);
        }

        if (this.enableDebugDraw) {
            this._initDebugDraw();
        }

        EntityRegistry.instance.register(this);

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `实体初始化: ${this.node.name}, 类型: ${EntityType[this.entityType]}, 阵营: ${Faction[this.faction]}`);
        }
    }

    onDestroy() {
        EntityRegistry.instance.unregister(this);
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this._onCollisionEnter, this);
        }
        if (this._debugGraphics && this._debugGraphics.node && this._debugGraphics.node.isValid) {
            this._debugGraphics.node.destroy();
        }
        this._activeStatusEffects.length = 0;
        this._onDamage.length = 0;
        this._onHit.length = 0;
        this._onDeath.length = 0;
        this._onCollect.length = 0;
        this._onHeal.length = 0;
        this._onShieldChange.length = 0;
        this._onStatusEffect.length = 0;
        this._onContact.length = 0;
    }

    update(dt: number) {
        if (this.enableDebugDraw && this._debugGraphics) {
            this._updateDebugDraw();
        }

        if (this._isAlive) {
            this._updateStatusEffects(dt);
        }
    }

    // ========== 初始化 ==========

    public _initCollisionRule() {
        if (this.useCustomRule) {
            this._collisionRule = {
                canCollideWith: this.customCanCollideWith,
                canDamage: this.customCanDamage,
                canBeDamagedBy: this.customCanBeDamagedBy
            };
        } else {
            this._collisionRule = { ...CollisionRules.getRule(this.entityType, this.faction) };
        }
    }

    private _initDebugDraw() {
        const debugNode = new Node('DebugDraw');
        debugNode.parent = this.node;
        debugNode.layer = this.node.layer;

        this._debugGraphics = debugNode.getComponent(Graphics);
        if(!this._debugGraphics) this._debugGraphics = debugNode.addComponent(Graphics);

        const uiTransform = debugNode.getComponent(UITransform);
        uiTransform.setContentSize(1000, 1000);
        uiTransform.setAnchorPoint(0.5, 0.5);

        debugNode.setPosition(0, 0, 0);
    }

    private _updateDebugDraw() {
        if (!this._collider || !this._debugGraphics) return;

        this._debugGraphics.clear();
        this._debugGraphics.lineWidth = this.debugDrawLineWidth;
        this._debugGraphics.strokeColor = this.debugDrawColor;
        this._debugGraphics.fillColor = new Color(
            this.debugDrawColor.r,
            this.debugDrawColor.g,
            this.debugDrawColor.b,
            this.debugDrawColor.a * 0.3
        );

        const colliderType = this._collider.constructor.name;
        if (colliderType === 'BoxCollider2D') {
            this._drawBoxCollider();
        } else if (colliderType === 'CircleCollider2D') {
            this._drawCircleCollider();
        } else if (colliderType === 'PolygonCollider2D') {
            this._drawPolygonCollider();
        }

        this._debugGraphics.stroke();
        this._debugGraphics.fill();
    }

    private _drawBoxCollider() {
        const collider = this._collider as any;
        const size = collider.size || { width: 100, height: 100 };
        const offset = collider.offset || { x: 0, y: 0 };
        const halfWidth = size.width / 2;
        const halfHeight = size.height / 2;

        this._debugGraphics.rect(
            offset.x - halfWidth,
            offset.y - halfHeight,
            size.width,
            size.height
        );
    }

    private _drawCircleCollider() {
        const collider = this._collider as any;
        const radius = collider.radius || 50;
        const offset = collider.offset || { x: 0, y: 0 };
        this._debugGraphics.circle(offset.x, offset.y, radius);
    }

    private _drawPolygonCollider() {
        const collider = this._collider as any;
        const points = collider.points || [];
        const offset = collider.offset || { x: 0, y: 0 };

        if (points.length < 3) return;

        this._debugGraphics.moveTo(points[0].x + offset.x, points[0].y + offset.y);
        for (let i = 1; i < points.length; i++) {
            this._debugGraphics.lineTo(points[i].x + offset.x, points[i].y + offset.y);
        }
        this._debugGraphics.close();
    }

    // ========== 碰撞处理 ==========

    private _onCollisionEnter(_selfCollider: Collider2D, otherCollider: Collider2D, _contact: IPhysics2DContact) {
        Log.log(this.MODULE_NAME,`${this.node.name} is collider in.`);
        const otherEntity = otherCollider.getComponent(CombatEntity);
        if (!otherEntity) return;

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `碰撞: ${this.node.name} <-> ${otherEntity.node.name}`);
        }

        if (!this._canCollideWith(otherEntity)) return;

        // 武器：只触发对方的 onContact 事件，不造成伤害
        if (this.isWeapon) {
           this.attackTarget(otherEntity);

            if (this.destroyOnHit && this.node && this.node.isValid) {
                this.node.destroy();
            }
            return;
        }

        const didDamage = this._handleDamage(otherEntity);
        this._handleCollection(otherEntity);

        if (didDamage) {
            this._fireHit(otherEntity);
        }

        if (this.destroyOnHit && this.node && this.node.isValid) {
            this.node.destroy();
        }
    }

    private _canCollideWith(other: CombatEntity): boolean {
        return !!other && hasFlag(this._collisionRule.canCollideWith, other.entityType);
    }

    private _handleDamage(other: CombatEntity): boolean {
        if (!other.canDamageTarget(this)) return false;
        const result = other.attackTarget(this);
        return result !== null && (result.finalAmount > 0 || result.absorbedByShield > 0);
    }

    private _handleCollection(other: CombatEntity) {
        if (!other) return;
        if (!hasFlag(EntityType.REWARD | EntityType.BUFF | EntityType.DEBUFF, other.entityType)) return;

        other._fireCollect(this);
        this._stats.collections += 1;

        if (other.node && other.node.isValid) {
            other.node.destroy();
        }
    }

    // ========== 状态效果 ==========

    private _updateStatusEffects(dt: number) {
        for (let i = this._activeStatusEffects.length - 1; i >= 0; i--) {
            const effect = this._activeStatusEffects[i];
            effect.elapsed += dt;

            if (effect.interval && effect.interval > 0) {
                while (effect.elapsed >= effect.nextTick) {
                    this._tickStatusEffect(effect);
                    effect.nextTick += effect.interval;
                }
            }

            if (effect.elapsed >= effect.duration) {
                this._activeStatusEffects.splice(i, 1);
                this._fireStatusEffect(effect, 'removed');
            }
        }
    }

    private _tickStatusEffect(effect: ActiveStatusEffect) {
        const amount = Math.max(0, effect.magnitude || 0) * Math.max(1, effect.stacks);
        const source = effect.source ?? null;

        switch (effect.type) {
            case StatusEffectType.BURN:
                if (amount > 0) {
                    this.takeDamage({
                        amount,
                        type: effect.tickDamageType || DamageType.MAGICAL,
                        source,
                        ignoreDefense: true,
                        tags: ['status', 'burn']
                    });
                }
                break;
            case StatusEffectType.POISON:
                if (amount > 0) {
                    this.takeDamage({
                        amount,
                        type: effect.tickDamageType || DamageType.TRUE,
                        source,
                        ignoreDefense: true,
                        tags: ['status', 'poison']
                    });
                }
                break;
            case StatusEffectType.REGEN:
                if (amount > 0) {
                    this.heal(amount, source);
                }
                break;
            default:
                break;
        }

        this._fireStatusEffect(effect, 'tick');
    }

    private _createDamageResult(damage: DamageInfo, finalAmount: number, absorbedByShield: number, healedAmount: number, wasBlocked: boolean): DamageResult {
        return {
            originalAmount: Math.max(0, damage.amount),
            finalAmount,
            absorbedByShield,
            healedAmount,
            wasBlocked,
            isCritical: !!damage.isCritical,
            targetHealth: this.currentHealth,
            targetShield: this.currentShield,
            source: damage.source ?? null,
            type: damage.type
        };
    }

    private _calculateDamageAmount(damage: DamageInfo): number {
        let amount = Math.max(0, damage.amount);

        if (damage.multiplier !== undefined) {
            amount *= Math.max(0, damage.multiplier);
        }

        if (damage.source) {
            amount *= Math.max(0, damage.source.outgoingDamageMultiplier);
        }

        if (damage.type === DamageType.PHYSICAL && !damage.ignoreDefense) {
            amount = Math.max(0, amount - this.defense);
        }

        const resistance = this.getResistance(damage.type);
        if (damage.type !== DamageType.TRUE && damage.type !== DamageType.HEAL) {
            amount *= (1 - resistance);
        }

        amount *= Math.max(0, this.incomingDamageMultiplier);
        return Math.max(0, amount);
    }

    private _applyKnockback(damage: DamageInfo) {
        if (!damage.knockback || !damage.knockback.distance || damage.knockback.distance <= 0) return;

        const direction = new Vec3();
        if (damage.knockback.direction && damage.knockback.direction.lengthSqr() > 0) {
            direction.set(damage.knockback.direction);
        } else if (damage.source && damage.source.node && damage.source.node.isValid) {
            Vec3.subtract(direction, this.node.worldPosition, damage.source.node.worldPosition);
        } else {
            return;
        }

        if (direction.lengthSqr() <= 0) return;

        direction.normalize();
        const offset = direction.clone().multiplyScalar(damage.knockback.distance);
        const targetWorldPosition = this.node.worldPosition.clone();
        targetWorldPosition.add(offset);
        this.node.setWorldPosition(targetWorldPosition);
    }

    // ========== 伤害系统 ==========

    /** 创建伤害数据 */
    public createDamage(amount: number = this.attackPower, type: DamageType = DamageType.PHYSICAL, overrides: Partial<DamageInfo> = {}): DamageInfo {
        const isCritical = overrides.isCritical !== undefined
            ? overrides.isCritical
            : (type !== DamageType.HEAL && Math.random() < this.criticalRate);

        let finalAmount = Math.max(0, amount);
        if (isCritical && type !== DamageType.HEAL) {
            finalAmount *= this.criticalMultiplier;
        }

        return cloneDamageInfo({
            amount: finalAmount,
            type,
            source: overrides.source === undefined ? this : overrides.source,
            isCritical,
            effects: overrides.effects,
            ignoreDefense: overrides.ignoreDefense,
            bypassShield: overrides.bypassShield,
            canTriggerDeath: overrides.canTriggerDeath,
            multiplier: overrides.multiplier,
            tags: overrides.tags,
            knockback: overrides.knockback
        });
    }

    /** 主动攻击目标 */
    public attackTarget(target: CombatEntity, amount: number = this.attackPower, type: DamageType = DamageType.PHYSICAL, overrides: Partial<DamageInfo> = {}): DamageResult | null {
        Log.debug(this.MODULE_NAME, `attackTarget name : ${target.name}`);
        if (!target) return null;

        if (!this.canDamageTarget(target)) {
            if (this.enableDebugLog) {
                Log.warn(this.MODULE_NAME, `无法攻击目标: ${this.node.name} -> ${target.node.name}`);
            }
            return null;
        }
        
        const damage = this.createDamage(amount, type, overrides);
        return target.takeDamage(damage);
    }

    /** 受到伤害 */
    public takeDamage(damage: DamageInfo): DamageResult | null {
        const normalizedDamage = cloneDamageInfo(damage);
        normalizedDamage.source = normalizedDamage.source ?? null;

        if (normalizedDamage.type === DamageType.HEAL) {
            const actualHeal = this.heal(normalizedDamage.amount, normalizedDamage.source);
            return this._createDamageResult(normalizedDamage, 0, 0, actualHeal, actualHeal <= 0);
        }

        if (!this._isAlive) {
            return this._createDamageResult(normalizedDamage, 0, 0, 0, true);
        }

        if (this.invincible) {
            if (this.enableDebugLog) {
                Log.log(this.MODULE_NAME, `${this.node.name} 处于无敌状态，忽略伤害`);
            }
            return this._createDamageResult(normalizedDamage, 0, 0, 0, true);
        }

        if (normalizedDamage.source && !this.canBeDamagedBy(normalizedDamage.source)) {
            return this._createDamageResult(normalizedDamage, 0, 0, 0, true);
        }

        const calculatedDamage = this._calculateDamageAmount(normalizedDamage);
        let remainingDamage = calculatedDamage;
        let absorbedByShield = 0;

        if (!normalizedDamage.bypassShield && remainingDamage > 0 && this.currentShield > 0) {
            absorbedByShield = Math.min(this.currentShield, remainingDamage);
            this.currentShield -= absorbedByShield;
            remainingDamage -= absorbedByShield;
            this._stats.shieldDamageTaken += absorbedByShield;
            if (normalizedDamage.source) {
                normalizedDamage.source._stats.shieldDamageDealt += absorbedByShield;
            }
            this._fireShieldChanged(this.currentShield, -absorbedByShield);
        }

        const oldHealth = this.currentHealth;
        this.currentHealth = Math.max(0, this.currentHealth - remainingDamage);
        const finalDamage = oldHealth - this.currentHealth;

        if (finalDamage > 0 || absorbedByShield > 0) {
            this._stats.damageTaken += finalDamage;
            if (normalizedDamage.source) {
                normalizedDamage.source._stats.hits += 1;
                normalizedDamage.source._stats.damageDealt += finalDamage;
            }
        }

        if (this.enableDebugLog) {
            Log.log(
                this.MODULE_NAME,
                `${this.node.name} 受到 ${finalDamage} 点伤害，护盾吸收 ${absorbedByShield}，剩余生命 ${this.currentHealth}/${this.maxHealth}，护盾 ${this.currentShield}`
            );
        }

        const result = this._createDamageResult(normalizedDamage, finalDamage, absorbedByShield, 0, finalDamage <= 0 && absorbedByShield <= 0);
        this._fireDamage(normalizedDamage, this, result);

        if ((finalDamage > 0 || absorbedByShield > 0) && normalizedDamage.knockback) {
            this._applyKnockback(normalizedDamage);
        }

        if ((finalDamage > 0 || absorbedByShield > 0) && normalizedDamage.effects) {
            for (const effect of normalizedDamage.effects) {
                this.applyStatusEffect({
                    ...cloneStatusEffect(effect),
                    source: effect.source === undefined ? normalizedDamage.source : effect.source
                });
            }
        }

        if (this.currentHealth <= 0 && normalizedDamage.canTriggerDeath !== false) {
            this.die(normalizedDamage.source);
        }

        return result;
    }

    /** 治疗 */
    public heal(amount: number, source: CombatEntity | null = null): number {
        if (!this._isAlive || amount <= 0) return 0;

        const oldHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        const actualHeal = this.currentHealth - oldHealth;

        if (actualHeal <= 0) return 0;

        this._stats.healingReceived += actualHeal;
        if (source) {
            source._stats.healingDone += actualHeal;
        }

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `${this.node.name} 治疗 ${actualHeal} 点生命值`);
        }

        this._fireHeal(amount, source, actualHeal);
        return actualHeal;
    }

    /** 添加护盾 */
    public addShield(amount: number): number {
        if (amount <= 0) return 0;

        const oldShield = this.currentShield;
        const shieldCap = this.maxShield > 0 ? this.maxShield : Number.MAX_SAFE_INTEGER;
        this.currentShield = Math.min(shieldCap, this.currentShield + amount);
        const actualAdded = this.currentShield - oldShield;

        if (actualAdded > 0) {
            this._fireShieldChanged(this.currentShield, actualAdded);
        }

        return actualAdded;
    }

    /** 扣除护盾 */
    public removeShield(amount: number): number {
        if (amount <= 0) return 0;

        const oldShield = this.currentShield;
        this.currentShield = Math.max(0, this.currentShield - amount);
        const actualRemoved = oldShield - this.currentShield;

        if (actualRemoved > 0) {
            this._fireShieldChanged(this.currentShield, -actualRemoved);
        }

        return actualRemoved;
    }

    /** 应用状态效果 */
    public applyStatusEffect(effect: CombatStatusEffect): ActiveStatusEffect | null {
        if (!effect || effect.duration <= 0) return null;

        const key = effect.id || String(effect.type);
        const maxStacks = Math.max(1, effect.maxStacks || 1);
        const existing = this._activeStatusEffects.find(item => item.id === key);

        if (existing) {
            existing.duration = Math.max(existing.duration, effect.duration);
            existing.interval = effect.interval !== undefined ? effect.interval : existing.interval;
            existing.magnitude = effect.magnitude !== undefined ? effect.magnitude : existing.magnitude;
            existing.maxStacks = maxStacks;
            existing.tickDamageType = effect.tickDamageType !== undefined ? effect.tickDamageType : existing.tickDamageType;
            existing.source = effect.source === undefined ? existing.source : effect.source;
            existing.tags = effect.tags ? [...effect.tags] : existing.tags;
            existing.payload = effect.payload ? { ...effect.payload } : existing.payload;
            existing.elapsed = 0;
            existing.nextTick = existing.interval && existing.interval > 0 ? existing.interval : existing.duration;
            existing.stacks = Math.min(existing.stacks + 1, maxStacks);
            this._fireStatusEffect(existing, 'refreshed');
            return cloneActiveStatusEffect(existing);
        }

        const activeEffect: ActiveStatusEffect = {
            id: key,
            type: effect.type,
            duration: effect.duration,
            interval: effect.interval,
            magnitude: effect.magnitude,
            maxStacks,
            source: effect.source ?? null,
            tickDamageType: effect.tickDamageType,
            tags: effect.tags ? [...effect.tags] : undefined,
            payload: effect.payload ? { ...effect.payload } : undefined,
            elapsed: 0,
            nextTick: effect.interval && effect.interval > 0 ? effect.interval : effect.duration,
            stacks: 1
        };

        this._activeStatusEffects.push(activeEffect);
        if (effect.source) {
            effect.source._stats.statusApplied += 1;
        }
        this._fireStatusEffect(activeEffect, 'applied');
        return cloneActiveStatusEffect(activeEffect);
    }

    /** 移除状态效果 */
    public removeStatusEffect(effectIdOrType: string): boolean {
        const index = this._activeStatusEffects.findIndex(effect => effect.id === effectIdOrType || String(effect.type) === effectIdOrType);
        if (index < 0) return false;

        const [removed] = this._activeStatusEffects.splice(index, 1);
        this._fireStatusEffect(removed, 'removed');
        return true;
    }

    /** 清空状态效果 */
    public clearStatusEffects() {
        while (this._activeStatusEffects.length > 0) {
            const effect = this._activeStatusEffects.pop();
            this._fireStatusEffect(effect, 'removed');
        }
    }

    /** 死亡 */
    public die(killer: CombatEntity | null = null) {
        if (!this._isAlive) return;

        if(!this._collider) this._collider.enabled = false;
        this._isAlive = false;
        this.currentHealth = 0;
        this._stats.deaths += 1;
        if (killer) {
            killer._stats.kills += 1;
        }

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `${this.node.name} 死亡`);
        }

        this._fireDeath(killer);

        if (this.autoDestroyOnDeath) {
            this.scheduleOnce(() => {
                if (this.node && this.node.isValid) {
                    this.node.destroy();
                }
            }, this.destroyDelay);
        }
    }

    /** 复活 */
    public revive(health: number = this.maxHealth, shield: number = 0, clearEffects: boolean = true) {
        this._isAlive = true;
        this.currentHealth = Math.max(1, Math.min(this.maxHealth, health));
        this.currentShield = Math.max(0, this.maxShield > 0 ? Math.min(shield, this.maxShield) : shield);
        if (clearEffects) {
            this.clearStatusEffects();
        }
    }

    // ========== 事件系统 ==========

    private _fireDamage(damage: DamageInfo, target: CombatEntity, result: DamageResult) {
        if (!this._isAlive) return;
        for (const callback of this._onDamage) {
            callback(damage, target, result);
        }
    }

    private _fireHit(target: CombatEntity) {
        if (!this._isAlive) return;
        for (const callback of this._onHit) {
            callback(target);
        }
    }

    private _fireDeath(killer: CombatEntity | null) {
        for (const callback of this._onDeath) {
            callback(killer);
        }
    }

    private _fireCollect(collector: CombatEntity) {
        if (!this._isAlive) return;
        for (const callback of this._onCollect) {
            callback(collector);
        }
    }

    private _fireHeal(requestedAmount: number, source: CombatEntity | null, actualAmount: number) {
        if (!this._isAlive) return;
        for (const callback of this._onHeal) {
            callback(requestedAmount, source, actualAmount);
        }
    }

    private _fireShieldChanged(currentShield: number, delta: number) {
        if (!this._isAlive) return;
        for (const callback of this._onShieldChange) {
            callback(currentShield, delta);
        }
    }

    private _fireStatusEffect(effect: ActiveStatusEffect, action: StatusEffectAction) {
        if (!this._isAlive) return;
        const snapshot = cloneActiveStatusEffect(effect);
        for (const callback of this._onStatusEffect) {
            callback(snapshot, action);
        }
    }

    public _fireContact(weapon: CombatEntity) {
        if (!this._isAlive) return;
        for (const callback of this._onContact) {
            callback(weapon);
        }
    }

    /** 订阅受伤事件 */
    public onDamage(callback: OnDamageCallback) {
        if (this._onDamage.indexOf(callback) < 0) this._onDamage.push(callback);
    }

    /** 取消订阅受伤事件 */
    public offDamage(callback: OnDamageCallback) {
        removeCallback(this._onDamage, callback);
    }

    /** 订阅碰撞事件 */
    public onHit(callback: OnHitCallback) {
        if (this._onHit.indexOf(callback) < 0) this._onHit.push(callback);
    }

    /** 取消订阅碰撞事件 */
    public offHit(callback: OnHitCallback) {
        removeCallback(this._onHit, callback);
    }

    /** 订阅死亡事件 */
    public onDeath(callback: OnDeathCallback) {
        if (this._onDeath.indexOf(callback) < 0) this._onDeath.push(callback);
    }

    /** 取消订阅死亡事件 */
    public offDeath(callback: OnDeathCallback) {
        removeCallback(this._onDeath, callback);
    }

    /** 订阅收集事件 */
    public onCollect(callback: OnCollectCallback) {
        if (this._onCollect.indexOf(callback) < 0) this._onCollect.push(callback);
    }

    /** 取消订阅收集事件 */
    public offCollect(callback: OnCollectCallback) {
        removeCallback(this._onCollect, callback);
    }

    /** 订阅治疗事件 */
    public onHeal(callback: OnHealCallback) {
        if (this._onHeal.indexOf(callback) < 0) this._onHeal.push(callback);
    }

    /** 取消订阅治疗事件 */
    public offHeal(callback: OnHealCallback) {
        removeCallback(this._onHeal, callback);
    }

    /** 订阅护盾变化事件 */
    public onShieldChange(callback: OnShieldChangeCallback) {
        if (this._onShieldChange.indexOf(callback) < 0) this._onShieldChange.push(callback);
    }

    /** 取消订阅护盾变化事件 */
    public offShieldChange(callback: OnShieldChangeCallback) {
        removeCallback(this._onShieldChange, callback);
    }

    /** 订阅状态效果事件 */
    public onStatusEffect(callback: OnStatusEffectCallback) {
        if (this._onStatusEffect.indexOf(callback) < 0) this._onStatusEffect.push(callback);
    }

    /** 取消订阅状态效果事件 */
    public offStatusEffect(callback: OnStatusEffectCallback) {
        removeCallback(this._onStatusEffect, callback);
    }

    /** 订阅武器接触事件（仅当对方为武器时触发） */
    public onContact(callback: OnContactCallback) {
        if (this._onContact.indexOf(callback) < 0) this._onContact.push(callback);
    }

    /** 取消订阅武器接触事件 */
    public offContact(callback: OnContactCallback) {
        removeCallback(this._onContact, callback);
    }

    // ========== 公共 API ==========

    /** 是否存活 */
    public isAlive(): boolean {
        return this._isAlive;
    }

    /** 是否可以行动 */
    public canAct(): boolean {
        return this._isAlive && !this.hasStatusEffect(StatusEffectType.STUN);
    }

    /** 获取生命值百分比 */
    public getHealthPercent(): number {
        if (this.maxHealth <= 0) return 0;
        return clamp01(this.currentHealth / this.maxHealth);
    }

    /** 获取护盾百分比 */
    public getShieldPercent(): number {
        if (this.maxShield <= 0) return this.currentShield > 0 ? 1 : 0;
        return clamp01(this.currentShield / this.maxShield);
    }

    /** 获取移动速度倍率（供移动系统读取） */
    public getMoveSpeedMultiplier(): number {
        let multiplier = 1;
        for (const effect of this._activeStatusEffects) {
            if (effect.type === StatusEffectType.SLOW) {
                const slowValue = clamp01((effect.magnitude || 0) * effect.stacks);
                multiplier *= Math.max(0.1, 1 - slowValue);
            }
        }
        return Math.max(0.1, multiplier);
    }

    /** 获取指定伤害类型的抗性 */
    public getResistance(type: DamageType): number {
        switch (type) {
            case DamageType.PHYSICAL:
                return clamp01(this.physicalResistance);
            case DamageType.MAGICAL:
                return clamp01(this.magicalResistance);
            default:
                return 0;
        }
    }

    /** 设置碰撞规则 */
    public setCollisionRule(rule: CollisionRule) {
        this._collisionRule = { ...rule };
        this.useCustomRule = true;
        this.customCanCollideWith = rule.canCollideWith;
        this.customCanDamage = rule.canDamage;
        this.customCanBeDamagedBy = rule.canBeDamagedBy;
    }

    /** 重置为预设碰撞规则 */
    public resetCollisionRule() {
        this.useCustomRule = false;
        this._initCollisionRule();
    }

    /** 重新刷新碰撞规则 */
    public refreshCollisionRule() {
        this._initCollisionRule();
    }

    /** 获取碰撞规则 */
    public getCollisionRule(): CollisionRule {
        return { ...this._collisionRule };
    }

    /** 是否是敌对关系 */
    public isHostile(other: CombatEntity): boolean {
        if (!other || other === this) return false;
        if (this.teamId && other.teamId && this.teamId === other.teamId) return false;
        if (this.faction === Faction.NONE || other.faction === Faction.NONE) return false;
        if (this.faction === Faction.NEUTRAL || other.faction === Faction.NEUTRAL) return false;
        return this.faction !== other.faction;
    }

    /** 是否是友军 */
    public isFriendly(other: CombatEntity): boolean {
        if (!other || other === this) return false;
        if (this.teamId && other.teamId && this.teamId === other.teamId) return true;
        return this.faction === other.faction && this.faction !== Faction.NONE && this.faction !== Faction.NEUTRAL;
    }

    /** 是否可以伤害目标 */
    public canDamageTarget(target: CombatEntity): boolean {
        if (!target || !this._isAlive || !target.isAlive()) return false;
        if (!hasFlag(this._collisionRule.canDamage, target.entityType)) return false;
        if (!target.canBeDamagedBy(this)) return false;
        if (!this.allowFriendlyFire && this.isFriendly(target)) return false;
        return true;
    }

    /** 是否可以被指定来源伤害 */
    public canBeDamagedBy(source: CombatEntity | null): boolean {
        if (!source) return true;
        return hasFlag(this._collisionRule.canBeDamagedBy, source.entityType);
    }

    /** 是否拥有指定状态 */
    public hasStatusEffect(effectIdOrType: string): boolean {
        return this._activeStatusEffects.some(effect => effect.id === effectIdOrType || String(effect.type) === effectIdOrType);
    }

    /** 获取当前状态效果列表 */
    public getStatusEffects(): ActiveStatusEffect[] {
        return this._activeStatusEffects.map(effect => cloneActiveStatusEffect(effect));
    }

    /** 获取战斗统计 */
    public getCombatStats(): CombatStats {
        return { ...this._stats };
    }

    /** 重置战斗统计 */
    public resetCombatStats() {
        this._stats = createDefaultStats();
    }
}
