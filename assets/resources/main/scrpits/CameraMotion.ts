import { _decorator, Component, Node, Vec3, Camera } from 'cc';
import { DungeonController } from './DungeonController';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 相机运动控制器
 * 跟踪目标（主角），并限制在地图边界内
 */
@ccclass('CameraMotion')
export class CameraMotion extends Component {
    
    @property({ type: Node, tooltip: '跟踪目标（主角）' })
    target: Node = null;

    @property({ type: Node, tooltip: '地牢控制器节点' })
    dungeonControllerNode: Node = null;

    @property({ tooltip: '跟踪平滑度（0-1，越大越平滑）' })
    smoothness: number = 0.1;

    @property({ tooltip: '是否启用边界限制' })
    enableBoundary: boolean = true;

    @property({ tooltip: '边界内边距（像素）' })
    boundaryPadding: number = 50;

    @property({ tooltip: '是否在 start 时自动初始化' })
    autoInitialize: boolean = true;

    @property({ tooltip: '输出调试信息' })
    debugMode: boolean = false;

    private readonly MODULE_NAME = 'CameraMotion';
    private _dungeonController: DungeonController = null;
    private _camera: Camera = null;
    private _mapBounds: { minX: number, maxX: number, minY: number, maxY: number } = null;
    private _cameraHalfWidth: number = 0;
    private _cameraHalfHeight: number = 0;
    private _targetPosition: Vec3 = new Vec3();
    private _initialized: boolean = false;

    onLoad() {
        this._camera = this.getComponent(Camera);
        if (!this._camera) {
            Log.error(this.MODULE_NAME, 'Camera 组件未找到');
            return;
        }

        this._calculateCameraSize();
        
        if (this.debugMode) {
            Log.log(this.MODULE_NAME, '=== CameraMotion onLoad ===');
            Log.log(this.MODULE_NAME, `相机半宽: ${this._cameraHalfWidth}, 半高: ${this._cameraHalfHeight}`);
        }
    }

    start() {
        if (this.autoInitialize) {
            this.initialize();
        }
    }

    /**
     * 初始化相机
     */
    public initialize(): boolean {
        if (this.debugMode) {
            Log.log(this.MODULE_NAME, '=== 初始化相机 ===');
        }

        // 查找地牢控制器
        if (!this._dungeonController) {
            this._dungeonController = this._findDungeonController();
            if (!this._dungeonController) {
                Log.error(this.MODULE_NAME, '未找到 DungeonController');
                return false;
            }
        }

        // 计算地图边界
        this._calculateMapBounds();

        // 如果有目标，立即移动到目标位置（应用边界限制）
        if (this.target) {
            this._targetPosition.set(this.target.position);
            
            // if (this.enableBoundary && this._mapBounds) {
            //     this._applyBoundaryConstraints();
            // }
            
            this.node.setPosition(this._targetPosition);
            
            if (this.debugMode) {
                Log.log(this.MODULE_NAME, `目标位置: ${this.target.position}`);
                Log.log(this.MODULE_NAME, `应用边界后位置: ${this._targetPosition}`);
                Log.log(this.MODULE_NAME, `相机初始位置已设置`);
            }
        }

        this._initialized = true;
        
        if (this.debugMode) {
            this.debugInfo();
        }

        return true;
    }

    update(deltaTime: number) {
        if (!this._initialized || !this.target) {
            return;
        }

        // 计算目标位置
        this._targetPosition.set(this.target.position);

        // 应用边界限制
        if (this.enableBoundary && this._mapBounds) {
            this._applyBoundaryConstraints();
        }

        // 平滑跟踪
        const currentPos = this.node.position;
        const newX = currentPos.x + (this._targetPosition.x - currentPos.x) * this.smoothness;
        const newY = currentPos.y + (this._targetPosition.y - currentPos.y) * this.smoothness;
        const newZ = currentPos.z + (this._targetPosition.z - currentPos.z) * this.smoothness;

        this.node.setPosition(newX, newY, newZ);
    }

    /**
     * 应用边界约束
     */
    private _applyBoundaryConstraints() {
        const bounds = this._mapBounds;
        
        // 限制 X 轴
        if (this._targetPosition.x - this._cameraHalfWidth < bounds.minX) {
            this._targetPosition.x = bounds.minX + this._cameraHalfWidth;
        } else if (this._targetPosition.x + this._cameraHalfWidth > bounds.maxX) {
            this._targetPosition.x = bounds.maxX - this._cameraHalfWidth;
        }

        // 限制 Y 轴
        if (this._targetPosition.y - this._cameraHalfHeight < bounds.minY) {
            this._targetPosition.y = bounds.minY + this._cameraHalfHeight;
        } else if (this._targetPosition.y + this._cameraHalfHeight > bounds.maxY) {
            this._targetPosition.y = bounds.maxY - this._cameraHalfHeight;
        }
    }

    /**
     * 计算地图边界
     */
    private _calculateMapBounds() {
        if (!this._dungeonController) {
            Log.error(this.MODULE_NAME, '地牢控制器未设置');
            return;
        }

        const dungeonGenerator = this._dungeonController.dungeonGenerator;
        if (!dungeonGenerator) {
            Log.error(this.MODULE_NAME, '地牢生成器未设置');
            return;
        }

        const tileSize = this._dungeonController.tileSize;
        const pixelSize = dungeonGenerator.getDungeonPixelSize(tileSize);

        // 计算边界，考虑相机尺寸
        const halfWidth = this._cameraHalfWidth;
        const halfHeight = this._cameraHalfHeight;

        this._mapBounds = {
            minX: halfWidth + this.boundaryPadding,
            maxX: pixelSize.width - halfWidth - this.boundaryPadding,
            minY: halfHeight + this.boundaryPadding,
            maxY: pixelSize.height - halfHeight - this.boundaryPadding
        };

        // 确保边界有效（地图不能小于相机视野）
        if (this._mapBounds.minX >= this._mapBounds.maxX) {
            this._mapBounds.minX = pixelSize.width / 2;
            this._mapBounds.maxX = pixelSize.width / 2;
        }
        if (this._mapBounds.minY >= this._mapBounds.maxY) {
            this._mapBounds.minY = pixelSize.height / 2;
            this._mapBounds.maxY = pixelSize.height / 2;
        }

        if (this.debugMode) {
            Log.log(this.MODULE_NAME, '地图像素尺寸:', pixelSize);
            Log.log(this.MODULE_NAME, '相机半尺寸:', { halfWidth, halfHeight });
            Log.log(this.MODULE_NAME, '地图边界:', this._mapBounds);
        }
    }

    /**
     * 计算相机尺寸
     */
    private _calculateCameraSize() {
        if (!this._camera) return;

        // 获取相机的可视区域尺寸
        const orthoHeight = this._camera.orthoHeight;
        
        // 简单使用默认宽高比
        const aspect = 1.5; // 默认 960/640

        this._cameraHalfHeight = orthoHeight;
        this._cameraHalfWidth = orthoHeight * aspect;

        if (this.debugMode) {
            Log.log(this.MODULE_NAME, `相机尺寸计算: orthoHeight=${orthoHeight}, aspect=${aspect}`);
            Log.log(this.MODULE_NAME, `相机半宽=${this._cameraHalfWidth}, 半高=${this._cameraHalfHeight}`);
        }
    }

    /**
     * 查找地牢控制器
     */
    private _findDungeonController(): DungeonController | null {
        // 如果指定了节点，直接从该节点获取
        if (this.dungeonControllerNode) {
            const controller = this.dungeonControllerNode.getComponent(DungeonController);
            if (controller) {
                if (this.debugMode) {
                    Log.log(this.MODULE_NAME, '从指定节点找到 DungeonController');
                }
                return controller;
            }
        }

        // 尝试从场景中查找
        const controller = this._findComponentInScene(DungeonController);
        if (controller) {
            if (this.debugMode) {
                Log.log(this.MODULE_NAME, '从场景中找到 DungeonController');
            }
            return controller;
        }

        return null;
    }

    /**
     * 在场景中查找组件
     */
    private _findComponentInScene<T extends Component>(componentType: new () => T): T | null {
        const scene = this.node.scene;
        if (!scene) return null;

        const findInNode = (node: Node): T | null => {
            const component = node.getComponent(componentType);
            if (component) return component;

            for (const child of node.children) {
                const found = findInNode(child);
                if (found) return found;
            }

            return null;
        };

        return findInNode(scene);
    }

    /**
     * 设置跟踪目标
     */
    public setTarget(target: Node) {
        this.target = target;
        
        if (this.debugMode) {
            Log.log(this.MODULE_NAME, `设置跟踪目标: ${target?.name}`);
        }

        // 如果已初始化，立即移动到目标位置
        if (this._initialized && target) {
            this.node.setPosition(target.position);
        }
    }

    /**
     * 设置平滑度
     */
    public setSmoothness(value: number) {
        this.smoothness = Math.max(0, Math.min(1, value));
        
        if (this.debugMode) {
            Log.log(this.MODULE_NAME, `设置平滑度: ${this.smoothness}`);
        }
    }

    /**
     * 启用/禁用边界限制
     */
    public setEnableBoundary(enabled: boolean) {
        this.enableBoundary = enabled;
        
        if (this.debugMode) {
            Log.log(this.MODULE_NAME, `边界限制: ${enabled ? '启用' : '禁用'}`);
        }
    }

    /**
     * 立即移动到目标位置（无平滑）
     */
    public snapToTarget() {
        if (!this.target) {
            Log.warn(this.MODULE_NAME, '没有设置跟踪目标');
            return;
        }

        this._targetPosition.set(this.target.position);
        
        if (this.enableBoundary && this._mapBounds) {
            this._applyBoundaryConstraints();
        }

        this.node.setPosition(this._targetPosition);
        
        if (this.debugMode) {
            Log.log(this.MODULE_NAME, `立即移动到目标位置: ${this._targetPosition}`);
        }
    }

    /**
     * 重新计算边界
     */
    public recalculateBounds() {
        this._calculateMapBounds();
        
        if (this.debugMode) {
            Log.log(this.MODULE_NAME, '边界已重新计算');
        }
    }

    /**
     * 调试信息
     */
    public debugInfo() {
        Log.log(this.MODULE_NAME, '=== CameraMotion 调试信息 ===');
        Log.log(this.MODULE_NAME, '跟踪目标:', this.target?.name || '未设置');
        Log.log(this.MODULE_NAME, '平滑度:', this.smoothness);
        Log.log(this.MODULE_NAME, '边界限制:', this.enableBoundary ? '启用' : '禁用');
        Log.log(this.MODULE_NAME, '边界内边距:', this.boundaryPadding);
        Log.log(this.MODULE_NAME, '相机尺寸:', `${this._cameraHalfWidth * 2}x${this._cameraHalfHeight * 2}`);
        Log.log(this.MODULE_NAME, '地图边界:', this._mapBounds);
        Log.log(this.MODULE_NAME, '当前位置:', this.node.position);
        Log.log(this.MODULE_NAME, '初始化状态:', this._initialized);
    }
}


