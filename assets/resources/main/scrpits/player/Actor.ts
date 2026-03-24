import { _decorator, Component, Node, BoxCollider2D, Contact2DType, Collider2D, Animation, AnimationClip } from 'cc';
import { CombatEntity, EntityType, Faction } from '../CombatSystem';
import { Log } from '../Logger';
import { InputManager, SkillSlot } from '../InputManager';
const { ccclass, property } = _decorator;

@ccclass('Actor')
export class Actor extends Component {

    private mcollider: BoxCollider2D = null;
    private mcombatEntity: CombatEntity = null;
    private mKickNode: Node = null;
    private animComp: Animation = null!;
    private _skillDownHandler: ((slot: SkillSlot) => void) | null = null;
    private _skillUpHandler: ((slot: SkillSlot) => void) | null = null;

    // 缓存当前角色的所有动画剪辑（自动对应 Skill 0~6）
    private animationClips: AnimationClip[] = [];

    @property({ tooltip: '动画播放速度倍数', range: [0.1, 3, 0.1] })
    public animationSpeed: number = 5.0;

    private readonly MODULE_NAME = 'Actor';
    // 最大支持技能数量 0~6
    private readonly MAX_SKILL_COUNT = 7;

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
    }

    protected update(): void {
        this.setAnimationSpeed(this.animationSpeed);
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
            this.mcollider.on(Contact2DType.BEGIN_CONTACT, this.onTriggerEnter, this);
        }

        if (!this.mcollider) {
            this.mcollider = this.node.addComponent(BoxCollider2D);
            this.mcollider.sensor = true;
        }
        this.mcollider.enabled = false;
    }

    private initCombatEntity() {
        if (!this.mcombatEntity) {
            this.mcombatEntity = this.node.addComponent(CombatEntity);
            this.mcombatEntity.entityType = EntityType.BULLET;
            this.mcombatEntity.faction = Faction.PLAYER;
            this.mcombatEntity.attackPower = 20;
        }
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
        if (index > 0) {
            this.onAttackStart();
        }

        this.animComp.crossFade(clipName);
    }

    /**
     * 动画播放完成
     */
    private onAnimationFinished() {
        Log.debug(this.MODULE_NAME, "✅ 动画播放完成");
        this.onAttackEnd();
        // 动画结束后默认回到第一个动画（待机）
        this.playAnimationByIndex(0);
    }

    // ========================== 攻击碰撞 ==========================
    onTriggerEnter(other: Collider2D, self: Collider2D) {
        Log.debug(this.MODULE_NAME, "🎯 攻击命中：", other.node.name);
    }

    public onAttackStart(): void {
        Log.debug(this.MODULE_NAME, "🔪 攻击开始 → 开启碰撞");
        if (this.mcollider) this.mcollider.enabled = true;
    }

    public onAttackEnd(): void {
        Log.debug(this.MODULE_NAME, "🛡️ 攻击结束 → 关闭碰撞");
        if (this.mcollider) this.mcollider.enabled = false;
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