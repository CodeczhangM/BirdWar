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
@executionOrder(10)
export class Enemy extends Component {

    private mcollider: BoxCollider2D = null;
    private mcombatEntity: CombatEntity = null;
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

    private _aiState: AIState = AIState.IDLE;
    private _player: Node = null;
    private _patrolDirection: number = 1;
    private _patrolOrigin: Vec2 = null;
    private _attackTimer: number = 0;
    private _scale: Vec3 = Vec3.ZERO;

    private readonly MODULE_NAME = 'Enemy';

    protected onLoad(): void {
        this.initCollider();
        this.initCombatEntity();
        this.initAnimation();
    }

    protected start(): void {
        this._scale = this.node.getScale();
        this._rigidBody = this.getComponent(RigidBody2D);
        this._patrolOrigin = new Vec2(this.node.position.x, this.node.position.y);
        this.findPlayer();
    }

    protected update(dt: number): void {
        if (this._aiState === AIState.DEAD) return;

        this.setAnimationSpeed(this.animationSpeed);
        this._attackTimer -= dt;

        if (!this._player) {
            this.findPlayer();
        }

        const distToPlayer = this._player
            ? Vec2.distance(
                new Vec2(this.node.position.x, this.node.position.y),
                new Vec2(this._player.position.x, this._player.position.y)
            )
            : Infinity;

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
        this.mcollider.enabled = false;
        this.mcollider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
    }

    private initCombatEntity(): void {
        this.mcombatEntity = this.node.addComponent(CombatEntity);
        this.mcombatEntity.entityType = EntityType.ENEMY;
        this.mcombatEntity.faction = Faction.ENEMY;
        this.mcombatEntity.attackPower = 10;
        this.mcombatEntity.maxHealth = 100;
        // 监听死亡事件，由 CombatEntity 统一管理生命值
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
        if (this._player) {
            Log.debug(this.MODULE_NAME, '找到玩家');
        }
    }

    private setAIState(newState: AIState): void {
        if (this._aiState === newState) return;
        this._aiState = newState;
        Log.debug(this.MODULE_NAME, `AI状态切换: ${AIState[newState]}`);
    }

    private updateAIBehavior(dt: number): void {
        switch (this._aiState) {
            case AIState.PATROL: this.patrol(); break;
            case AIState.CHASE: this.chase(); break;
            case AIState.ATTACK: this.attack(); break;
        }
    }

    private patrol(): void {
        const pos = new Vec2(this.node.position.x, this.node.position.y);
        const offset = pos.clone().subtract(this._patrolOrigin);

        const RANGE = this.patrolRange;
        const BUFFER = 5;

        // 根据位置决定方向（不再用 dot）
        if (offset.x > RANGE + BUFFER) {
            this._patrolDirection = -1;
        } else if (offset.x < -RANGE - BUFFER) {
            this._patrolDirection = 1;
        }

        // 随机行为（仅在安全区）
        if (Math.abs(offset.x) < RANGE * 0.7) {
            if (Math.random() < 0.005) {
                this._patrolDirection *= -1;
            }
        }

        this.moveCharacter(new Vec2(this._patrolDirection, 0));
    }

    private chase(): void {
        if (!this._player) return;
        const dir = new Vec2(
            this._player.position.x - this.node.position.x,
            this._player.position.y - this.node.position.y
        );
        dir.normalize();
        this.moveCharacter(dir);
    }

    private attack(): void {
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }
        if (this._attackTimer <= 0) {
            this.releaseSkill();
            this._attackTimer = this.attackCooldown;
        }
    }

    private moveCharacter(dir: Vec2): void {
        if (dir.lengthSqr() < 0.01) {
            if (this._rigidBody) this._rigidBody.linearVelocity = Vec2.ZERO;
            return;
        }
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = new Vec2(dir.x * this.moveSpeed, dir.y * this.moveSpeed);
        }
        if (dir.x > 0.01) {
            this.node.setScale(Math.abs(this._scale.x), this._scale.y, this._scale.z);
        } else if (dir.x < -0.01) {
            this.node.setScale(-Math.abs(this._scale.x), this._scale.y, this._scale.z);
        }
    }

    private releaseSkill(): void {
        Log.debug(this.MODULE_NAME, '释放技能（攻击）');
        this.onAttackStart();
        if (this.animComp) {
            this.animComp.play('splash');
            this.animComp.once(Animation.EventType.FINISHED, () => this.onAttackEnd(), this);
        } else {
            // 无动画时，短暂开启碰撞后关闭
            this.scheduleOnce(() => this.onAttackEnd(), 0.3);
        }
    }

    private onTriggerEnter(other: Collider2D, _self: Collider2D): void {
        Log.debug(this.MODULE_NAME, `攻击命中: ${other.node.name}`);
        // CombatEntity 会自动处理伤害逻辑
    }

    public onAttackStart(): void {
        // if (this.mcollider) this.mcollider.enabled = true;
    }

    public onAttackEnd(): void {
        // if (this.mcollider) this.mcollider.enabled = false;
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
        Log.debug(this.MODULE_NAME, '敌人死亡');
        this.setAIState(AIState.DEAD);
        if (this._rigidBody) this._rigidBody.linearVelocity = Vec2.ZERO;
        // autoDestroyOnDeath 由 CombatEntity 处理，无需手动 destroy
    }
}
