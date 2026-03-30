import { _decorator, Component, Node, BoxCollider2D, RigidBody2D, Contact2DType, Collider2D, Animation, Vec2, Vec3 } from 'cc';
import { CombatEntity, EntityType, Faction } from '../CombatSystem';
import { Log } from '../Logger';
const { ccclass, property, executionOrder } = _decorator;

/** AI状态 */
enum AIState {
    IDLE = 0,
    PATROL = 1,
    CHASE = 2,
    ATTACK = 3,
    DEAD = 4
}

@ccclass('Enemy')
@executionOrder(5)
export class Enemy extends Component {

    private mcollider: BoxCollider2D = null;
    private mcombatEntity: CombatEntity = null;
    private mhitcombatEntity: CombatEntity = null;
    private animComp: Animation = null!;
    private _rigidBody: RigidBody2D = null;

    @property({ tooltip: '移动速度' })
    public moveSpeed: number = 50;

    @property({ tooltip: '巡逻范围（半径）' })
    public patrolRange: number = 80;

    @property({ tooltip: '追击范围' })
    public chaseRange: number = 300;

    @property({ tooltip: '攻击范围' })
    public attackRange: number = 80;

    @property({ tooltip: '攻击冷却时间' })
    public attackCooldown: number = 1.5;

    @property({ tooltip: '动画播放速度' })
    public animationSpeed: number = 1.0;

    @property({ tooltip: '空闲动画名' })
    public animIdle: string = 'idle';

    @property({ tooltip: '行走动画名' })
    public animWalk: string = 'walk';

    @property({ tooltip: '攻击动画名' })
    public animAttack: string = 'splash';

    @property({ tooltip: '防御动画名' })
    public animDefend: string = 'defend';

    @property({ tooltip: '死亡动画名' })
    public animDead: string = 'dead';

    private _aiState: AIState = AIState.IDLE;
    private _player: Node = null;
    private _patrolDirection: number = 1;
    private _patrolOrigin: Vec2 = null;
    private _attackTimer: number = 0;
    private _scale: Vec3 = Vec3.ZERO;
    private _hitNode : Node = null;

    // 攻击时禁止移动（优化手感）
    private _isAttacking: boolean = false;

    private readonly MODULE_NAME = 'Enemy';

    protected onLoad(): void {
        this.initCombatEntity();
        this.initAnimation();
    }

    protected start(): void {
        this._scale = this.node.getScale();
        this._rigidBody = this.getComponent(RigidBody2D);
        this._patrolOrigin = new Vec2(this.node.position.x, this.node.position.y);
        this.findPlayer();

        // 关闭重力 + 禁用物理速度干扰
        if (this._rigidBody) {
            this._rigidBody.gravityScale = 0;
            this._rigidBody.fixedRotation = true;
        }
    }

    protected update(dt: number): void {
        if (this._aiState === AIState.DEAD) return;

        this.setAnimationSpeed(this.animationSpeed);
        this._attackTimer -= dt;

        if (!this._player) {
            this.findPlayer();
            return;
        }

        const distToPlayer = Vec2.distance(
            new Vec2(this.node.position.x, this.node.position.y),
            new Vec2(this._player.position.x, this._player.position.y)
        );

        if (distToPlayer < this.attackRange) {
            this.setAIState(AIState.ATTACK);
        } else if (distToPlayer < this.chaseRange) {
            this.setAIState(AIState.CHASE);
        } else {
            this.setAIState(AIState.PATROL);
        }

        this.updateAIBehavior(dt);
    }

    private initCollider(): void {
        this.mcollider = this.node.addComponent(BoxCollider2D);
        this.mcollider.sensor = true;
        this.mcollider.enabled = true;
    }

    private initCombatEntity(): void {
        this._hitNode = this.node.getChildByName("hitNode");
        if(this._hitNode)
        {
            this.mhitcombatEntity = this._hitNode.addComponent(CombatEntity);
            this.mhitcombatEntity.entityType = EntityType.WEAPON;
            this.mhitcombatEntity.faction = Faction.ENEMY;
            this.mhitcombatEntity.attackPower = 10;
            this.mhitcombatEntity.maxHealth = 100;
            this.mhitcombatEntity.isWeapon = true;
            this.mhitcombatEntity.enableDebugLog = true;

            this.mhitcombatEntity.useCustomRule = true;
            this.mhitcombatEntity.customCanCollideWith = EntityType.PLAYER;
            this.mhitcombatEntity.customCanDamage = EntityType.PLAYER;
            this.mhitcombatEntity.customCanBeDamagedBy = EntityType.PLAYER;
            this.mhitcombatEntity._initCollisionRule();
        }

        this.mcombatEntity = this.node.addComponent(CombatEntity);
        this.mcombatEntity.entityType = EntityType.ENEMY;
        this.mcombatEntity.faction = Faction.ENEMY;
        this.mcombatEntity.attackPower = 0;
        this.mcombatEntity.maxHealth = 100;
        this.mcombatEntity.enableDebugLog = true;

        this.mcombatEntity.useCustomRule = true;
        this.mcombatEntity.customCanCollideWith = EntityType.PLAYER;
        this.mcombatEntity.customCanDamage = EntityType.PLAYER;
        this.mcombatEntity.customCanBeDamagedBy = EntityType.PLAYER | EntityType.WEAPON;

        this.mcombatEntity._initCollisionRule();
        this.mcombatEntity.onDeath(() => this.die());
    }

    private initAnimation(): void {
        this.animComp = this.getComponent(Animation);
        if (!this.animComp) return;
        this.animComp.playOnLoad = false;
        this.setAnimationSpeed(this.animationSpeed);
    }

    private findPlayer(): void {
        const scene = this.node.scene;
        if (!scene) return;

        const findPlayerInNode = (node: Node): Node | null => {
            if (node.name === 'Player_a' || node.name.includes('Player_a')) return node;
            for (const child of node.children) {
                const found = findPlayerInNode(child);
                if (found) return found;
            }
            return null;
        };

        this._player = findPlayerInNode(scene);
    }

    private setAIState(newState: AIState): void {
        if (this._aiState === newState) return;
        this._aiState = newState;
        this.playStateAnim(newState);
    }

    private playStateAnim(state: AIState): void {
        if (!this.animComp) return;
        const nameMap: Partial<Record<AIState, string>> = {
            [AIState.IDLE]:   this.animIdle,
            [AIState.PATROL]: this.animWalk,
            [AIState.CHASE]:  this.animWalk,
            [AIState.DEAD]:   this.animDead,
        };
        const name = nameMap[state];
        if (name) this.animComp.play(name);
    }

    private updateAIBehavior(dt: number): void {
        switch (this._aiState) {
            case AIState.PATROL: this.patrol(); break;
            case AIState.CHASE: this.chase(dt); break;
            case AIState.ATTACK: this.attack(); break;
        }
    }

    private patrol(): void {
        const pos = new Vec2(this.node.position.x, this.node.position.y);
        const offset = pos.clone().subtract(this._patrolOrigin);

        const RANGE = this.patrolRange;
        const BUFFER = 5;

        if (offset.x > RANGE + BUFFER) {
            this._patrolDirection = -1;
        } else if (offset.x < -RANGE - BUFFER) {
            this._patrolDirection = 1;
        }

        if (Math.abs(offset.x) < RANGE * 0.7) {
            if (Math.random() < 0.005) {
                this._patrolDirection *= -1;
            }
        }

        this.moveCharacter(new Vec2(this._patrolDirection, 0));
    }

    // =========================
    // 🔥 优化：平滑追逐（不突兀）
    // =========================
    private chase(dt: number): void {
        if (!this._player || this._isAttacking) return;

        const selfPos = new Vec2(this.node.x, this.node.y);
        const targetPos = new Vec2(this._player.x, this._player.y);
        const dir = targetPos.subtract(selfPos);
        const dist = dir.length();

        // 靠近时减速，平滑停下
        let speed = this.moveSpeed;
        if (dist < this.attackRange + 50) {
            speed = this.moveSpeed * (dist / (this.attackRange + 50));
        }

        dir.normalize();
        const moveDir = dir.multiplyScalar(speed);

        // 改用坐标移动，子节点不抖动
        this.node.setPosition(
            this.node.x + moveDir.x * dt,
            this.node.y + moveDir.y * dt,
            this.node.z
        );

        // 自动转向
        if (dir.x > 0.01) {
            this.node.setScale(Math.abs(this._scale.x), this._scale.y, this._scale.z);
        } else if (dir.x < -0.01) {
            this.node.setScale(-Math.abs(this._scale.x), this._scale.y, this._scale.z);
        }
    }

    private attack(): void {
        if (!this._player || this._isAttacking) return;

        // 攻击时完全静止
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }

        // 🔥 强制对准目标
        this._forceFacePlayer();

        if (this._attackTimer <= 0) {
            this.releaseSkill();
            this._attackTimer = this.attackCooldown;
        }
    }

    // =========================
    // 🔥 优化：攻击前强制对准
    // =========================
    private _forceFacePlayer() {
        if (!this._player) return;
        const dx = this._player.x - this.node.x;
        if (dx > 0) {
            this.node.setScale(Math.abs(this._scale.x), this._scale.y, this._scale.z);
        } else {
            this.node.setScale(-Math.abs(this._scale.x), this._scale.y, this._scale.z);
        }
    }

    // =========================
    // 🔥 彻底废弃 linearVelocity
    // =========================
    private moveCharacter(dir: Vec2): void {
        if (this._isAttacking) return;
        if (dir.lengthSqr() < 0.01) return;

        dir.normalize();
        this.node.setPosition(
            this.node.x + dir.x * this.moveSpeed * 0.016,
            this.node.y + dir.y * this.moveSpeed * 0.016,
            this.node.z
        );

        if (dir.x > 0.01) {
            this.node.setScale(Math.abs(this._scale.x), this._scale.y, this._scale.z);
        } else if (dir.x < -0.01) {
            this.node.setScale(-Math.abs(this._scale.x), this._scale.y, this._scale.z);
        }
    }

    private releaseSkill(): void {
        this._isAttacking = true;
        Log.debug(this.MODULE_NAME, '释放技能（攻击）');
        
        if (this.animComp) {
            this.animComp.play(this.animAttack);
            this.animComp.once(Animation.EventType.FINISHED, () => {
                this.onAttackEnd();
            }, this);
        } else {
            this.scheduleOnce(() => this.onAttackEnd(), 0.3);
        }

        this.scheduleOnce(() => {
            this.onAttackBegin();
        }, 0.1);
    }

    private onTriggerEnter(other: Collider2D, _self: Collider2D): void {
        Log.debug(this.MODULE_NAME, `攻击命中: ${other.node.name}`);
    }

    public onAttackBegin(): void {
        Log.debug(this.MODULE_NAME, `攻击开始: onAttackBegin`);
        if(this._hitNode) this._hitNode.getComponent(BoxCollider2D).enabled = true;
    }

    public onAttackEnd(): void {
        Log.debug(this.MODULE_NAME, `攻击结束: onAttackEnd`);
        if(this._hitNode) this._hitNode.getComponent(BoxCollider2D).enabled = false;
        this._isAttacking = false;
    }

    public setAnimationSpeed(speed: number): void {
        if (!this.animComp) return;
        for (const clip of this.animComp.clips) {
            const state = this.animComp.getState(clip.name);
            if (state) state.speed = speed;
        }
    }

    private die(): void {
        if (this._aiState === AIState.DEAD) return;
        this.setAIState(AIState.DEAD);
        if (this._rigidBody) this._rigidBody.linearVelocity = Vec2.ZERO;
    }
}