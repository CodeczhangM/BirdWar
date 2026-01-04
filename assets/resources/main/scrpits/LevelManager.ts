import { _decorator, Component, Node, Vec3, Color, resources, JsonAsset } from 'cc';
import { GridManager, GridConfig, GridCellType } from './GridManager';
import { ResourceLoaderInstance } from './ResourceLoader';
import { EventManagerInstance, EventData } from './EventManager';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 关卡网格配置接口
 */
export interface LevelGridConfig {
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    startPosition: { x: number, y: number, z: number };
    showGrid: boolean;
    gridColor: { r: number, g: number, b: number, a: number };
    highlightColor: { r: number, g: number, b: number, a: number };
}

/**
 * 关卡环境配置接口
 */
export interface LevelEnvironment {
    weather: string;           // 天气类型
    timeOfDay: string;         // 时间段
    temperature: number;       // 温度
    windSpeed: number;         // 风速
    visibility: number;        // 可见度
    ambientLight: { r: number, g: number, b: number, a: number };
    fogColor: { r: number, g: number, b: number, a: number };
    fogDensity: number;
    soundscape: string;        // 环境音效
    particles: string[];       // 粒子效果
    customEffects: any[];      // 自定义效果
}

/**
 * 关卡背景配置接口
 */
export interface LevelBackground {
    backgroundImage: string;   // 背景图片
    backgroundMusic: string;   // 背景音乐
    parallaxLayers: Array<{    // 视差层
        image: string;
        speed: number;
        depth: number;
    }>;
    skybox: string;           // 天空盒
    groundTexture: string;    // 地面纹理
    decorations: Array<{      // 装饰物
        sprite: string;
        position: { x: number, y: number };
        scale: number;
        rotation: number;
    }>;
}

/**
 * 关卡目标配置接口
 */
export interface LevelObjectives {
    primary: Array<{          // 主要目标
        type: string;
        description: string;
        target: number;
        current: number;
        completed: boolean;
    }>;
    secondary: Array<{        // 次要目标
        type: string;
        description: string;
        target: number;
        current: number;
        completed: boolean;
        reward: any;
    }>;
    timeLimit: number;        // 时间限制（秒）
    scoreTarget: number;      // 分数目标
}

/**
 * 关卡敌人配置接口
 */
export interface LevelEnemies {
    waves: Array<{            // 敌人波次
        waveNumber: number;
        delay: number;        // 延迟时间
        enemies: Array<{
            type: string;
            count: number;
            spawnRow: number;
            spawnDelay: number;
            health: number;
            speed: number;
            damage: number;
            specialAbilities: string[];
        }>;
    }>;
    bossEnemies: Array<{      // Boss敌人
        type: string;
        appearTime: number;
        health: number;
        phases: any[];
    }>;
}

/**
 * 关卡资源配置接口
 */
export interface LevelResources {
    startingSun: number;      // 初始阳光
    sunGenerationRate: number; // 阳光生成速率
    availablePlants: string[]; // 可用植物
    plantCosts: { [plantType: string]: number }; // 植物成本
    specialItems: Array<{     // 特殊道具
        type: string;
        count: number;
        cost: number;
    }>;
}

/**
 * 完整的关卡数据接口
 */
export interface LevelData {
    // 基础信息
    id: string;
    name: string;
    description: string;
    difficulty: number;       // 难度等级 1-10
    version: string;
    author: string;
    tags: string[];

    // 网格配置
    grid: LevelGridConfig;

    // 环境配置
    environment: LevelEnvironment;

    // 背景配置
    background: LevelBackground;

    // 目标配置
    objectives: LevelObjectives;

    // 敌人配置
    enemies: LevelEnemies;

    // 资源配置
    resources: LevelResources;

    // 特殊网格单元配置
    specialCells: Array<{
        row: number;
        col: number;
        type: string;
        properties: any;
    }>;

    // 预设对象
    presetObjects: Array<{
        type: string;
        position: { row: number, col: number };
        properties: any;
    }>;

    // 扩展数据
    customData: { [key: string]: any };
}

/**
 * 关卡管理器
 * 负责加载和管理关卡数据，配置游戏环境
 */
@ccclass('LevelManager')
export class LevelManager extends Component {
    
    @property({ type: String, tooltip: '关卡数据资源路径' })
    public levelDataPath: string = 'levels/';

    @property({ type: String, tooltip: '当前关卡ID' })
    public currentLevelId: string = 'level_1_1';

    @property({ type: GridManager, tooltip: '网格管理器' })
    public gridManager: GridManager = null;

    @property({ type: Node, tooltip: '背景容器节点' })
    public backgroundContainer: Node = null;

    @property({ type: Node, tooltip: '环境效果容器节点' })
    public environmentContainer: Node = null;

    @property({ type: Boolean, tooltip: '自动加载关卡' })
    public autoLoadLevel: boolean = true;

    @property({ type: Boolean, tooltip: '启用调试模式' })
    public enableDebug: boolean = false;

    // 私有变量
    private _currentLevelData: LevelData = null;
    private _levelCache: Map<string, LevelData> = new Map();
    private _loadedResources: Map<string, any> = new Map();
    private readonly MODULE_NAME = 'LevelManager';

    // 生命周期
    onLoad() {
        this.setupEventListeners();
    }

    start() {
        if (this.autoLoadLevel && this.currentLevelId) {
            this.loadLevel(this.currentLevelId);
        }
    }

    onDestroy() {
        EventManagerInstance.clearTargetListeners(this);
        this.clearLoadedResources();
    }

    // ========== 事件监听 ==========
    
    /**
     * 设置事件监听器
     */
    private setupEventListeners() {
        // 监听关卡相关事件
        EventManagerInstance.on('level-load-requested', (data: EventData) => {
            const levelId = data.levelId as string;
            if (levelId) {
                this.loadLevel(levelId);
            }
        }, this);

        EventManagerInstance.on('level-reload-requested', () => {
            this.reloadCurrentLevel();
        }, this);

        EventManagerInstance.on('level-reset-requested', () => {
            this.resetLevel();
        }, this);
    }

    // ========== 关卡加载 ==========

    /**
     * 加载关卡
     */
    public async loadLevel(levelId: string): Promise<boolean> {
        Log.log(this.MODULE_NAME, `开始加载关卡: ${levelId}`);

        try {
            // 触发加载开始事件
            EventManagerInstance.emit('level-load-start', { levelId });

            // 从缓存或文件加载关卡数据
            const levelData = await this.loadLevelData(levelId);
            if (!levelData) {
                Log.error(this.MODULE_NAME, `关卡数据加载失败: ${levelId}`);
                EventManagerInstance.emit('level-load-failed', { levelId, error: 'Data load failed' });
                return false;
            }

            // 验证关卡数据
            if (!this.validateLevelData(levelData)) {
                Log.error(this.MODULE_NAME, `关卡数据验证失败: ${levelId}`);
                EventManagerInstance.emit('level-load-failed', { levelId, error: 'Data validation failed' });
                return false;
            }

            // 应用关卡配置
            await this.applyLevelConfiguration(levelData);

            // 设置当前关卡
            this._currentLevelData = levelData;
            this.currentLevelId = levelId;

            Log.log(this.MODULE_NAME, `关卡加载完成: ${levelId}`);
            
            // 触发加载完成事件
            EventManagerInstance.emit('level-load-complete', { 
                levelId, 
                levelData: this._currentLevelData 
            });

            return true;

        } catch (error) {
            Log.error(this.MODULE_NAME, `关卡加载异常: ${levelId}`, error);
            EventManagerInstance.emit('level-load-failed', { levelId, error: error.message });
            return false;
        }
    }

    /**
     * 从文件加载关卡数据
     */
    private async loadLevelData(levelId: string): Promise<LevelData | null> {
        // 检查缓存
        if (this._levelCache.has(levelId)) {
            Log.debug(this.MODULE_NAME, `从缓存加载关卡数据: ${levelId}`);
            return this._levelCache.get(levelId);
        }

        // 从资源文件加载
        const levelPath = `${this.levelDataPath}${levelId}`;
        
        return new Promise((resolve) => {
            resources.load(levelPath, JsonAsset, (err, jsonAsset) => {
                if (err) {
                    Log.error(this.MODULE_NAME, `关卡文件加载失败: ${levelPath}`, err);
                    resolve(null);
                    return;
                }

                try {
                    const levelData = jsonAsset.json as LevelData;
                    
                    // 缓存数据
                    this._levelCache.set(levelId, levelData);
                    
                    Log.debug(this.MODULE_NAME, `关卡数据加载成功: ${levelId}`);
                    resolve(levelData);
                    
                } catch (parseError) {
                    Log.error(this.MODULE_NAME, `关卡数据解析失败: ${levelId}`, parseError);
                    resolve(null);
                }
            });
        });
    }

    /**
     * 验证关卡数据
     */
    private validateLevelData(levelData: LevelData): boolean {
        if (!levelData) {
            Log.error(this.MODULE_NAME, '关卡数据为空');
            return false;
        }

        // 检查必需字段
        const requiredFields = ['id', 'name', 'grid'];
        for (const field of requiredFields) {
            if (!levelData[field]) {
                Log.error(this.MODULE_NAME, `缺少必需字段: ${field}`);
                return false;
            }
        }

        // 检查网格配置
        const grid = levelData.grid;
        if (!grid || grid.rows <= 0 || grid.cols <= 0) {
            Log.error(this.MODULE_NAME, '无效的网格配置');
            return false;
        }

        // 检查特殊单元格坐标
        if (levelData.specialCells) {
            for (const cell of levelData.specialCells) {
                if (cell.row < 0 || cell.row >= grid.rows || 
                    cell.col < 0 || cell.col >= grid.cols) {
                    Log.error(this.MODULE_NAME, `特殊单元格坐标超出范围: (${cell.row}, ${cell.col})`);
                    return false;
                }
            }
        }

        Log.debug(this.MODULE_NAME, '关卡数据验证通过');
        return true;
    }

    // ========== 关卡配置应用 ==========

    /**
     * 应用关卡配置
     */
    private async applyLevelConfiguration(levelData: LevelData): Promise<void> {
        Log.log(this.MODULE_NAME, '开始应用关卡配置');

        // 配置网格
        await this.configureGrid(levelData.grid);

        // 配置背景
        if (levelData.background) {
            await this.configureBackground(levelData.background);
        }

        // 配置环境
        if (levelData.environment) {
            await this.configureEnvironment(levelData.environment);
        }

        // 设置特殊单元格
        if (levelData.specialCells) {
            this.configureSpecialCells(levelData.specialCells);
        }

        // 放置预设对象
        if (levelData.presetObjects) {
            await this.placePresetObjects(levelData.presetObjects);
        }

        Log.log(this.MODULE_NAME, '关卡配置应用完成');
    }

    /**
     * 配置网格
     */
    private async configureGrid(gridConfig: LevelGridConfig): Promise<void> {
        if (!this.gridManager) {
            Log.warn(this.MODULE_NAME, 'GridManager未设置，跳过网格配置');
            return;
        }

        const config: GridConfig = {
            rows: gridConfig.rows,
            cols: gridConfig.cols,
            cellWidth: gridConfig.cellWidth,
            cellHeight: gridConfig.cellHeight,
            startPosition: new Vec3(
                gridConfig.startPosition.x,
                gridConfig.startPosition.y,
                gridConfig.startPosition.z
            ),
            showGrid: gridConfig.showGrid,
            gridColor: new Color(
                gridConfig.gridColor.r,
                gridConfig.gridColor.g,
                gridConfig.gridColor.b,
                gridConfig.gridColor.a
            ),
            highlightColor: new Color(
                gridConfig.highlightColor.r,
                gridConfig.highlightColor.g,
                gridConfig.highlightColor.b,
                gridConfig.highlightColor.a
            )
        };

        this.gridManager.reconfigureGrid(config);
        Log.debug(this.MODULE_NAME, `网格配置完成: ${config.rows}x${config.cols}`);
    }

    /**
     * 配置背景
     */
    private async configureBackground(backgroundConfig: LevelBackground): Promise<void> {
        Log.debug(this.MODULE_NAME, '开始配置背景');

        // 加载背景图片
        if (backgroundConfig.backgroundImage) {
            await this.loadBackgroundImage(backgroundConfig.backgroundImage);
        }

        // 设置背景音乐
        if (backgroundConfig.backgroundMusic) {
            await this.loadBackgroundMusic(backgroundConfig.backgroundMusic);
        }

        // 配置视差层
        if (backgroundConfig.parallaxLayers) {
            await this.configureParallaxLayers(backgroundConfig.parallaxLayers);
        }

        // 放置装饰物
        if (backgroundConfig.decorations) {
            await this.placeDecorations(backgroundConfig.decorations);
        }

        Log.debug(this.MODULE_NAME, '背景配置完成');
    }

    /**
     * 配置环境
     */
    private async configureEnvironment(environmentConfig: LevelEnvironment): Promise<void> {
        Log.debug(this.MODULE_NAME, '开始配置环境');

        // 设置环境光照
        if (environmentConfig.ambientLight) {
            this.setAmbientLight(environmentConfig.ambientLight);
        }

        // 设置雾效
        if (environmentConfig.fogColor && environmentConfig.fogDensity > 0) {
            this.setFog(environmentConfig.fogColor, environmentConfig.fogDensity);
        }

        // 加载环境音效
        if (environmentConfig.soundscape) {
            await this.loadEnvironmentSound(environmentConfig.soundscape);
        }

        // 配置粒子效果
        if (environmentConfig.particles) {
            await this.configureParticles(environmentConfig.particles);
        }

        // 应用自定义效果
        if (environmentConfig.customEffects) {
            await this.applyCustomEffects(environmentConfig.customEffects);
        }

        Log.debug(this.MODULE_NAME, '环境配置完成');
    }

    /**
     * 配置特殊单元格
     */
    private configureSpecialCells(specialCells: Array<{ row: number, col: number, type: string, properties: any }>): void {
        if (!this.gridManager) return;

        for (const cellConfig of specialCells) {
            const cellType = this.stringToCellType(cellConfig.type);
            this.gridManager.setCellType(cellConfig.row, cellConfig.col, cellType);

            // 设置单元格自定义属性
            const cell = this.gridManager.getCell(cellConfig.row, cellConfig.col);
            if (cell && cellConfig.properties) {
                Object.assign(cell.data, cellConfig.properties);
            }
        }

        Log.debug(this.MODULE_NAME, `配置了 ${specialCells.length} 个特殊单元格`);
    }

    /**
     * 放置预设对象
     */
    private async placePresetObjects(presetObjects: Array<{ type: string, position: { row: number, col: number }, properties: any }>): Promise<void> {
        for (const objConfig of presetObjects) {
            await this.createPresetObject(objConfig);
        }

        Log.debug(this.MODULE_NAME, `放置了 ${presetObjects.length} 个预设对象`);
    }

    // ========== 资源加载辅助方法 ==========

    /**
     * 加载背景图片
     */
    private async loadBackgroundImage(imagePath: string): Promise<void> {
        try {
            const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame('resources', imagePath);
            if (spriteFrame && this.backgroundContainer) {
                // 设置背景图片
                const sprite = this.backgroundContainer.getComponent('Sprite') as any;
                if (sprite) {
                    sprite.spriteFrame = spriteFrame;
                }
            }
            this._loadedResources.set(`bg_image_${imagePath}`, spriteFrame);
        } catch (error) {
            Log.warn(this.MODULE_NAME, `背景图片加载失败: ${imagePath}`, error);
        }
    }

    /**
     * 加载背景音乐
     */
    private async loadBackgroundMusic(musicPath: string): Promise<void> {
        // 这里应该使用音频管理器加载背景音乐
        Log.debug(this.MODULE_NAME, `加载背景音乐: ${musicPath}`);
        // AudioManager.playBackgroundMusic(musicPath);
    }

    /**
     * 配置视差层
     */
    private async configureParallaxLayers(layers: Array<{ image: string, speed: number, depth: number }>): Promise<void> {
        for (const layer of layers) {
            try {
                const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame('resources', layer.image);
                if (spriteFrame) {
                    // 创建视差层节点
                    const layerNode = new Node(`ParallaxLayer_${layer.depth}`);
                    const sprite = layerNode.addComponent('Sprite') as any;
                    sprite.spriteFrame = spriteFrame;
                    
                    // 设置层级和速度
                    layerNode.setSiblingIndex(layer.depth);
                    (layerNode as any).parallaxSpeed = layer.speed;
                    
                    if (this.backgroundContainer) {
                        this.backgroundContainer.addChild(layerNode);
                    }
                }
            } catch (error) {
                Log.warn(this.MODULE_NAME, `视差层加载失败: ${layer.image}`, error);
            }
        }
    }

    /**
     * 放置装饰物
     */
    private async placeDecorations(decorations: Array<{ sprite: string, position: { x: number, y: number }, scale: number, rotation: number }>): Promise<void> {
        for (const decoration of decorations) {
            try {
                const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame('resources', decoration.sprite);
                if (spriteFrame) {
                    const decorationNode = new Node(`Decoration_${decoration.sprite}`);
                    const sprite = decorationNode.addComponent('Sprite') as any;
                    sprite.spriteFrame = spriteFrame;
                    
                    decorationNode.setPosition(decoration.position.x, decoration.position.y, 0);
                    decorationNode.setScale(decoration.scale, decoration.scale, 1);
                    decorationNode.setRotationFromEuler(0, 0, decoration.rotation);
                    
                    if (this.backgroundContainer) {
                        this.backgroundContainer.addChild(decorationNode);
                    }
                }
            } catch (error) {
                Log.warn(this.MODULE_NAME, `装饰物加载失败: ${decoration.sprite}`, error);
            }
        }
    }

    /**
     * 设置环境光照
     */
    private setAmbientLight(lightColor: { r: number, g: number, b: number, a: number }): void {
        // 这里应该设置场景的环境光照
        Log.debug(this.MODULE_NAME, `设置环境光照: ${JSON.stringify(lightColor)}`);
    }

    /**
     * 设置雾效
     */
    private setFog(fogColor: { r: number, g: number, b: number, a: number }, density: number): void {
        // 这里应该设置场景的雾效
        Log.debug(this.MODULE_NAME, `设置雾效: 颜色=${JSON.stringify(fogColor)}, 密度=${density}`);
    }

    /**
     * 加载环境音效
     */
    private async loadEnvironmentSound(soundPath: string): Promise<void> {
        Log.debug(this.MODULE_NAME, `加载环境音效: ${soundPath}`);
        // AudioManager.playEnvironmentSound(soundPath);
    }

    /**
     * 配置粒子效果
     */
    private async configureParticles(particles: string[]): Promise<void> {
        for (const particlePath of particles) {
            Log.debug(this.MODULE_NAME, `配置粒子效果: ${particlePath}`);
            // ParticleManager.createParticle(particlePath);
        }
    }

    /**
     * 应用自定义效果
     */
    private async applyCustomEffects(effects: any[]): Promise<void> {
        for (const effect of effects) {
            Log.debug(this.MODULE_NAME, `应用自定义效果:`, effect);
            // 根据effect的类型应用不同的效果
        }
    }

    /**
     * 创建预设对象
     */
    private async createPresetObject(objConfig: { type: string, position: { row: number, col: number }, properties: any }): Promise<void> {
        Log.debug(this.MODULE_NAME, `创建预设对象: ${objConfig.type} at (${objConfig.position.row}, ${objConfig.position.col})`);
        
        // 根据对象类型创建不同的对象
        // 这里应该有一个对象工厂来创建不同类型的对象
        // ObjectFactory.createObject(objConfig.type, objConfig.position, objConfig.properties);
    }

    // ========== 工具方法 ==========

    /**
     * 字符串转单元格类型
     */
    private stringToCellType(typeString: string): GridCellType {
        const typeMap: { [key: string]: GridCellType } = {
            'empty': GridCellType.EMPTY,
            'plant_zone': GridCellType.PLANT_ZONE,
            'path': GridCellType.PATH,
            'spawn': GridCellType.SPAWN,
            'goal': GridCellType.GOAL,
            'obstacle': GridCellType.OBSTACLE,
            'special': GridCellType.SPECIAL
        };

        return typeMap[typeString] || GridCellType.EMPTY;
    }

    /**
     * 清理已加载的资源
     */
    private clearLoadedResources(): void {
        this._loadedResources.clear();
        Log.debug(this.MODULE_NAME, '已清理加载的资源');
    }

    // ========== 公共接口 ==========

    /**
     * 获取当前关卡数据
     */
    public getCurrentLevelData(): LevelData | null {
        return this._currentLevelData;
    }

    /**
     * 获取关卡信息
     */
    public getLevelInfo(levelId?: string): any {
        const levelData = levelId ? this._levelCache.get(levelId) : this._currentLevelData;
        if (!levelData) return null;

        return {
            id: levelData.id,
            name: levelData.name,
            description: levelData.description,
            difficulty: levelData.difficulty,
            version: levelData.version,
            author: levelData.author,
            tags: levelData.tags
        };
    }

    /**
     * 重新加载当前关卡
     */
    public async reloadCurrentLevel(): Promise<boolean> {
        if (!this.currentLevelId) {
            Log.warn(this.MODULE_NAME, '没有当前关卡可以重新加载');
            return false;
        }

        // 清除缓存
        this._levelCache.delete(this.currentLevelId);
        
        return await this.loadLevel(this.currentLevelId);
    }

    /**
     * 重置关卡
     */
    public resetLevel(): void {
        if (!this._currentLevelData) {
            Log.warn(this.MODULE_NAME, '没有当前关卡可以重置');
            return;
        }

        Log.log(this.MODULE_NAME, '重置关卡');
        
        // 重新应用关卡配置
        this.applyLevelConfiguration(this._currentLevelData);
        
        // 触发重置事件
        EventManagerInstance.emit('level-reset', {
            levelId: this.currentLevelId,
            levelData: this._currentLevelData
        });
    }

    /**
     * 预加载关卡
     */
    public async preloadLevel(levelId: string): Promise<boolean> {
        if (this._levelCache.has(levelId)) {
            Log.debug(this.MODULE_NAME, `关卡已在缓存中: ${levelId}`);
            return true;
        }

        const levelData = await this.loadLevelData(levelId);
        return levelData !== null;
    }

    /**
     * 获取关卡缓存状态
     */
    public getCacheStatus(): { [levelId: string]: boolean } {
        const status: { [levelId: string]: boolean } = {};
        for (const levelId of this._levelCache.keys()) {
            status[levelId] = true;
        }
        return status;
    }

    /**
     * 清除关卡缓存
     */
    public clearLevelCache(levelId?: string): void {
        if (levelId) {
            this._levelCache.delete(levelId);
            Log.debug(this.MODULE_NAME, `清除关卡缓存: ${levelId}`);
        } else {
            this._levelCache.clear();
            Log.debug(this.MODULE_NAME, '清除所有关卡缓存');
        }
    }

    /**
     * 调试信息
     */
    public debugInfo(): void {
        Log.log(this.MODULE_NAME, '=== LevelManager 调试信息 ===');
        
        if (this._currentLevelData) {
            const levelInfo = this.getLevelInfo();
            Log.log(this.MODULE_NAME, '当前关卡:', levelInfo);
            Log.log(this.MODULE_NAME, '网格配置:', this._currentLevelData.grid);
            Log.log(this.MODULE_NAME, '特殊单元格数量:', this._currentLevelData.specialCells?.length || 0);
            Log.log(this.MODULE_NAME, '预设对象数量:', this._currentLevelData.presetObjects?.length || 0);
        } else {
            Log.log(this.MODULE_NAME, '当前没有加载的关卡');
        }
        
        Log.log(this.MODULE_NAME, `缓存的关卡数量: ${this._levelCache.size}`);
        Log.log(this.MODULE_NAME, `已加载资源数量: ${this._loadedResources.size}`);
        
        const cacheStatus = this.getCacheStatus();
        Log.log(this.MODULE_NAME, '缓存状态:', cacheStatus);
    }
}