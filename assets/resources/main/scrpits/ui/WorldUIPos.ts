import { _decorator, Component, Node, Camera, Vec3, UITransform, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WorldUIPos')
export class WorldUIPos extends Component {

    @property(Node)
    targetNode: Node = null; // 目标3D节点

    @property(Camera)
    camera: Camera = null; // 主相机

    @property(Node)
    uiNode: Node = null; // UI节点（例如Label所在节点）

    @property(Label)
    label: Label = null; // 显示文本

    private _worldPos = new Vec3();
    private _screenPos = new Vec3();
    private _uiPos = new Vec3();

    update() {
        // 1. 获取世界坐标
        this._worldPos = this.targetNode.worldPosition.clone();

        // 2. 世界坐标 → 屏幕坐标
        this.camera.worldToScreen(this._worldPos, this._screenPos);

        // 3. 屏幕坐标 → UI坐标
        const uiTransform = this.uiNode.parent.getComponent(UITransform);
        uiTransform.convertToNodeSpaceAR(this._screenPos, this._uiPos);

        // 4. 设置UI位置
        // this.uiNode.setPosition(this._uiPos);

        // 5. 显示文本
        this.label.string = `World: (${this._worldPos.x.toFixed(2)}, ${this._worldPos.y.toFixed(2)}, ${this._worldPos.z.toFixed(2)})`;
    }
}


