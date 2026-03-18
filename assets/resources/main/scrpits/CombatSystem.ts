import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, Node, Enum, Graphics, Color, UITransform, Vec3 } from 'cc';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

// ========== 枚举定义 ==========

/** 实体类型 */
export enum EntityType {
    NONE = 0,
    PLAYER = 1 << 0,        // 主角
    ENEMY = 1 << 1,         // 敌人
    BULLET = 1 << 2,        // 子弹
    REWARD = 1 << 3,        // 奖励
    BUFF = 1 << 4,          // 增益
    DEBUFF = 1 << 5,        // 减益
    NEUTRAL = 1 << 6,       // 中立
    OBSTACLE = 1 << 7       // 障碍物
}

/** 阵营 */
export enum Faction {
    NONE = 0,
    PLAYER = 1,     // 玩家阵营
    ENEMY = 2,      // 敌人阵营
    NEUTRAL = 3     // 中立阵营
}

/** 伤害类型 */
export enum DamageType {
    PHYSICAL = 'physical',  // 物理伤害
    MAGICAL = 'magical',    // 魔法伤害
    TRUE = 'true',          // 真实伤害
    HEAL = 'heal'           // 治疗
}

// ========== 接口定义 ==========

/** 伤害信息 */
export interface DamageInfo {
    /** 伤害值 */
    amount: number;
    /** 伤害类型 */
    type: DamageType;
    /** 伤害来源 */
    source: CombatEntity;
    /** 是否暴击 */
    isCritical?: boolean;
    /** 附加效果 */
    effects?: string[];
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

/** 战斗事件回调 */
export type OnDamageCallback = (damage: DamageInfo, target: CombatEntity) => void;
export type OnHitCallback = (target: CombatEntity) => void;
export type OnDeathCallback = (killer: CombatEntity) => void;
export type OnCollectCallback = (collector: CombatEntity) => void;

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

    /** 障碍物规则 */
    static readonly OBSTACLE: CollisionRule = {
        canCollideWith: EntityType.PLAYER | EntityType.ENEMY | EntityType.BULLET,
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
            case EntityType.OBSTACLE:
                return this.OBSTACLE;
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
export class CombatEntity extends Component {

    // ---------- Inspector 属性 ----------

    @property({ type: Enum(EntityType), tooltip: '实体类型' })
    public entityType: EntityType = EntityType.NONE;

    @property({ type: Enum(Faction), tooltip: '所属阵营' })
    public faction: Faction = Faction.NEUTRAL;

    @property({ tooltip: '最大生命值' })
    public maxHealth: number = 100;

    @property({ tooltip: '当前生命值（留空则使用最大生命值）' })
    public currentHealth: number = 0;

    @property({ tooltip: '攻击力' })
    public attackPower: number = 10;

    @property({ tooltip: '防御力' })
    public defense: number = 0;

    @property({ tooltip: '暴击率（0-1）' })
    public criticalRate: number = 0;

    @property({ tooltip: '暴击伤害倍率' })
    public criticalMultiplier: number = 2;

    @property({ tooltip: '是否无敌' })
    public invincible: boolean = false;

    @property({ tooltip: '使用自定义碰撞规则' })
    public useCustomRule: boolean = false;

    @property({ visible: function() { return this.useCustomRule; }, tooltip: '可碰撞类型（位掩码）' })
    public customCanCollideWith: number = 0;

    @property({ visible: function() { return this.useCustomRule; }, tooltip: '可伤害类型（位掩码）' })
    public customCanDamage: number = 0;

    @property({ visible: function() { return this.useCustomRule; }, tooltip: '可被伤害类型（位掩码）' })
    public customCanBeDamagedBy: number = 0;

    @property({ tooltip: '启用调试日志' })
    public enableDebugLog: boolean = false;

    @property({ tooltip: '启用碰撞区域调试绘制' })
    public enableDebugDraw: boolean = false;

    @property({ visible: function() { return this.enableDebugDraw; }, tooltip: '调试绘制颜色' })
    public debugDrawColor: Color = new Color(0, 255, 0, 128);

    @property({ visible: function() { return this.enableDebugDraw; }, tooltip: '调试绘制线宽' })
    public debugDrawLineWidth: number = 2;

    // ---------- 私有状态 ----------

    private readonly MODULE_NAME = 'CombatEntity';
    private _collider: Collider2D = null;
    private _collisionRule: CollisionRule = null;
    private _isAlive: boolean = true;
    private _debugGraphics: Graphics = null;

    // 事件回调
    private _onDamage: OnDamageCallback[] = [];
    private _onHit: OnHitCallback[] = [];
    private _onDeath: OnDeathCallback[] = [];
    private _onCollect: OnCollectCallback[] = [];

    // ========== 生命周期 ==========

    onLoad() {
        // 初始化生命值
        if (this.currentHealth <= 0) {
            this.currentHealth = this.maxHealth;
        }

        // 获取碰撞器
        this._collider = this.getComponent(Collider2D);
        if (!this._collider) {
            Log.warn(this.MODULE_NAME, `节点 ${this.node.name} 没有 Collider2D 组件`);
        }

        // 初始化碰撞规则
        this._initCollisionRule();

        // 注册碰撞事件
        if (this._collider) {
            this._collider.on(Contact2DType.BEGIN_CONTACT, this._onCollisionEnter, this);
        }

        // 初始化调试绘制
        if (this.enableDebugDraw) {
            this._initDebugDraw();
        }

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `实体初始化: ${this.node.name}, 类型: ${EntityType[this.entityType]}, 阵营: ${Faction[this.faction]}`);
        }
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this._onCollisionEnter, this);
        }
        if (this._debugGraphics) {
            this._debugGraphics.node.destroy();
        }
    }

    update(_dt: number) {
        if (this.enableDebugDraw && this._debugGraphics) {
            this._updateDebugDraw();
        }
    }

    // ========== 初始化 ==========

    private _initCollisionRule() {
        if (this.useCustomRule) {
            this._collisionRule = {
                canCollideWith: this.customCanCollideWith,
                canDamage: this.customCanDamage,
                canBeDamagedBy: this.customCanBeDamagedBy
            };
        } else {
            this._collisionRule = CollisionRules.getRule(this.entityType, this.faction);
        }
    }

    private _initDebugDraw() {
        // 创建调试绘制节点
        const debugNode = new Node('DebugDraw');
        debugNode.parent = this.node;
        debugNode.layer = this.node.layer;
        
        // 添加 Graphics 组件
        this._debugGraphics = debugNode.addComponent(Graphics);
        
        // 添加 UITransform（Graphics 需要）
        const uiTransform = debugNode.addComponent(UITransform);
        uiTransform.setContentSize(1000, 1000);
        uiTransform.setAnchorPoint(0.5, 0.5);
        
        // 设置位置为父节点中心
        debugNode.setPosition(0, 0, 0);
    }

    private _updateDebugDraw() {
        if (!this._collider || !this._debugGraphics) return;

        this._debugGraphics.clear();
        
        // 设置绘制样式
        this._debugGraphics.lineWidth = this.debugDrawLineWidth;
        this._debugGraphics.strokeColor = this.debugDrawColor;
        this._debugGraphics.fillColor = new Color(
            this.debugDrawColor.r,
            this.debugDrawColor.g,
            this.debugDrawColor.b,
            this.debugDrawColor.a * 0.3
        );

        // 根据碰撞器类型绘制不同形状
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

    private _onCollisionEnter(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact) {
        const otherEntity = otherCollider.getComponent(CombatEntity);
        if (!otherEntity) return;

        // 检查是否可以碰撞
        if (!this._canCollideWith(otherEntity)) return;

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `碰撞: ${this.node.name} <-> ${otherEntity.node.name}`);
        }

        // 处理伤害
        this._handleDamage(otherEntity);

        // 处理收集（奖励、增益、减益）
        this._handleCollection(otherEntity);

        // 触发碰撞回调
        this._fireHit(otherEntity);
    }

    private _canCollideWith(other: CombatEntity): boolean {
        return (this._collisionRule.canCollideWith & other.entityType) !== 0;
    }

    private _handleDamage(other: CombatEntity) {
        // 检查是否可以对目标造成伤害
        if ((this._collisionRule.canDamage & other.entityType) !== 0) {
            const damage: DamageInfo = {
                amount: this.attackPower,
                type: DamageType.PHYSICAL,
                source: this,
                isCritical: Math.random() < this.criticalRate
            };

            if (damage.isCritical) {
                damage.amount *= this.criticalMultiplier;
            }

            other.takeDamage(damage);
        }
    }

    private _handleCollection(other: CombatEntity) {
        // 如果对方是奖励、增益或减益，触发收集
        if (other.entityType & (EntityType.REWARD | EntityType.BUFF | EntityType.DEBUFF)) {
            other._fireCollect(this);
            // 收集后销毁
            other.node.destroy();
        }
    }

    // ========== 伤害系统 ==========

    /** 受到伤害 */
    public takeDamage(damage: DamageInfo) {
        if (!this._isAlive || this.invincible) return;

        // 检查是否可以被此来源伤害
        if ((this._collisionRule.canBeDamagedBy & damage.source.entityType) === 0) {
            return;
        }

        // 计算实际伤害
        let actualDamage = damage.amount;
        if (damage.type === DamageType.PHYSICAL) {
            actualDamage = Math.max(0, damage.amount - this.defense);
        }

        // 扣除生命值
        this.currentHealth -= actualDamage;

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `${this.node.name} 受到 ${actualDamage} 点伤害 (剩余: ${this.currentHealth}/${this.maxHealth})`);
        }

        // 触发伤害回调
        this._fireDamage(damage, this);

        // 检查死亡
        if (this.currentHealth <= 0) {
            this.die(damage.source);
        }
    }

    /** 治疗 */
    public heal(amount: number) {
        if (!this._isAlive) return;

        const oldHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `${this.node.name} 治疗 ${this.currentHealth - oldHealth} 点生命值`);
        }
    }

    /** 死亡 */
    public die(killer: CombatEntity) {
        if (!this._isAlive) return;

        this._isAlive = false;
        this.currentHealth = 0;

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `${this.node.name} 死亡`);
        }

        // 触发死亡回调
        this._fireDeath(killer);

        // 销毁节点（可以在回调中阻止）
        this.scheduleOnce(() => {
            if (this.node && this.node.isValid) {
                this.node.destroy();
            }
        }, 0);
    }

    // ========== 事件系统 ==========

    private _fireDamage(damage: DamageInfo, target: CombatEntity) {
        for (const cb of this._onDamage) cb(damage, target);
    }

    private _fireHit(target: CombatEntity) {
        for (const cb of this._onHit) cb(target);
    }

    private _fireDeath(killer: CombatEntity) {
        for (const cb of this._onDeath) cb(killer);
    }

    private _fireCollect(collector: CombatEntity) {
        for (const cb of this._onCollect) cb(collector);
    }

    /** 订阅受伤事件 */
    public onDamage(cb: OnDamageCallback) {
        if (this._onDamage.indexOf(cb) < 0) this._onDamage.push(cb);
    }

    /** 订阅碰撞事件 */
    public onHit(cb: OnHitCallback) {
        if (this._onHit.indexOf(cb) < 0) this._onHit.push(cb);
    }

    /** 订阅死亡事件 */
    public onDeath(cb: OnDeathCallback) {
        if (this._onDeath.indexOf(cb) < 0) this._onDeath.push(cb);
    }

    /** 订阅收集事件 */
    public onCollect(cb: OnCollectCallback) {
        if (this._onCollect.indexOf(cb) < 0) this._onCollect.push(cb);
    }

    // ========== 公共 API ==========

    /** 是否存活 */
    public isAlive(): boolean {
        return this._isAlive;
    }

    /** 获取生命值百分比 */
    public getHealthPercent(): number {
        return this.currentHealth / this.maxHealth;
    }

    /** 设置碰撞规则 */
    public setCollisionRule(rule: CollisionRule) {
        this._collisionRule = rule;
        this.useCustomRule = true;
    }

    /** 获取碰撞规则 */
    public getCollisionRule(): CollisionRule {
        return { ...this._collisionRule };
    }

    /** 是否是敌对关系 */
    public isHostile(other: CombatEntity): boolean {
        if (this.faction === Faction.NEUTRAL || other.faction === Faction.NEUTRAL) {
            return false;
        }
        return this.faction !== other.faction;
    }

    /** 是否是友军 */
    public isFriendly(other: CombatEntity): boolean {
        return this.faction === other.faction && this.faction !== Faction.NEUTRAL;
    }
}
