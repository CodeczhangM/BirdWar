import { _decorator, Component, Node, BoxCollider2D, RigidBody2D, Animation, AnimationClip, Vec2, Vec3 } from 'cc';
import { CombatEntity, EntityType, Faction, DamageInfo, DamageType, DamageResult, ActiveStatusEffect, StatusEffectAction } from '../CombatSystem';
import { Log } from '../Logger';
import { InputManager, SkillSlot } from '../InputManager';
import { EntityRegistry } from '../EntityRegistry';
import { SkillManager, RangeType } from './SkillManager';
const { ccclass, property, executionOrder } = _decorator;

enum ActorState {
    IDLE   = 0,
    WALK   = 1,
    SKILL  = 2,  // 技能/攻击中（不可打断）
    HIT    = 3,  // 受击
    DEAD   = 4
}

// 动画剪辑索引约定（与 Animation 组件 clips 数组顺序对应）
const ANIM = {
    IDLE:  5,
    WALK:  6,
    HIT:   7,
    DEAD:  8
} as const;

@ccclass('Actor')
@executionOrder(10)
export class Actor extends Component {

    private mcollider: BoxCollider2D = null;
    private mcombatEntity: CombatEntity = null;
    private mhitcombatEntity: CombatEntity = null;
    private mKickNode: Node = null;
    private animComp: Animation = null!;
    private _skillDownHandler: ((slot: SkillSlot) => void) | null = null;
    private _skillUpHandler: ((slot: SkillSlot) => void) | null = null;
    private _inputManager: InputManager = null;
    private _rigidBody: RigidBody2D = null;

    @property({ tooltip: '是否根据移动方向自动调整朝向' })
    public autoFacing: boolean = true;

    @property({ tooltip: '移动速度（像素/秒）' })
    public moveSpeed: number = 1000;

    private animationClips: AnimationClip[] = [];

    @property({ tooltip: '动画播放速度倍数', range: [0.1, 3, 0.1] })
    public animationSpeed: number = 5.0;

    private readonly MODULE_NAME = 'Actor';
    private readonly MAX_SKILL_COUNT = 7;

    private _scale: Vec3 = Vec3.ZERO;
    private _hitNodeOffsetX: number = 0;
    private _facing: number = 1;
    private _moveDir: Vec2 = new Vec2();

    // ── 状态机 ──
    private _state: ActorState = ActorState.IDLE;

    // skill
    private _skill: SkillManager = null;

    protected onLoad(): void {
        this.initCollider();
        this.initCombatEntity();
        this.initSkillManager();
        this.initAnimation();
        this._enterState(ActorState.IDLE);
    }

    protected start(): void {
        this.registerInputEvents();
        this._scale = this.node.getScale();
        if (this.mcollider) {
            this._hitNodeOffsetX = this.mcollider.offset.x;
        }
    }

    protected update(_dt: number): void {
        if (!this._inputManager) return;
        const dir = this._inputManager.getMoveDirection();
        this._moveDir.x = dir.x;
        this._moveDir.y = dir.y;

        if (this.autoFacing && this._moveDir.lengthSqr() > 0.01) {
            this._updateFacing(this._moveDir);
        }

        this.myfixedUpdate(_dt);
        // 只在可行动状态下切换 IDLE/WALK
        if (this._state === ActorState.IDLE || this._state === ActorState.WALK) {
            if (this._moveDir.lengthSqr() > 0.01) {
                this._enterState(ActorState.WALK);
            } else {
                this._enterState(ActorState.IDLE);
            }
        }
    }

    protected myfixedUpdate(_dt: number): void {  
        if (!this._rigidBody) return;
        // 死亡或受击时停止移动
        if (this._state === ActorState.DEAD || this._state === ActorState.HIT) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
            return;
        }

        if (this._moveDir.lengthSqr() < 0.01) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        } else {
            const speedMult = this.mcombatEntity ? this.mcombatEntity.getMoveSpeedMultiplier() : 1;
            this._rigidBody.linearVelocity = new Vec2(
                this._moveDir.x * this.moveSpeed * speedMult,
                this._moveDir.y * this.moveSpeed * speedMult
            );
        }
    }

    protected onDestroy(): void {
        this.unregisterInputEvents();
    }

    // ========================== 状态机 ==========================

    private _enterState(next: ActorState): void {
        if (this._state === next) return;
        this._state = next;
        switch (next) {
            case ActorState.IDLE:   this._playAnim(ANIM.IDLE);  break;
            case ActorState.WALK:   this._playAnim(ANIM.WALK);  break;
            case ActorState.HIT:    this._playAnim(ANIM.HIT);   break;
            case ActorState.DEAD:   this._playAnim(ANIM.DEAD);  break;
            case ActorState.SKILL:  /* 由 onSkillDown 指定具体动画索引 */ break;
        }
    }

    // ========================== 初始化模块 ==========================

    private initSkillManager() {
        if(!this._skill) {
            this._skill = this.node.addComponent(SkillManager);
            this._skill.skills = [
                {
                    name: '近战攻击',
                    cooldown: 1.5,
                    damage: 2,          // 0 = 使用 attackPower
                    damageType: DamageType.PHYSICAL,
                    range: { type: RangeType.SECTOR, radius: 1000, angle: 90 },
                    castDistance:100,
                    animIndex: 0,
                    duration: 0,
                },
                {
                    name: '圆形爆炸',
                    cooldown: 5,
                    damage: 50,
                    damageType: DamageType.MAGICAL,
                    range: { type: RangeType.CIRCLE, radius: 600 },
                    castDistance:100,
                    animIndex: 1,
                    duration: 0,
                }
            ]
        }
    }


    private initCollider() {
        if (!this.mKickNode) {
            this.mKickNode = this.node.getChildByName("hitNode");
            if (!this.mKickNode) {
                Log.error(this.MODULE_NAME, "get kick node error.");
                return;
            }
            this.mcollider = this.mKickNode.getComponent(BoxCollider2D) || this.mKickNode.addComponent(BoxCollider2D);
            this.mcollider.sensor = true;
        }
        if (!this.mcollider) {
            this.mcollider = this.node.addComponent(BoxCollider2D);
            this.mcollider.sensor = true;
        }
        this.mcollider.enabled = false;

        this._rigidBody = this.getComponent(RigidBody2D);
        if (this._rigidBody) {
            this._rigidBody.gravityScale = 0;
            this._rigidBody.fixedRotation = true;
        }
    }

    private initCombatEntity() {
        if (!this.mhitcombatEntity) {
            this.mhitcombatEntity = this.mKickNode.addComponent(CombatEntity);
            this.mhitcombatEntity.entityType = EntityType.PLAYER;
            this.mhitcombatEntity.faction = Faction.PLAYER;
            this.mhitcombatEntity.attackPower = 20;
            this.mhitcombatEntity.useCustomRule = true;
            this.mhitcombatEntity.customCanCollideWith = EntityType.ENEMY;
            this.mhitcombatEntity.customCanDamage = EntityType.ENEMY;
            this.mhitcombatEntity.customCanBeDamagedBy = EntityType.ENEMY;
            this.mhitcombatEntity._initCollisionRule();
        }

        if (!this.mcombatEntity) {
            this.mcombatEntity = this.node.addComponent(CombatEntity);
            this.mcombatEntity.entityType = EntityType.PLAYER;
            this.mcombatEntity.faction = Faction.PLAYER;
            this.mcombatEntity.attackPower = 0;
            this.mcombatEntity.useCustomRule = true;
            this.mcombatEntity.customCanCollideWith = EntityType.ENEMY | EntityType.DEBUFF | EntityType.BUFF | EntityType.WEAPON;
            this.mcombatEntity.customCanDamage = EntityType.ENEMY;
            this.mcombatEntity.customCanBeDamagedBy = EntityType.ENEMY | EntityType.WEAPON;
            this.mcombatEntity.destroyDelay = 2;
            this.mcombatEntity._initCollisionRule();

            EntityRegistry.instance.register(this.mcombatEntity);

            this.mcombatEntity.onHit((target: CombatEntity) => {
                Log.log(this.MODULE_NAME, `onHit: ${target.node.name}`);
            });

            this.mcombatEntity.onDamage((_damage: DamageInfo, _target: CombatEntity, result: DamageResult) => {
                if (this._state === ActorState.DEAD) return;
                Log.log(this.MODULE_NAME, `onDamage: ${result.finalAmount} (shield absorbed: ${result.absorbedByShield})`);
                this._enterState(ActorState.HIT);
            });

            this.mcombatEntity.onDeath((killer: CombatEntity) => {
                Log.log(this.MODULE_NAME, `onDeath by: ${killer?.node?.name ?? 'unknown'}`);
                this._enterState(ActorState.DEAD);
                EntityRegistry.instance.unregister(this.mcombatEntity);
            });

            this.mcombatEntity.onHeal((requested: number, _source: CombatEntity, actual: number) => {
                Log.log(this.MODULE_NAME, `onHeal: requested=${requested} actual=${actual}`);
            });

            this.mcombatEntity.onShieldChange((current: number, delta: number) => {
                Log.log(this.MODULE_NAME, `onShieldChange: current=${current} delta=${delta}`);
            });

            this.mcombatEntity.onStatusEffect((effect: ActiveStatusEffect, action: StatusEffectAction) => {
                Log.log(this.MODULE_NAME, `onStatusEffect: ${effect.type} action=${action}`);
            });

            this.mcombatEntity.onCollect((collector: CombatEntity) => {
                Log.log(this.MODULE_NAME, `onCollect by: ${collector.node.name}`);
            });

            this.mcombatEntity.onContact((weapon: CombatEntity) => {
                Log.log(this.MODULE_NAME, `onContact weapon: ${weapon.node.name}`);
            });
        }
    }

    private initAnimation() {
        this.animComp = this.getComponent(Animation);
        if (!this.animComp) {
            Log.error(this.MODULE_NAME, "Animation 组件未找到！");
            return;
        }
        this.animationClips = this.animComp.clips || [];
        this.animComp.playOnLoad = false;
        this.setAnimationSpeed(this.animationSpeed);
        this.animComp.on(Animation.EventType.FINISHED, this._onAnimationFinished, this);
    }

    // ========================== 输入事件 ==========================

    private registerInputEvents(): void {
        const inputMgr = InputManager.instance;
        this._inputManager = inputMgr;
        if (!inputMgr) { Log.error(this.MODULE_NAME, 'InputManager not found'); return; }

        this._skillDownHandler = (slot: SkillSlot) => this._onSkillDown(slot);
        this._skillUpHandler   = (slot: SkillSlot) => this._onSkillUp(slot);
        inputMgr.onSkillDown(this._skillDownHandler);
        inputMgr.onSkillUp(this._skillUpHandler);
    }

    private unregisterInputEvents(): void {
        const inputMgr = InputManager.instance;
        if (!inputMgr) return;
        if (this._skillDownHandler) inputMgr.offSkillDown(this._skillDownHandler);
        if (this._skillUpHandler)   inputMgr.offSkillUp(this._skillUpHandler);
    }

    private _onSkillDown(slot: SkillSlot): void {
        if (this._state === ActorState.DEAD) return;
        const skillIndex = slot as number;
        if (skillIndex < 0 || skillIndex >= this.MAX_SKILL_COUNT) return;

        this._state = ActorState.SKILL;
        this._playAnim(skillIndex);
        
        Log.debug(this.MODULE_NAME, "onSkill down");
        if(this._skill) this._skill.useSkill(skillIndex);
    }

    private _onSkillUp(_slot: SkillSlot): void {}

    // ========================== 朝向 ==========================

    private _updateFacing(dir: Vec2) {
        const newFacing = dir.x > 0.01 ? 1 : (dir.x < -0.01 ? -1 : this._facing);
        if (newFacing === this._facing) return;
        this._facing = newFacing;
        if(this._skill) this._skill.facing = newFacing;
        this.node.setScale(Math.abs(this._scale.x) * this._facing, this._scale.y, this._scale.z);
        if (this.mcollider) {
            const off = this.mcollider.offset;
            off.x = this._hitNodeOffsetX * this._facing;
            this.mcollider.offset = off;
        }
    }

    // ========================== 动画 ==========================

    private _playAnim(index: number) {
        if (!this.animComp || index < 0 || index >= this.animationClips.length) return;
        this.animComp.crossFade(this.animationClips[index].name);
    }

    private _onAnimationFinished(): void {
        if (this._state === ActorState.DEAD) return;
        // 技能/受击动画结束后回到 IDLE，让 update 决定是否切 WALK
        this._state = ActorState.IDLE;
        this._playAnim(ANIM.IDLE);
    }

    // ========================== 攻击碰撞（动画事件调用）==========================

    public onAttackStart(): void {
        if (this.mKickNode) this.mKickNode.getComponent(BoxCollider2D).enabled = true;
    }

    public onAttackEnd(): void {
        if (this.mKickNode) this.mKickNode.getComponent(BoxCollider2D).enabled = false;
    }

    // ========================== 工具方法 ==========================

    public setAnimationSpeed(speed: number): void {
        if (!this.animComp) return;
        this.animationClips.forEach(clip => {
            const state = this.animComp.getState(clip.name);
            if (state) state.speed = speed;
        });
    }

    public applySpeedBonus(speedBonus: number): void {
        this.setAnimationSpeed(this.animationSpeed * (1 + speedBonus / 100));
    }
}
