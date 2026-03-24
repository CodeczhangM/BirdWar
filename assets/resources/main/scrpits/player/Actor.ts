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
    private _isAttacking: boolean = false;
    private animComp : Animation = null!;
    private _skillDownHandler: ((slot: SkillSlot) => void) | null = null;
    private _skillUpHandler: ((slot: SkillSlot) => void) | null = null;

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
        // this.animComp.start();
        this.playIdle();

    }

    protected start(): void {
        Log.debug(this.MODULE_NAME, "Actor onLoad completed, registering input events");
        this.registerInputEvents();
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
        this.animComp.play(name);
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
        Log.debug(this.MODULE_NAME, `🎮 onSkillDown called with slot: ${slot}, isAttacking: ${this._isAttacking}`);

        if (this._isAttacking) {
            Log.debug(this.MODULE_NAME, `⏸️  Already attacking, ignoring skill`);
            return;
        }

        Log.debug(this.MODULE_NAME, `⚔️  Starting attack for skill ${slot}`);
        this._isAttacking = true;

        if(slot === SkillSlot.SKILL_1)
        {
            Log.debug(this.MODULE_NAME, `🎬 Playing kick animation`);
            this.onAttackStart();
            this.animComp.play("kick");
            this.animComp.once(Animation.EventType.FINISHED, this.onKickAnimFinish, this);
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
        this.playIdle();
        this._isAttacking = false;
    }

    // ================== 封装常用动画控制方法 ==================
    /** 播放 idle 待机动画 */
    playIdle() {
        if (!this.animComp) return;
        this.safePlayAnimation("idel");
    }

    /** 播放 kick 踢击动画 */
    playKick() {
        this.animComp.play("kick");
        // 【可选】监听动画播放完成事件
        this.animComp.once(Animation.EventType.FINISHED, this.onKickAnimFinish, this);
    }

    /** 播放 jump 跳跃动画 */
    playJump() {
        this.animComp.play("doublejump");
    }

    /** 播放受伤动画 */
    playHurt() {
        this.animComp.play("hurt");
    }

    /** 播放死亡动画 */
    playDying() {
        this.animComp.play("dying");
    }


}


