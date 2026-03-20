import { _decorator, Component, Label, Vec2, sp, RigidBody2D } from 'cc';
import { InputManager, InputPlatform, SkillSlot, SkillTouchState, DirectionInput } from './InputManager';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/** 技能配置 */
export interface SkillConfig {
    /** 技能名称 */
    name: string;
    /** Spine 动画名称 */
    animationName: string;
    /** 是否循环播放 */
    loop: boolean;
    /** 自定义回调 */
    onCast?: () => void;
}

/**
 * InputManager 使用示例
 * 演示如何在角色控制器中接入输入系统
 */
@ccclass('InputManagerExample')
export class InputManagerExample extends Component {

    @property({ type: Label, tooltip: '方向显示标签' })
    public dirLabel: Label = null;

    @property({ type: Label, tooltip: '技能显示标签' })
    public skillLabel: Label = null;

    @property({ type: Label, tooltip: '平台显示标签' })
    public platformLabel: Label = null;

    @property({ type: sp.Skeleton, tooltip: 'Spine 骨骼动画组件' })
    public skeleton: sp.Skeleton = null;

    @property({ tooltip: '移动速度（像素/秒）' })
    public moveSpeed: number = 200;

    @property({ tooltip: '是否根据移动方向自动调整朝向' })
    public autoFacing: boolean = true;

    @property({ tooltip: '朝向平滑插值速度（0-1，0为瞬间转向）' })
    public facingLerpSpeed: number = 0;

    @property({ tooltip: '技能1动画名称' })
    public skill1Animation: string = 'attack';

    @property({ tooltip: '技能2动画名称' })
    public skill2Animation: string = 'dash';

    @property({ tooltip: '技能3动画名称' })
    public skill3Animation: string = 'defend';

    @property({ tooltip: '技能4动画名称' })
    public skill4Animation: string = 'ultimate';

    @property({ tooltip: '技能5动画名称' })
    public skill5Animation: string = 'skill5';

    @property({ tooltip: '技能6动画名称' })
    public skill6Animation: string = 'skill6';

    private readonly MODULE_NAME = 'InputManagerExample';
    private _inputManager: InputManager = null;
    private _currentFacingAngle: number = 0;
    private _skillConfigs: Map<SkillSlot, SkillConfig> = new Map();
    private _rigidBody: RigidBody2D = null;

    start() {
        this._inputManager = InputManager.instance;
        if (!this._inputManager) {
            Log.error(this.MODULE_NAME, 'InputManager 未找到，请确保场景中存在 InputManager 节点');
            return;
        }

        // 初始化技能配置
        this._initSkillConfigs();

        // 显示当前平台
        if (this.platformLabel) {
            this.platformLabel.string = `平台: ${this._inputManager.getPlatform()}`;
        }

        this.skeleton = this.getComponent(sp.Skeleton);
        
        // 获取刚体组件（如果存在）
        this._rigidBody = this.getComponent(RigidBody2D);
        if (this._rigidBody) {
            Log.log(this.MODULE_NAME, '检测到 RigidBody2D，将使用物理移动');
        }
        
        // 订阅技能事件
        this._inputManager.onSkillDown(this._onSkillDown.bind(this));
        this._inputManager.onSkillUp(this._onSkillUp.bind(this));

        Log.log(this.MODULE_NAME, '示例初始化完成');
    }

    /** 初始化技能配置 */
    private _initSkillConfigs() {
        this._skillConfigs.set(SkillSlot.SKILL_1, {
            name: '技能1',
            animationName: this.skill1Animation,
            loop: false
        });
        this._skillConfigs.set(SkillSlot.SKILL_2, {
            name: '技能2',
            animationName: this.skill2Animation,
            loop: false
        });
        this._skillConfigs.set(SkillSlot.SKILL_3, {
            name: '技能3',
            animationName: this.skill3Animation,
            loop: false
        });
        this._skillConfigs.set(SkillSlot.SKILL_4, {
            name: '技能4',
            animationName: this.skill4Animation,
            loop: false
        });
        this._skillConfigs.set(SkillSlot.SKILL_5, {
            name: '技能5',
            animationName: this.skill5Animation,
            loop: false
        });
        this._skillConfigs.set(SkillSlot.SKILL_6, {
            name: '技能6',
            animationName: this.skill6Animation,
            loop: false
        });
    }

    onDestroy() {
        if (this._inputManager) {
            this._inputManager.offSkillDown(this._onSkillDown.bind(this));
            this._inputManager.offSkillUp(this._onSkillUp.bind(this));
        }
    }

    update(dt: number) {
        if (!this._inputManager) return;

        // 每帧读取移动方向，驱动角色移动
        const dir = this._inputManager.getMoveDirection();
        this._moveCharacter(dir, dt);

        // 更新 UI 显示
        if (this.dirLabel) {
            const flags = this._inputManager.getDirectionFlags();
            const arrows = [
                (flags & DirectionInput.UP)    ? '↑' : '',
                (flags & DirectionInput.DOWN)  ? '↓' : '',
                (flags & DirectionInput.LEFT)  ? '←' : '',
                (flags & DirectionInput.RIGHT) ? '→' : ''
            ].join(' ');
            this.dirLabel.string = `方向: ${arrows || '无'} (${dir.x.toFixed(2)}, ${dir.y.toFixed(2)})`;
        }
    }

    // ========== 角色移动示例 ==========

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
            // 设置线性速度，让物理引擎处理碰撞
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
        const targetAngle = Math.atan2(dir.y, dir.x);
        
        // 平滑插值到目标角度
        if (this.facingLerpSpeed > 0) {
            // 处理角度差异，确保选择最短旋转路径
            let angleDiff = targetAngle - this._currentFacingAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            this._currentFacingAngle += angleDiff * this.facingLerpSpeed;
        } else {
            // 瞬间转向
            this._currentFacingAngle = targetAngle;
        }

        // 将弧度转换为角度并应用到节点（Cocos 使用角度）
        const degrees = this._currentFacingAngle * (180 / Math.PI);
        this.node.angle = -degrees; // 负号是因为 Cocos 的角度系统
    }

    // ========== 技能事件处理 ==========

    private _onSkillDown(slot: SkillSlot, state: SkillTouchState) {
        Log.log(this.MODULE_NAME, `技能 ${slot + 1} 按下`);
        this._updateSkillLabel();

        // 使用配置系统执行技能
        this.castSkill(slot);
    }

    private _onSkillUp(slot: SkillSlot, state: SkillTouchState) {
        Log.log(this.MODULE_NAME, `技能 ${slot + 1} 释放，按压时长: ${state.holdTime.toFixed(2)}s`);
        this._updateSkillLabel();
    }

    private _updateSkillLabel() {
        if (!this.skillLabel || !this._inputManager) return;
        const skills = Array.from({ length: 4 }, (_, i) =>
            this._inputManager.isSkillActive(i as SkillSlot) ? `[${i + 1}]` : ` ${i + 1} `
        );
        this.skillLabel.string = `技能: ${skills.join(' ')}`;
    }

    // ========== 技能系统 ==========

    /** 执行指定技能槽的技能 */
    public castSkill(slot: SkillSlot) {
        const config = this._skillConfigs.get(slot);
        if (!config) {
            Log.warn(this.MODULE_NAME, `技能槽 ${slot} 未配置`);
            return;
        }

        Log.log(this.MODULE_NAME, `释放技能: ${config.name}`);

        // 播放 Spine 动画
        if (this.skeleton && config.animationName) {
            Log.warn(this.MODULE_NAME, '准备播放技能动画: ' + config.animationName);
            this.playSkillAnimation(config.animationName, config.loop);
        }

        // 执行自定义回调
        if (config.onCast) {
            config.onCast();
        }
    }

    /** 播放技能动画 */
    public playSkillAnimation(animationName: string, loop: boolean = false) {
        if (!this.skeleton) {
            Log.warn(this.MODULE_NAME, 'Skeleton 组件未设置');
            return;
        }

        try {
            this.skeleton.setAnimation(0, animationName, loop);
            Log.log(this.MODULE_NAME, `播放动画: ${animationName}, 循环: ${loop}`);
        } catch (error) {
            Log.error(this.MODULE_NAME, `播放动画失败: ${animationName}`, error);
        }
    }

    // ========== 公共接口 ==========

    /** 手动打印调试信息 */
    public debugInput() {
        this._inputManager?.debugInfo();
    }

    /** 手动设置朝向角度（度数） */
    public setFacing(degrees: number) {
        this._currentFacingAngle = degrees * (Math.PI / 180);
        this.node.angle = -degrees;
    }

    /** 获取当前朝向角度（度数） */
    public getFacing(): number {
        return this._currentFacingAngle * (180 / Math.PI);
    }

    /** 设置移动速度 */
    public setMoveSpeed(speed: number) {
        this.moveSpeed = speed;
    }

    /** 获取移动速度 */
    public getMoveSpeed(): number {
        return this.moveSpeed;
    }

    /** 设置技能配置 */
    public setSkillConfig(slot: SkillSlot, config: SkillConfig) {
        this._skillConfigs.set(slot, config);
        Log.log(this.MODULE_NAME, `技能槽 ${slot} 配置已更新: ${config.name}`);
    }

    /** 获取技能配置 */
    public getSkillConfig(slot: SkillSlot): SkillConfig | undefined {
        return this._skillConfigs.get(slot);
    }

    /** 设置技能动画名称 */
    public setSkillAnimation(slot: SkillSlot, animationName: string, loop: boolean = false) {
        const config = this._skillConfigs.get(slot);
        if (config) {
            config.animationName = animationName;
            config.loop = loop;
            Log.log(this.MODULE_NAME, `技能槽 ${slot} 动画已更新: ${animationName}`);
        }
    }

    /** 设置技能回调 */
    public setSkillCallback(slot: SkillSlot, callback: () => void) {
        const config = this._skillConfigs.get(slot);
        if (config) {
            config.onCast = callback;
            Log.log(this.MODULE_NAME, `技能槽 ${slot} 回调已设置`);
        }
    }

    /** 获取所有技能配置 */
    public getAllSkillConfigs(): Map<SkillSlot, SkillConfig> {
        return new Map(this._skillConfigs);
    }
}
