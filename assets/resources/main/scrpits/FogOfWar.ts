import { _decorator, Component, Node, Sprite, Texture2D, Vec2, Vec3, Color, SpriteFrame, Rect, sys, UITransform } from 'cc';
import { DungeonController } from './DungeonController';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 战争迷雾系统 - GPU 加速版本
 * 使用 Canvas 和 Texture2D 实现高性能迷雾效果
 * 通过 Canvas 2D API 绘制迷雾，然后上传到 GPU
 */
@ccclass('FogOfWar')
export class FogOfWar extends Component {
    
    @property({ type: Node, tooltip: '地牢控制器节点' })
    dungeonControllerNode: Node = null;

    @property({ type: Node, tooltip: '迷雾遮罩节点（需要有 Sprite 组件）' })
    fogMaskNode: Node = null;

    @property({ type: Node, tooltip: '玩家节点' })
    playerNode: Node = null;

    @property({ tooltip: '视野半径（格子数）' })
    visionRadius: number = 8;

    @property({ tooltip: '迷雾颜色' })
    fogColor: Color = new Color(0, 0, 0, 200);

    @property({ tooltip: '是否启用' })
    enableFog: boolean = true;

    @property({ tooltip: '是否显示已探索区域' })
    showExploredAreas: boolean = true;

    @property({ tooltip: '已探索区域的透明度 (0-255)' })
    exploredAlpha: number = 100;

    @property({ tooltip: '每个 Chunk 包含的 Tile 数' })
    chunkSize: number = 16;

    @property({ tooltip: '视野中心 X 偏移（像素）' })
    playerViewOffsetX: number = 0;

    @property({ tooltip: '视野中心 Y 偏移（像素）' })
    playerViewOffsetY: number = 0;

    private readonly MODULE_NAME = 'FogOfWar';
    private _dungeonController: DungeonController = null;
    private _dungeonContainer: Node = null;
    private _texture2D: Texture2D = null;
    private _fogSprite: Sprite = null;
    private _canvas: HTMLCanvasElement = null;
    private _ctx: CanvasRenderingContext2D = null;
    private _textureWidth: number = 0;
    private _textureHeight: number = 0;
    private _tileSize: number = 32;
    private _lastPlayerTilePos: Vec2 = new Vec2(-1, -1);
    private _exploredTiles: Set<string> = new Set();
    private _mapWidth: number = 0;
    private _mapHeight: number = 0;

    onLoad() {
        if (!this.enableFog) {
            this.node.active = false;
            return;
        }

        // 创建迷雾遮罩节点（如果不存在）
        if (!this.fogMaskNode) {
            this.fogMaskNode = new Node('FogMask');
            this.fogMaskNode.setParent(this.node);
            this._fogSprite = this.fogMaskNode.addComponent(Sprite);
        } else {
            this._fogSprite = this.fogMaskNode.getComponent(Sprite);
            if (!this._fogSprite) {
                this._fogSprite = this.fogMaskNode.addComponent(Sprite);
            }
        }
    }

    start() {
        if (!this.enableFog) return;

        this._dungeonController = this._findDungeonController();
        if (!this._dungeonController) {
            Log.error(this.MODULE_NAME, '未找到 DungeonController');
            return;
        }

        this._tileSize = this._dungeonController.tileSize;
        this._dungeonContainer = this._dungeonController.dungeonContainer || this._dungeonController.node;
        this._initializeFogTexture();
    }

    /**
     * 初始化迷雾纹理
     */
    private _initializeFogTexture() {
        const dungeonGenerator = this._dungeonController.dungeonGenerator;
        if (!dungeonGenerator) {
            Log.error(this.MODULE_NAME, '地牢生成器未找到');
            return;
        }

        // 获取地图尺寸
        this._mapWidth = dungeonGenerator.dungeonWidth;
        this._mapHeight = dungeonGenerator.dungeonHeight;
        
        // 计算纹理尺寸（每个 tile 对应一个像素）
        this._textureWidth = this._mapWidth;
        this._textureHeight = this._mapHeight;

        Log.log(this.MODULE_NAME, `初始化迷雾纹理: ${this._textureWidth}x${this._textureHeight}`);

        // 创建 Canvas
        if (sys.isBrowser) {
            this._canvas = document.createElement('canvas');
            this._canvas.width = this._textureWidth;
            this._canvas.height = this._textureHeight;
            this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });
        } else {
            Log.error(this.MODULE_NAME, '当前环境不支持 Canvas');
            return;
        }

        // 填充初始迷雾
        this._fillFog();

        // 创建 Texture2D
        this._texture2D = new Texture2D();
        this._texture2D.reset({
            width: this._textureWidth,
            height: this._textureHeight,
            format: Texture2D.PixelFormat.RGBA8888
        });

        // 上传 Canvas 数据到纹理
        this._updateTexture();

        // 创建 SpriteFrame 并赋值给 Sprite
        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = this._texture2D;
        spriteFrame.rect = new Rect(0, 0, this._textureWidth, this._textureHeight);
        
        this._fogSprite.spriteFrame = spriteFrame;

        // 让迷雾节点与地牢容器使用同一坐标系，避免和玩家/地图错位
        if (this._dungeonContainer && this.fogMaskNode.parent !== this._dungeonContainer) {
            this.fogMaskNode.setParent(this._dungeonContainer);
        }
        
        // 禁用动态图集（避免 WebGL 错误）
        this._fogSprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const fogTransform = this.fogMaskNode.getComponent(UITransform) || this.fogMaskNode.addComponent(UITransform);
        fogTransform.anchorX = 0;
        fogTransform.anchorY = 0;
        fogTransform.setContentSize(this._mapWidth * this._tileSize, this._mapHeight * this._tileSize);

        // 让纹理左下角与地图左下角对齐。
        // 由于 tile 是以中心点放在 x * tileSize / y * tileSize 上，
        // 整张迷雾需要向左下各偏移半个 tile 才能准确盖住每个格子。
        this.fogMaskNode.setPosition(
            -this._tileSize * 0.5,
            -this._tileSize * 0.5,
            0
        );
        this.fogMaskNode.setSiblingIndex(this.fogMaskNode.parent.children.length - 1);

        Log.log(this.MODULE_NAME, '迷雾纹理初始化完成');
    }

    /**
     * 填充迷雾
     */
    private _fillFog() {
        if (!this._ctx) return;

        this._ctx.fillStyle = `rgba(${this.fogColor.r}, ${this.fogColor.g}, ${this.fogColor.b}, ${this.fogColor.a / 255})`;
        this._ctx.fillRect(0, 0, this._textureWidth, this._textureHeight);
    }

    /**
     * 将 Cocos Y 坐标转换为 Canvas Y 坐标
     * Cocos: Y=0 在底部，Canvas: Y=0 在顶部
     */
    private _canvasY(tileY: number): number {
        return this._mapHeight - 1 - tileY;
    }

    /**
     * 更新纹理数据
     */
    private _updateTexture() {
        if (!this._texture2D || !this._canvas) return;

        // 从 Canvas 上传图像数据到纹理
        this._texture2D.uploadData(this._canvas);
    }

    /**
     * 获取玩家在地牢容器坐标系中的局部位置
     */
    private _getPlayerLocalPositionInDungeon(): Vec3 | null {
        if (!this.playerNode || !this._dungeonContainer) return null;

        const localPos = this._worldToLocal(this.playerNode.worldPosition);
        localPos.x += this.playerViewOffsetX;
        localPos.y += this.playerViewOffsetY;
        return localPos;
    }

    /**
     * 将局部坐标转换为 tile 坐标
     * 角色通常位于格子中心，因此加半格后再 floor，避免边界抖动
     */
    private _positionToTile(value: number): number {
        return Math.floor((value + this._tileSize * 0.5) / this._tileSize);
    }

    update(deltaTime: number) {
        if (!this.enableFog || !this.playerNode || !this._ctx) return;

        // 获取玩家在地牢容器中的真实局部坐标，再换算为 tile 坐标
        const playerLocalPos = this._getPlayerLocalPositionInDungeon();
        if (!playerLocalPos) return;

        const playerTileX = this._positionToTile(playerLocalPos.x);
        const playerTileY = this._positionToTile(playerLocalPos.y);

        // 检查玩家位置是否变化
        if (playerTileX === this._lastPlayerTilePos.x && 
            playerTileY === this._lastPlayerTilePos.y) {
            return; // 位置未变化，不更新
        }

        this._lastPlayerTilePos.set(playerTileX, playerTileY);
        this._updatePlayerFog(playerTileX, playerTileY);
    }

    /**
     * 将世界坐标转换为地牢局部坐标
     */
    private _worldToLocal(worldPos: Vec3): Vec3 {
        if (!this._dungeonContainer) return worldPos.clone();

        const localPos = new Vec3();
        this._dungeonContainer.inverseTransformPoint(localPos, worldPos);
        return localPos;
    }

    /**
     * 更新玩家视野迷雾
     */
    private _updatePlayerFog(playerTileX: number, playerTileY: number) {
        if (!this._ctx) return;

        const radiusSquared = this.visionRadius * this.visionRadius;
        let needsUpdate = false;

        // 如果启用了"显示已探索区域"，先重绘已探索区域
        if (this.showExploredAreas) {
            this._redrawExploredAreas(playerTileX, playerTileY);
        }

        // 清除视野范围内的迷雾
        for (let dy = -this.visionRadius; dy <= this.visionRadius; dy++) {
            for (let dx = -this.visionRadius; dx <= this.visionRadius; dx++) {
                const distSquared = dx * dx + dy * dy;
                
                // 圆形视野检测
                if (distSquared <= radiusSquared) {
                    const tileX = playerTileX + dx;
                    const tileY = playerTileY + dy;
                    
                    // 边界检查
                    if (tileX < 0 || tileX >= this._mapWidth || 
                        tileY < 0 || tileY >= this._mapHeight) {
                        continue;
                    }

                    const key = `${tileX},${tileY}`;
                    
                    // 标记为已探索
                    if (!this._exploredTiles.has(key)) {
                        this._exploredTiles.add(key);
                        needsUpdate = true;
                    }

                    // 清除迷雾（设置为透明）
                    this._ctx.clearRect(tileX, this._canvasY(tileY), 1, 1);
                }
            }
        }

        // 上传更新后的纹理数据
        if (needsUpdate || this.showExploredAreas) {
            this._updateTexture();
        }
    }

    /**
     * 重绘已探索区域（显示为半透明）
     */
    private _redrawExploredAreas(playerTileX: number, playerTileY: number) {
        if (!this._ctx) return;

        const radiusSquared = this.visionRadius * this.visionRadius;

        // 先清空整个 Canvas
        this._ctx.clearRect(0, 0, this._textureWidth, this._textureHeight);

        // 重绘未探索区域（完全迷雾）
        this._ctx.fillStyle = `rgba(${this.fogColor.r}, ${this.fogColor.g}, ${this.fogColor.b}, ${this.fogColor.a / 255})`;
        for (let y = 0; y < this._mapHeight; y++) {
            for (let x = 0; x < this._mapWidth; x++) {
                const key = `${x},${y}`;
                
                if (!this._exploredTiles.has(key)) {
                    // 未探索，绘制完全迷雾
                    this._ctx.fillRect(x, this._canvasY(y), 1, 1);
                }
            }
        }

        // 重绘已探索但不在视野内的区域（半透明迷雾）
        this._ctx.fillStyle = `rgba(${this.fogColor.r}, ${this.fogColor.g}, ${this.fogColor.b}, ${this.exploredAlpha / 255})`;
        this._exploredTiles.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            
            // 计算与玩家的距离
            const dx = x - playerTileX;
            const dy = y - playerTileY;
            const distSquared = dx * dx + dy * dy;

            // 如果在视野外，绘制半透明迷雾
            if (distSquared > radiusSquared) {
                this._ctx.fillRect(x, this._canvasY(y), 1, 1);
            }
        });
    }

    /**
     * 查找地牢控制器
     */
    private _findDungeonController(): DungeonController | null {
        if (this.dungeonControllerNode) {
            const controller = this.dungeonControllerNode.getComponent(DungeonController);
            if (controller) {
                Log.log(this.MODULE_NAME, '从指定节点找到 DungeonController');
                return controller;
            }
        }

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
     * 设置玩家节点
     */
    public setPlayer(player: Node) {
        this.playerNode = player;
        this._lastPlayerTilePos.set(-1, -1); // 重置位置以触发更新
        Log.log(this.MODULE_NAME, `设置玩家节点: ${player?.name}`);
    }

    /**
     * 设置视野半径
     */
    public setVisionRadius(radius: number) {
        this.visionRadius = Math.max(1, radius);
        this._lastPlayerTilePos.set(-1, -1); // 重置位置以触发更新
        Log.log(this.MODULE_NAME, `设置视野半径: ${this.visionRadius}`);
    }

    /**
     * 清除所有迷雾（用于调试）
     */
    public clearAllFog() {
        if (!this._ctx) return;

        this._ctx.clearRect(0, 0, this._textureWidth, this._textureHeight);
        this._updateTexture();
        Log.log(this.MODULE_NAME, '清除所有迷雾');
    }

    /**
     * 重置迷雾（重新覆盖所有区域）
     */
    public resetFog() {
        if (!this._ctx) return;

        this._fillFog();
        this._exploredTiles.clear();
        this._lastPlayerTilePos.set(-1, -1);
        this._updateTexture();
        Log.log(this.MODULE_NAME, '重置迷雾');
    }

    /**
     * 探索指定区域
     */
    public exploreArea(centerTileX: number, centerTileY: number, radius: number) {
        if (!this._ctx) return;

        const radiusSquared = radius * radius;
        let needsUpdate = false;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const distSquared = dx * dx + dy * dy;
                
                if (distSquared <= radiusSquared) {
                    const tileX = centerTileX + dx;
                    const tileY = centerTileY + dy;
                    
                    if (tileX < 0 || tileX >= this._mapWidth || 
                        tileY < 0 || tileY >= this._mapHeight) {
                        continue;
                    }

                    const key = `${tileX},${tileY}`;
                    
                    if (!this._exploredTiles.has(key)) {
                        this._exploredTiles.add(key);
                        this._ctx.clearRect(tileX, this._canvasY(tileY), 1, 1);
                        needsUpdate = true;
                    }
                }
            }
        }

        if (needsUpdate) {
            this._updateTexture();
        }
    }

    /**
     * 获取探索进度
     */
    public getExplorationProgress(): number {
        const totalTiles = this._mapWidth * this._mapHeight;
        const exploredCount = this._exploredTiles.size;
        return totalTiles > 0 ? (exploredCount / totalTiles) * 100 : 0;
    }

    /**
     * 调试信息
     */
    public debugInfo() {
        Log.log(this.MODULE_NAME, '=== FogOfWar 调试信息 ===');
        Log.log(this.MODULE_NAME, '纹理尺寸:', `${this._textureWidth}x${this._textureHeight}`);
        Log.log(this.MODULE_NAME, '地图尺寸:', `${this._mapWidth}x${this._mapHeight}`);
        Log.log(this.MODULE_NAME, 'Tile 尺寸:', this._tileSize);
        Log.log(this.MODULE_NAME, '已探索 Tile 数:', this._exploredTiles.size);
        Log.log(this.MODULE_NAME, '探索进度:', `${this.getExplorationProgress().toFixed(2)}%`);
        Log.log(this.MODULE_NAME, '视野半径:', this.visionRadius);
        Log.log(this.MODULE_NAME, '玩家节点:', this.playerNode?.name || '未设置');
        Log.log(this.MODULE_NAME, '玩家 Tile 位置:', `(${this._lastPlayerTilePos.x}, ${this._lastPlayerTilePos.y})`);
    }

    onDestroy() {
        // 清理资源
        if (this._texture2D) {
            this._texture2D.destroy();
            this._texture2D = null;
        }
        this._canvas = null;
        this._ctx = null;
        this._exploredTiles.clear();
    }
}
