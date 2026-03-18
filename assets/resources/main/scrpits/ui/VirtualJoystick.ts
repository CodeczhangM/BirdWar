import { _decorator, Component, Node, Vec2, UITransform, Widget } from 'cc';
import { InputManager, InputState } from '../InputManager';
import { Log } from '../Logger';

const { ccclass, property } = _decorator;

/**
 * 虚拟摇杆 UI 组件
 * 挂在摇杆根节点上，根据 InputManager 的摇杆状态驱动 UI 显示
 *
 * 节点结构：
 *   VirtualJoystick (本组件)
 *     ├── Background   摇杆底盘（始终显示）
 *     └── Thumb        摇杆拇指（跟随偏移）
 */
@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {

    @property({ type: Node, tooltip: '摇杆底盘节点' })
    public background: Node = null;

    @property({ type: Node, tooltip: '摇杆拇指节点' })
    public thumb: Node = null;

    @property({ tooltip: '摇杆最大偏移半径（UI 像素）' })
    public maxRadius: number = 80;

    @property({ tooltip: '不活跃时隐藏底盘' })
    public hideWhenIdle: boolean = false;

    private readonly MODULE_NAME = 'VirtualJoystick';
    private _inputManager: InputManager = null;
    private _inputCb: (state: InputState) => void = null;

    onLoad() {
        this._inputManager = InputManager.instance;
        if (!this._inputManager) {
            Log.warn(this.MODULE_NAME, 'InputManager 未找到，VirtualJoystick 无法工作');
            return;
        }

        this._inputCb = (state) => this._onInputChange(state);
        this._inputManager.onInputChange(this._inputCb);

        // 初始状态
        this._setThumbOffset(new Vec2(0, 0));
        if (this.hideWhenIdle && this.background) {
            this.background.active = false;
        }
    }

    onDestroy() {
        if (this._inputManager && this._inputCb) {
            this._inputManager.offInputChange(this._inputCb);
        }
    }

    private _onInputChange(state: InputState) {
        const joystick = state.joystick;

        if (this.background) {
            if (this.hideWhenIdle) {
                this.background.active = joystick.active;
            }

            // 将摇杆起始点（屏幕坐标）转换为 UI 本地坐标并移动底盘
            if (joystick.active) {
                const uiPos = this._screenToUI(joystick.startPos);
                this.background.setPosition(uiPos.x, uiPos.y, 0);
            }
        }

        if (this.thumb) {
            const offset = new Vec2(
                joystick.direction.x * this.maxRadius,
                joystick.direction.y * this.maxRadius
            );
            this._setThumbOffset(offset);
        }
    }

    private _setThumbOffset(offset: Vec2) {
        if (this.thumb) {
            this.thumb.setPosition(offset.x, offset.y, 0);
        }
    }

    /**
     * 将屏幕坐标（左下原点）转换为本节点父级的 UI 本地坐标
     */
    private _screenToUI(screenPos: Vec2): Vec2 {
        const parent = this.node.parent;
        if (!parent) return new Vec2(screenPos.x, screenPos.y);

        const uiTransform = parent.getComponent(UITransform);
        if (!uiTransform) return new Vec2(screenPos.x, screenPos.y);

        const worldPos = uiTransform.convertToNodeSpaceAR(
            new Vec2(screenPos.x, screenPos.y) as any
        );
        return new Vec2((worldPos as any).x, (worldPos as any).y);
    }
}
