import { _decorator, Component, Node, Camera, Rect, view, gfx } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 多相机管理器
 * 主相机渲染整个屏幕，子相机只渲染 UI 的小部分区域
 */
@ccclass('MultiCamManager')
export class MultiCamManager extends Component {
    @property(Camera)
    mainCamera: Camera = null!; // 主相机

    @property(Camera)
    subCamera: Camera = null!;  // 子 UI 相机

    @property({ tooltip: '子相机宽度（像素）' })
    subCameraWidth: number = 300;

    @property({ tooltip: '子相机高度（像素）' })
    subCameraHeight: number = 200;

    @property({ tooltip: '子相机右边距（像素）' })
    subCameraMarginRight: number = 20;

    @property({ tooltip: '子相机上边距（像素）' })
    subCameraMarginTop: number = 20;

    start() {
        // 强制配置多相机核心参数（防止手动配置出错）
        this.setupMultiCamera();
    }

    /** 多相机核心配置（确保画面共存） */
    setupMultiCamera() {
        if (!this.mainCamera || !this.subCamera) {
            console.error('[MultiCamManager] 主相机或子相机未设置');
            return;
        }

        // 1. 主相机：全屏渲染，清空颜色+深度缓冲区
        this.mainCamera.camera.viewport = new Rect(0, 0, 1, 1);
        this.mainCamera.clearFlags = gfx.ClearFlagBit.COLOR | gfx.ClearFlagBit.DEPTH_STENCIL;
        this.mainCamera.priority = 0; // 先渲染

        // 2. 子相机：右上角小窗口，只清深度，不清颜色（保留主相机渲染结果）
        this.adjustSubCameraViewport();
        this.subCamera.clearFlags = gfx.ClearFlagBit.DEPTH_STENCIL; // ✅ 关键：只清深度，不清颜色
        this.subCamera.priority = 10; // 后渲染，叠加在主相机之上

        // 如果需要限制子相机只渲染特定层级，取消下面注释
        // this.subCamera.visibility = 1 << 18; // 只渲染 18 号层级（UI_Sub）

        // 3. 适配屏幕分辨率变化
        view.on('canvas-resize', this.adjustSubCameraViewport, this);

        console.log('[MultiCamManager] 多相机配置完成');
        console.log('  主相机 viewport:', this.mainCamera.camera.viewport);
        console.log('  主相机 clearFlags:', this.mainCamera.clearFlags);
        console.log('  主相机 priority:', this.mainCamera.priority);
        console.log('  子相机 viewport:', this.subCamera.camera.viewport);
        console.log('  子相机 clearFlags:', this.subCamera.clearFlags);
        console.log('  子相机 priority:', this.subCamera.priority);
    }

    /** 动态调整子相机视口（像素转比例） */
    adjustSubCameraViewport() {
        if (!this.subCamera) return;

        const canvasSize = view.getCanvasSize();
        
        // 计算子相机在屏幕上的像素位置（右上角）
        const subX = canvasSize.width - this.subCameraWidth - this.subCameraMarginRight;
        const subY = canvasSize.height - this.subCameraHeight - this.subCameraMarginTop;
        
        // 转换为视口比例（Cocos 视口原点为屏幕左下角，y 轴向上）
        const viewportX = 1.0 - subX / canvasSize.width;
        const viewportY = 1.0 - subY / canvasSize.height;
        const viewportW = this.subCameraWidth / canvasSize.width;
        const viewportH = this.subCameraHeight / canvasSize.height;
        
        // 更新子相机视口
        this.subCamera.camera.viewport = new Rect(viewportX, viewportY, viewportW, viewportH);

        console.log('[MultiCamManager] 子相机视口已更新:', this.subCamera.camera.viewport);
    }

    onDestroy() {
        view.off('canvas-resize', this.adjustSubCameraViewport, this);
    }
}


