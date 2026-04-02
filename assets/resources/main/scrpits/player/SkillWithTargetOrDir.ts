import { _decorator, Component, Node, Vec3, CCFloat, BoxCollider, Collider2D, BoxCollider2D } from 'cc';
import { Log } from '../Logger';
const { ccclass, property } = _decorator;

@ccclass('SkillWithTargetOrDir')
export class SkillWithTargetOrDir extends Component {

    /* 编辑器可配置参数 */
    @property({ tooltip: '移动方向（世界坐标系，例如 1,0,0 向右）' })
    public moveDir: Vec3 = new Vec3(1, 0, 0); // 默认向右

    @property({ tooltip: '加速度', type: CCFloat })
    public acceleration: number = 5; // 加速度大小

    @property({ tooltip: '最大速度（防止速度无限叠加）', type: CCFloat })
    public maxSpeed: number = 50;

    /* 内部参数 */
    private currentSpeed: number = 0; // 当前实时速度

    private MODULE_NAME : string = "SkillWithTargetOrDir";

    protected onLoad(): void {
   
    }


    start() {
        // 初始化：归一化方向向量（保证方向正确，不受长度影响）
        this.moveDir.normalize();
    }

    update(deltaTime: number) {
        this.moveUpdate(deltaTime);
    }

    /**
     * 加速移动逻辑
     */
    private moveUpdate(dt: number) {
        // 1. 速度叠加加速度（限制最大速度）
        this.currentSpeed += this.acceleration * dt;
        this.currentSpeed = Math.min(this.currentSpeed, this.maxSpeed);

        // 2. 计算位移量 = 方向 * 当前速度 * 时间
        const offset = new Vec3();
        Vec3.multiplyScalar(offset, this.moveDir, this.currentSpeed * dt);

        // 3. 应用位移（世界空间移动）
        this.node.translate(offset, Node.NodeSpace.WORLD);
    }

    /**
     * 外部调用：重置速度（技能复用/重置时使用）
     */
    public resetSpeed() {
        this.currentSpeed = 0;
    }
}