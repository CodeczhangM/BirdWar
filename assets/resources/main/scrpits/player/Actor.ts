import { _decorator, Component, Node, BoxCollider2D, Contact2DType, Collider2D, Animation, AnimationClip } from 'cc';
import { CombatEntity, EntityType, Faction } from '../CombatSystem';
import { Log } from '../Logger';
import { InputManager, SkillSlot } from '../InputManager';
const { ccclass, property } = _decorator;

@ccclass('Actor')
export class Actor extends Component {

    private mcollider : BoxCollider2D = null;
    private mcombatEntity : CombatEntity = null;
    private mKickNode: Node = null;
    // private _isAttacking: boolean = false;
    private animComp : Animation = null!;
    private _skillDownHandler: ((slot: SkillSlot) => void) | null = null;
    private _skillUpHandler: ((slot: SkillSlot) => void) | null = null;

    @property({ tooltip: '动画播放速度倍数', range: [0.1, 3, 0.1] })
    public animationSpeed: number = 5.0;

    private readonly MODULE_NAME = 'Actor';

    protected onLoad(): void {

        if(!this.mKickNode)
        {
            this.mKickNode = this.node.getChildByName("hitNode");
            if(!this.mKickNode)
            {
                Log.error(this.MODULE_NAME, "get kick node error.");
                return;
            }

            this.mcollider = this.mKickNode.getComponent(BoxCollider2D);
            if(!this.mcollider)
            {
                this.mcollider = this.mKickNode.addComponent(BoxCollider2D);
            }

            this.mcollider.sensor = true;

            this.mcollider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
        }

        if(!this.mcollider)
        {
            this.mcollider = this.node.addComponent(BoxCollider2D);
            this.mcollider.sensor = true;
        }

        if(!this.mcombatEntity)
        {
            this.mcombatEntity =  this.node.addComponent(CombatEntity);
            //TODO set default keys.
            this.mcombatEntity.entityType = EntityType.BULLET;
            this.mcombatEntity.faction = Faction.PLAYER; // 玩家子弹
            this.mcombatEntity.attackPower = 20;
        }

        this.animComp = this.getComponent(Animation)!;

        if (!this.animComp) {
            Log.error(this.MODULE_NAME, "Animation 组件未找到！");
            return;
        }

        this.logAllAnimationClips();
        this.animComp.playOnLoad = false;
        this.setAnimationSpeed(this.animationSpeed);
        this.animComp.on(Animation.EventType.FINISHED, this.onKickAnimFinish, this);
        // this.animComp.start();
        this.playIdle();

    }

    protected start(): void {
        Log.debug(this.MODULE_NAME, "Actor onLoad completed, registering input events");
        this.registerInputEvents();
    }

    protected update(): void {
        // 每帧更新动画速度，支持动态调整
        this.setAnimationSpeed(this.animationSpeed);
    }

    protected onDestroy(): void {
        this.unregisterInputEvents();
    }

    private logAllAnimationClips() {
        if (!this.animComp) return;

        const clips = this.animComp.clips;
        Log.debug(this.MODULE_NAME, `=== 总动画数量：${clips.length} ===`);

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            Log.debug(this.MODULE_NAME, `动画 ${i}：${clip.name}`);
        }
    }

    private safePlayAnimation(name: string) {
        if (!this.animComp) return;

        let targetClip: AnimationClip | null = null;

        this.animComp.clips.forEach(clip => {
            Log.debug(this.MODULE_NAME, `✅ clip name：${clip.name}`);
            if (clip.name === name) {
                targetClip = clip;
            }
        });

        if (!targetClip) {
            Log.error(this.MODULE_NAME, `❌ 动画不存在：${name}`);
            return;
        }

        Log.debug(this.MODULE_NAME, `✅ 播放动画：${name}`);
        this.animComp.crossFade(name);
    }

    /**
     * 注册输入事件
     */
    private registerInputEvents(): void {
        const inputMgr = InputManager.instance;
        Log.debug(this.MODULE_NAME, `InputManager instance: ${inputMgr ? 'found' : 'NOT FOUND'}`);

        if (!inputMgr) {
            Log.error(this.MODULE_NAME, 'InputManager not found - cannot register input events');
            return;
        }

        Log.debug(this.MODULE_NAME, 'Registering input events for Actor');

        // 注册技能按键事件 - 使用箭头函数保持this上下文
        const onSkillDownHandler = (slot: SkillSlot) => {
            Log.debug(this.MODULE_NAME, `✅ onSkillDown callback triggered: slot ${slot}`);
            this.onSkillDown(slot);
        };

        const onSkillUpHandler = (slot: SkillSlot) => {
            Log.debug(this.MODULE_NAME, `✅ onSkillUp callback triggered: slot ${slot}`);
            this.onSkillUp(slot);
        };

        inputMgr.onSkillDown(onSkillDownHandler);
        inputMgr.onSkillUp(onSkillUpHandler);

        Log.debug(this.MODULE_NAME, '✅ Input events registered successfully');

        // 保存回调引用以便后续注销
        this._skillDownHandler = onSkillDownHandler;
        this._skillUpHandler = onSkillUpHandler;
    }

    /**
     * 注销输入事件
     */
    private unregisterInputEvents(): void {
        const inputMgr = InputManager.instance;
        if (!inputMgr) return;

        if (this._skillDownHandler) {
            inputMgr.offSkillDown(this._skillDownHandler);
        }
        if (this._skillUpHandler) {
            inputMgr.offSkillUp(this._skillUpHandler);
        }
    }

    /**
     * 技能按下
     */
    private onSkillDown(slot: SkillSlot): void {
        // Log.debug(this.MODULE_NAME, `🎮 onSkillDown called with slot: ${slot}, isAttacking: ${this._isAttacking}`);

        // if (this._isAttacking) {
        //     Log.debug(this.MODULE_NAME, `⏸️  Already attacking, ignoring skill`);
        //     return;
        // }

        Log.debug(this.MODULE_NAME, `⚔️  Starting attack for skill ${slot}`);
        // this._isAttacking = true;

        if(slot === SkillSlot.SKILL_1)
        {
            Log.debug(this.MODULE_NAME, `🎬 Playing kick animation`);
            // this.onAttackStart();
            this.playKick();
           
        }else if(slot == SkillSlot.SKILL_2) {
            this.playJump();
            // this.animComp.once(Animation.EventType.FINISHED, this.onKickAnimFinish, this);
        }else if(slot == SkillSlot.SKILL_3) {
            this.playHurt();
            // this.animComp.once(Animation.EventType.FINISHED, this.onKickAnimFinish, this);
        }
    }

    /**
     * 技能释放
     */
    private onSkillUp(slot: SkillSlot): void {
        Log.debug(this.MODULE_NAME, `🎮 onSkillUp called with slot: ${slot}`);
    }

    /**
     * 触发回调（敌人碰到就会进这里）
     */
    onTriggerEnter(other: Collider2D, self: Collider2D) {
        console.log("攻击命中：", other.node.name);

        // 判断是否是敌人
        // if (other.node.group === "Enemy") {
        //     console.log("命中敌人！造成伤害！");
        //     // 这里写伤害逻辑
        // }
    }


    public onAttackStart() : void {
        Log.debug(this.MODULE_NAME, "onActorAttackedStart");
        if(this.mcollider)
        {
            this.mcollider.enabled = true;
        }
    }


    public onAttackEnd() : void {
        Log.debug(this.MODULE_NAME, "onActorAttackedEnd");
        if(this.mcollider)
        {
            this.mcollider.enabled = false;
        }
    }

    onKickAnimFinish() {
        Log.debug(this.MODULE_NAME, "踢击动画播放完成，切回待机");
        // this.onAttackEnd();
        // this._isAttacking = false;
        this.playIdle();    
    }

    /**
     * 设置动画播放速度
     */
    public setAnimationSpeed(speed: number): void {
        if (!this.animComp) return;

        // 遍历所有动画剪辑并设置速度
        const clips = this.animComp.clips;
        for (const clip of clips) {
            const state = this.animComp.getState(clip.name);
            if (state) {
                state.speed = speed;
            }
        }
    }

    /**
     * 根据属性计算动画速度加成
     * @param baseSpeed 基础速度
     * @param speedBonus 速度加成百分比 (0-100)
     * @returns 计算后的速度
     */
    public calculateAnimationSpeed(baseSpeed: number = 1.0, speedBonus: number = 0): number {
        return baseSpeed * (1 + speedBonus / 100);
    }

    /**
     * 应用速度加成
     * @param speedBonus 速度加成百分比
     */
    public applySpeedBonus(speedBonus: number): void {
        const newSpeed = this.calculateAnimationSpeed(this.animationSpeed, speedBonus);
        this.setAnimationSpeed(newSpeed);
        Log.debug(this.MODULE_NAME, `Speed bonus applied: ${speedBonus}% -> speed: ${newSpeed}`);
    }

    // ================== 封装常用动画控制方法 ==================
    /** 播放 idle 待机动画 */
    playIdle() {
        if (!this.animComp) return;
        this.safePlayAnimation("idel");
    }

    /** 播放 kick 踢击动画 */
    playKick() {
        this.animComp.crossFade("kick");
        // 【可选】监听动画播放完成事件
        // this.animComp.once(Animation.EventType.FINISHED, this.onKickAnimFinish, this);
    }

    /** 播放 jump 跳跃动画 */
    playJump() {
        this.animComp.crossFade("doublejump");
    }

    /** 播放受伤动画 */
    playHurt() {
        this.animComp.crossFade("hurt");
    }

    /** 播放死亡动画 */
    playDying() {
        this.animComp.crossFade("dying");
    }


}


