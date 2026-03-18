import { _decorator, Component, Label, Vec2 } from 'cc';
import { InputManager, InputPlatform, SkillSlot, SkillTouchState, DirectionInput } from './InputManager';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

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

    @property({ tooltip: '移动速度（像素/秒）' })
    public moveSpeed: number = 200;

    @property({ tooltip: '是否根据移动方向自动调整朝向' })
    public autoFacing: boolean = true;

    @property({ tooltip: '朝向平滑插值速度（0-1，0为瞬间转向）' })
    public facingLerpSpeed: number = 0;

    private readonly MODULE_NAME = 'InputManagerExample';
    private _inputManager: InputManager = null;
    private _currentFacingAngle: number = 0;

    start() {
        this._inputManager = InputManager.instance;
        if (!this._inputManager) {
            Log.error(this.MODULE_NAME, 'InputManager 未找到，请确保场景中存在 InputManager 节点');
            return;
        }

        // 显示当前平台
        if (this.platformLabel) {
            this.platformLabel.string = `平台: ${this._inputManager.getPlatform()}`;
        }

        // 订阅技能事件
        this._inputManager.onSkillDown(this._onSkillDown.bind(this));
        this._inputManager.onSkillUp(this._onSkillUp.bind(this));

        Log.log(this.MODULE_NAME, '示例初始化完成');
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
        if (dir.lengthSqr() < 0.01) return;

        // 使用自定义速度移动
        const pos = this.node.position;
        this.node.setPosition(
            pos.x + dir.x * this.moveSpeed * dt,
            pos.y + dir.y * this.moveSpeed * dt,
            pos.z
        );

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

        // 根据槽位执行不同技能
        switch (slot) {
            case SkillSlot.SKILL_1: this._castSkill1(); break;
            case SkillSlot.SKILL_2: this._castSkill2(); break;
            case SkillSlot.SKILL_3: this._castSkill3(); break;
            case SkillSlot.SKILL_4: this._castSkill4(); break;
        }
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

    // ========== 技能实现占位 ==========

    private _castSkill1() { Log.log(this.MODULE_NAME, '释放技能1：普通攻击'); }
    private _castSkill2() { Log.log(this.MODULE_NAME, '释放技能2：冲刺'); }
    private _castSkill3() { Log.log(this.MODULE_NAME, '释放技能3：防御'); }
    private _castSkill4() { Log.log(this.MODULE_NAME, '释放技能4：大招'); }

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
}
