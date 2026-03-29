import { _decorator, Component, Node, BoxCollider2D, RigidBody2D, Contact2DType, Collider2D, Animation, AnimationClip, Vec2, Vec3 } from 'cc';
import { CombatEntity, EntityType, Faction } from '../CombatSystem';
import { Log } from '../Logger';
import { InputManager, SkillSlot } from '../InputManager';
const { ccclass, property, executionOrder } = _decorator;

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
    private _currentFacingAngle: number = 0;

    @property({ tooltip: '是否根据移动方向自动调整朝向' })
    public autoFacing: boolean = true;

    @property({ tooltip: '移动速度（像素/秒）' })
    public moveSpeed: number = 1000;

    // 缓存当前角色的所有动画剪辑（自动对应 Skill 0~6）
    private animationClips: AnimationClip[] = [];

    @property({ tooltip: '动画播放速度倍数', range: [0.1, 3, 0.1] })
    public animationSpeed: number = 5.0;

    private readonly MODULE_NAME = 'Actor';
    // 最大支持技能数量 0~6
    private readonly MAX_SKILL_COUNT = 7;

    private _scale: Vec3 = Vec3.ZERO;

    protected onLoad(): void {
        // 初始化碰撞体
        this.initCollider();
        // 初始化战斗实体
        this.initCombatEntity();
        // 初始化动画组件 & 缓存动画剪辑
        this.initAnimation();

        this.playAnimationByIndex(0); // 默认播放第一个动画（待机）
    }

    protected start(): void {
        Log.debug(this.MODULE_NAME, "Actor onLoad completed, registering input events");
        this.registerInputEvents();
        this._scale = this.node.getScale();
    }

    protected update(dt: number): void {
        this.setAnimationSpeed(this.animationSpeed);

        if (!this._inputManager) return;

        // 每帧读取移动方向，驱动角色移动
        const dir = this._inputManager.getMoveDirection();
        this._moveCharacter(dir, dt);
    }

    protected onDestroy(): void {
        this.unregisterInputEvents();
    }

    // ========================== 初始化模块 ==========================
    private initCollider() {
        if (!this.mKickNode) {
            this.mKickNode = this.node.getChildByName("hitNode");
            if (!this.mKickNode) {
                Log.error(this.MODULE_NAME, "get kick node error.");
                return;
            }

            this.mcollider = this.mKickNode.getComponent(BoxCollider2D) || this.mKickNode.addComponent(BoxCollider2D);
            this.mcollider.sensor = true;
            // this.mcollider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
        }

        if (!this.mcollider) {
            this.mcollider = this.node.addComponent(BoxCollider2D);
            this.mcollider.sensor = true;
        }
        this.mcollider.enabled = false;

        this._rigidBody = this.getComponent(RigidBody2D);
        if (this._rigidBody) {
            Log.log(this.MODULE_NAME, '检测到1111 RigidBody2D，将使用物理移动');
        }
        this._rigidBody.gravityScale = 0;
    }

    private initCombatEntity() {
        if (!this.mhitcombatEntity) {
            this.mhitcombatEntity = this.mKickNode.addComponent(CombatEntity);
            this.mhitcombatEntity.entityType = EntityType.PLAYER;
            this.mhitcombatEntity.faction = Faction.PLAYER;
            this.mhitcombatEntity.attackPower = 20;
            this.mhitcombatEntity.useCustomRule = true;
            this.mhitcombatEntity.customCanCollideWith =  EntityType.ENEMY;
            this.mhitcombatEntity.customCanDamage = EntityType.ENEMY;
            this.mhitcombatEntity.customCanBeDamagedBy = EntityType.ENEMY;
            this.mhitcombatEntity._initCollisionRule();
            // this.mhitcombatEntity.onContact(this.onWeaponContact);
        }

        if(!this.mcombatEntity) {
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
            this.mcombatEntity.onHit((target : CombatEntity) => {
                this.onHit(target);
            });

            this.mcombatEntity.onDeath((killer : CombatEntity) => {
                this.onDeath(killer);
            })
        }

    }

    private onDeath(killer : CombatEntity) {
         Log.log(this.MODULE_NAME, `onDeath`);
         this.playAnimationByIndex(5);
    }

    private onHit(target : CombatEntity) {
        Log.log(this.MODULE_NAME, `onHit : ${target}`);
        this.playAnimationByIndex(3);
      
    }

    private initAnimation() {
        this.animComp = this.getComponent(Animation);
        if (!this.animComp) {
            Log.error(this.MODULE_NAME, "Animation 组件未找到！");
            return;
        }

        // 缓存所有动画剪辑（核心：按数组索引对应技能）
        this.animationClips = this.animComp.clips || [];
        this.logAllAnimationClips();

        this.animComp.playOnLoad = false;
        this.setAnimationSpeed(this.animationSpeed);
        this.animComp.on(Animation.EventType.FINISHED, this.onAnimationFinished, this);
    }

    // ========================== 输入事件 ==========================
    private registerInputEvents(): void {
        const inputMgr = InputManager.instance;
        this._inputManager = inputMgr;
        if (!inputMgr) {
            Log.error(this.MODULE_NAME, 'InputManager not found');
            return;
        }

        this._skillDownHandler = (slot: SkillSlot) => this.onSkillDown(slot);
        this._skillUpHandler = (slot: SkillSlot) => this.onSkillUp(slot);

        inputMgr.onSkillDown(this._skillDownHandler);
        inputMgr.onSkillUp(this._skillUpHandler);
        Log.debug(this.MODULE_NAME, '✅ Input events registered');
    }

    private unregisterInputEvents(): void {
        const inputMgr = InputManager.instance;
        if (!inputMgr) return;

        if (this._skillDownHandler) inputMgr.offSkillDown(this._skillDownHandler);
        if (this._skillUpHandler) inputMgr.offSkillUp(this._skillUpHandler);
    }

    private _moveCharacter(dir: Vec2, dt: number) {
        if (dir.lengthSqr() < 0.01) {
            // 停止移动时，清除速度
            if (this._rigidBody) {
                this._rigidBody.linearVelocity = Vec2.ZERO;
            }
            return;
        }

        // 如果有刚体组件，使用物理移动（支持碰撞检测）
        if (this._rigidBody) {
            //设置线性速度，让物理引擎处理碰撞
            this._rigidBody.linearVelocity = new Vec2(
                dir.x * this.moveSpeed,
                dir.y * this.moveSpeed
            );
        } else {
            // 没有刚体时，使用直接位置移动
            const pos = this.node.position;
            this.node.setPosition(
                pos.x + dir.x * this.moveSpeed * dt,
                pos.y + dir.y * this.moveSpeed * dt,
                pos.z
            );
        }

        // 自动调整朝向
        if (this.autoFacing) {
            this._updateFacing(dir, dt);
        }
    }

    /** 根据移动方向更新角色朝向 */
    private _updateFacing(dir: Vec2, dt: number) {
        // 计算目标角度（弧度）
        
        if (dir.x > 0.01) {
            // 朝右
            this.node.setScale(Math.abs(this._scale.x), this._scale.y, this._scale.z);
        } else if (dir.x < -0.01) {
            // 朝左
            this.node.setScale(Math.abs(this._scale.x) * -1, this._scale.y, this._scale.z);
        }
    }

    /**
     * 技能按下 → 自动播放对应索引的动画
     * Skill 0 → clips[0]
     * Skill 1 → clips[1]
     * ...
     * Skill 6 → clips[6]
     */
    private onSkillDown(slot: SkillSlot): void {
        const skillIndex = slot as number;

        // 越界保护
        if (skillIndex < 0 || skillIndex >= this.MAX_SKILL_COUNT) {
            Log.warn(this.MODULE_NAME, `技能索引 ${skillIndex} 超出支持范围`);
            return;
        }

        Log.debug(this.MODULE_NAME, `🎮 触发技能：${skillIndex}`);
        this.playAnimationByIndex(skillIndex);
    }

    private onSkillUp(slot: SkillSlot): void {
        Log.debug(this.MODULE_NAME, `🎮 技能抬起：${slot}`);
    }

    // ========================== 动态动画播放 ==========================
    /**
     * 根据索引播放动画（核心方法）
     */
    private playAnimationByIndex(index: number) {
        if (!this.animComp || this.animationClips.length === 0) return;
        if (index < 0 || index >= this.animationClips.length) {
            Log.error(this.MODULE_NAME, `❌ 动画索引 ${index} 不存在，当前仅有 ${this.animationClips.length} 个动画`);
            return;
        }

        const clipName = this.animationClips[index].name;
        Log.debug(this.MODULE_NAME, `▶️ 播放动画 [索引:${index}] → ${clipName}`);

        // 攻击动画统一开启碰撞（你可以根据索引自定义规则，比如仅 index>0 开启）
        // if (index > 0) {
        //     this.onAttackStart();
        // }

        this.animComp.crossFade(clipName);
    }

    /**
     * 动画播放完成
     */
    private onAnimationFinished() {
        Log.debug(this.MODULE_NAME, "✅ 动画播放完成");
        Log.debug(this.MODULE_NAME, `✅ this.mcombatEntity.isAlive : ${this.mcombatEntity.isAlive()}`);
        // this.onAttackEnd();
        // 动画结束后默认回到第一个动画（待机）
        if(this.mcombatEntity.isAlive()) {
            this.playAnimationByIndex(0);
        }
    }

    // ========================== 攻击碰撞 ==========================
    onTriggerEnter(other: Collider2D, self: Collider2D) {
        Log.debug(this.MODULE_NAME, "🎯 攻击命中：", other.node.name);
    }

    public onAttackStart(): void {
        Log.debug(this.MODULE_NAME, "🔪 攻击开始 → 开启碰撞");
        // if (this.mcollider) this.mcollider.enabled = true;

        if(this.mKickNode) this.mKickNode.getComponent(BoxCollider2D).enabled = true;
    }

    public onAttackEnd(): void {
        Log.debug(this.MODULE_NAME, "🛡️ 攻击结束 → 关闭碰撞");
        // if (this.mcollider) this.mcollider.enabled = false;

        if(this.mKickNode) this.mKickNode.getComponent(BoxCollider2D).enabled = false;

    }

    // ========================== 工具方法 ==========================
    private logAllAnimationClips() {
        Log.debug(this.MODULE_NAME, `=== 加载动画总数：${this.animationClips.length} ===`);
        this.animationClips.forEach((clip, idx) => {
            Log.debug(this.MODULE_NAME, `[索引 ${idx}] → ${clip.name}`);
        });
    }

    public setAnimationSpeed(speed: number): void {
        if (!this.animComp) return;
        this.animationClips.forEach(clip => {
            const state = this.animComp.getState(clip.name);
            if (state) state.speed = speed;
        });
    }

    public calculateAnimationSpeed(baseSpeed: number = 1.0, speedBonus: number = 0): number {
        return baseSpeed * (1 + speedBonus / 100);
    }

    public applySpeedBonus(speedBonus: number): void {
        const newSpeed = this.calculateAnimationSpeed(this.animationSpeed, speedBonus);
        this.setAnimationSpeed(newSpeed);
        Log.debug(this.MODULE_NAME, `速度加成：${speedBonus}% → ${newSpeed}`);
    }
}