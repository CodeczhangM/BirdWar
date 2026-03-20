import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';
import { DungeonController } from './DungeonController';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 角色自动调整大小组件
 * 根据地牢生成器的格子大小自动调整角色的尺寸，确保角色与地图分辨率匹配
 */
@ccclass('ActorAutoResize')
export class ActorAutoResize extends Component {
    
    @property({ type: Node, tooltip: '地牢控制器节点' })
    dungeonControllerNode: Node = null;

    @property({ tooltip: '相对于格子的缩放比例（0-1）' })
    scaleRatio: number = 0.8;

    @property({ tooltip: '是否保持宽高比' })
    keepAspectRatio: boolean = true;

    @property({ tooltip: '最小尺寸限制' })
    minSize: number = 16;

    @property({ tooltip: '最大尺寸限制' })
    maxSize: number = 128;

    @property({ tooltip: '是否在 start 时自动调整' })
    autoResizeOnStart: boolean = true;

    private readonly MODULE_NAME = 'ActorAutoResize';
    private _dungeonController: DungeonController = null;
    private _uiTransform: UITransform = null;
    private _originalSize: Vec3 = new Vec3();

    onLoad() {
        Log.log(this.MODULE_NAME, '=== ActorAutoResize onLoad ===');
        
        this._uiTransform = this.getComponent(UITransform);
        
        // 保存原始尺寸（从节点的初始状态）
        if (this._uiTransform) {
            this._originalSize.set(
                this._uiTransform.width,
                this._uiTransform.height,
                1
            );
            Log.log(this.MODULE_NAME, `从 UITransform 获取原始尺寸: ${this._originalSize.x}x${this._originalSize.y}`);
        } else {
            // 如果没有 UITransform，使用默认值
            this._originalSize.set(100, 100, 1);
            Log.warn(this.MODULE_NAME, 'UITransform 组件未找到，使用默认尺寸 100x100');
        }
        
        Log.log(this.MODULE_NAME, `节点初始缩放: ${this.node.scale}`);
    }

    start() {
        Log.log(this.MODULE_NAME, '=== ActorAutoResize start ===');
        
        if (this.autoResizeOnStart) {
            Log.log(this.MODULE_NAME, '自动调整已启用');
            this.resizeToTileSize();
        } else {
            Log.log(this.MODULE_NAME, '自动调整已禁用');
        }
    }

    /**
     * 根据地牢格子大小调整角色尺寸
     */
    public resizeToTileSize(): boolean {
        Log.log(this.MODULE_NAME, '=== 开始调整角色尺寸 ===');
        
        // 获取地牢控制器
        if (!this._dungeonController) {
            this._dungeonController = this._findDungeonController();
            if (!this._dungeonController) {
                Log.error(this.MODULE_NAME, '未找到 DungeonController');
                return false;
            }
        }

        const tileSize = this._dungeonController.tileSize;
        Log.log(this.MODULE_NAME, `地牢格子大小: ${tileSize}`);
        
        if (!tileSize || tileSize <= 0) {
            Log.error(this.MODULE_NAME, `无效的 tileSize: ${tileSize}`);
            return false;
        }

        // 获取原始尺寸（如果还没有保存）
        if (this._originalSize.x === 0 && this._originalSize.y === 0) {
            if (this._uiTransform) {
                this._originalSize.set(
                    this._uiTransform.width,
                    this._uiTransform.height,
                    1
                );
            } else {
                this._originalSize.set(100, 100, 1);
            }
        }

        Log.log(this.MODULE_NAME, `原始尺寸: ${this._originalSize.x}x${this._originalSize.y}`);
        Log.log(this.MODULE_NAME, `缩放比例: ${this.scaleRatio}`);

        // 计算目标缩放
        const targetSize = tileSize * this.scaleRatio;
        const clampedSize = Math.max(this.minSize, Math.min(this.maxSize, targetSize));
        
        Log.log(this.MODULE_NAME, `目标尺寸: ${targetSize}, 限制后: ${clampedSize}`);

        // 计算缩放比例
        let scaleX: number, scaleY: number;
        
        if (this.keepAspectRatio) {
            // 保持宽高比，使用统一缩放
            const maxOriginalSize = Math.max(this._originalSize.x, this._originalSize.y);
            const scale = clampedSize / maxOriginalSize;
            scaleX = scaleY = scale;
            Log.log(this.MODULE_NAME, `保持宽高比，统一缩放: ${scale}`);
        } else {
            // 不保持宽高比，分别计算
            scaleX = clampedSize / this._originalSize.x;
            scaleY = clampedSize / this._originalSize.y;
            Log.log(this.MODULE_NAME, `不保持宽高比，scaleX: ${scaleX}, scaleY: ${scaleY}`);
        }

        // 应用缩放
        this.node.setScale(scaleX, scaleY, 1);
        
        Log.log(this.MODULE_NAME, `最终缩放: (${scaleX}, ${scaleY})`);
        Log.log(this.MODULE_NAME, `节点当前缩放: ${this.node.scale}`);
        Log.log(this.MODULE_NAME, '=== 调整完成 ===');
        
        return true;
    }

    /**
     * 设置缩放比例并重新调整尺寸
     */
    public setScaleRatio(ratio: number): void {
        this.scaleRatio = Math.max(0.1, Math.min(1.0, ratio));
        this.resizeToTileSize();
    }

    /**
     * 重置为原始尺寸
     */
    public resetToOriginalSize(): void {
        if (!this._uiTransform) return;

        this._uiTransform.width = this._originalSize.x;
        this._uiTransform.height = this._originalSize.y;
        this.node.setScale(1, 1, 1);

        Log.log(this.MODULE_NAME, '角色尺寸已重置为原始大小');
    }

    /**
     * 查找地牢控制器
     */
    private _findDungeonController(): DungeonController | null {
        // 如果指定了节点，直接从该节点获取
        if (this.dungeonControllerNode) {
            const controller = this.dungeonControllerNode.getComponent(DungeonController);
            if (controller) {
                Log.log(this.MODULE_NAME, '从指定节点找到 DungeonController');
                return controller;
            }
        }

        // 尝试从场景中查找
        const controller = this._findComponentInScene(DungeonController);
        if (controller) {
            Log.log(this.MODULE_NAME, '从场景中找到 DungeonController');
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
     * 获取当前尺寸信息
     */
    public getSizeInfo(): { width: number, height: number, scale: Vec3 } {
        return {
            width: this._uiTransform?.width || 0,
            height: this._uiTransform?.height || 0,
            scale: this.node.scale.clone()
        };
    }

    /**
     * 调试信息
     */
    public debugInfo(): void {
        Log.log(this.MODULE_NAME, '=== ActorAutoResize 调试信息 ===');
        Log.log(this.MODULE_NAME, '原始尺寸:', this._originalSize);
        Log.log(this.MODULE_NAME, '当前尺寸:', this.getSizeInfo());
        Log.log(this.MODULE_NAME, '缩放比例:', this.scaleRatio);
        Log.log(this.MODULE_NAME, '保持宽高比:', this.keepAspectRatio);
        Log.log(this.MODULE_NAME, '尺寸限制:', `${this.minSize} - ${this.maxSize}`);
        
        if (this._dungeonController) {
            Log.log(this.MODULE_NAME, '地牢格子大小:', this._dungeonController.tileSize);
        } else {
            Log.log(this.MODULE_NAME, '地牢控制器: 未找到');
        }
    }
}


