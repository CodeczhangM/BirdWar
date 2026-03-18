import { _decorator, Component, Node, Label, Sprite, Color, tween, Vec3 } from 'cc';
import { InputManager, SkillSlot, SkillTouchState } from '../InputManager';
import { Log } from '../Logger';

const { ccclass, property } = _decorator;

/**
 * 技能按钮 UI 组件
 * 挂在单个技能按钮节点上，响应 InputManager 的技能事件
 *
 * 节点结构（建议）：
 *   SkillButton (本组件)
 *     ├── Icon      技能图标
 *     ├── Cooldown  冷却遮罩（可选）
 *     └── Label     快捷键提示（PC 端）
 */
@ccclass('SkillButton')
export class SkillButton extends Component {

    @property({ type: Node, tooltip: '技能图标节点' })
    public iconNode: Node = null;

    @property({ type: Label, tooltip: '快捷键标签（PC 端显示）' })
    public keyLabel: Label = null;

    @property({ type: Node, tooltip: '冷却遮罩节点（可选）' })
    public cooldownMask: Node = null;

    @property({ tooltip: '对应的技能槽索引 (0-5)' })
    public slotIndex: number = 0;

    @property({ tooltip: '按下时缩放比例' })
    public pressScale: number = 0.88;

    @property({ tooltip: '按下时的颜色叠加' })
    public pressColor: Color = new Color(180, 180, 180, 255);

    private readonly MODULE_NAME = 'SkillButton';
    private _inputManager: InputManager = null;
    private _normalScale: Vec3 = new Vec3(1, 1, 1);
    private _normalColor: Color = new Color(255, 255, 255, 255);
    private _sprite: Sprite = null;

    onLoad() {
        this._inputManager = InputManager.instance;
        if (!this._inputManager) {
            Log.warn(this.MODULE_NAME, 'InputManager 未找到');
            return;
        }

        this._normalScale = this.node.scale.clone();
        this._sprite = this.iconNode?.getComponent(Sprite) ?? this.node.getComponent(Sprite);
        if (this._sprite) {
            this._normalColor = this._sprite.color.clone();
        }

        // 更新 PC 端快捷键提示
        if (this.keyLabel) {
            this.keyLabel.string = `${this.slotIndex + 1}`;
        }

        this._inputManager.onSkillDown(this._onSkillDown.bind(this));
        this._inputManager.onSkillUp(this._onSkillUp.bind(this));
    }

    onDestroy() {
        if (this._inputManager) {
            this._inputManager.offSkillDown(this._onSkillDown.bind(this));
            this._inputManager.offSkillUp(this._onSkillUp.bind(this));
        }
    }

    private _onSkillDown(slot: SkillSlot, _state: SkillTouchState) {
        if (slot !== this.slotIndex) return;
        this._playPressAnim();
        Log.debug(this.MODULE_NAME, `技能槽 ${slot} 按下`);
    }

    private _onSkillUp(slot: SkillSlot, _state: SkillTouchState) {
        if (slot !== this.slotIndex) return;
        this._playReleaseAnim();
        Log.debug(this.MODULE_NAME, `技能槽 ${slot} 释放`);
    }

    private _playPressAnim() {
        const s = this.pressScale;
        tween(this.node)
            .to(0.06, { scale: new Vec3(s, s, 1) })
            .start();

        if (this._sprite) {
            this._sprite.color = this.pressColor;
        }
    }

    private _playReleaseAnim() {
        tween(this.node)
            .to(0.1, { scale: this._normalScale.clone() })
            .start();

        if (this._sprite) {
            this._sprite.color = this._normalColor.clone();
        }
    }

    /**
     * 手动触发技能（供外部调用，例如 UI 按钮事件）
     */
    public triggerSkill() {
        this._playPressAnim();
        this.scheduleOnce(() => this._playReleaseAnim(), 0.1);
    }
}
