import { _decorator, Component, Node, Button, Label } from 'cc';
import { LevelManager, LevelData } from './LevelManager';
import { GridManager } from './GridManager';
import { EventManagerInstance, EventData } from './EventManager';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * LevelManager使用示例
 * 演示如何使用LevelManager加载和管理关卡
 */
@ccclass('LevelManagerExample')
export class LevelManagerExample extends Component {
    
    @property({ type: LevelManager, tooltip: '关卡管理器' })
    public levelManager: LevelManager = null;

    @property({ type: GridManager, tooltip: '网格管理器' })
    public gridManager: GridManager = null;

    @property({ type: [Button], tooltip: '测试按钮列表' })
    public testButtons: Button[] = [];

    @property({ type: Label, tooltip: '关卡信息显示标签' })
    public levelInfoLabel: Label = null;

    @property({ type: Label, tooltip: '状态信息显示标签' })
    public statusLabel: Label = null;

    @property({ type: Node, tooltip: '关卡UI容器' })
    public levelUIContainer: Node = null;

    private readonly MODULE_NAME = 'LevelManagerExample';
    private _availableLevels: string[] = ['level_1_1', 'level_1_2'];
    private _currentLevelIndex: number = 0;

    start() {
        this.setupEventListeners();
        this.setupButtons();
        this.runExamples();
    }

    onDestroy() {
        EventManagerInstance.clearTargetListeners(this);
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners() {
        // 监听关卡加载事件
        EventManagerInstance.on('level-load-start', (data: EventData) => {
            this.onLevelLoadStart(data);
        }, this);

        EventManagerInstance.on('level-load-complete', (data: EventData) => {
            this.onLevelLoadComplete(data);
        }, this);

        EventManagerInstance.on('level-load-failed', (data: EventData) => {
            this.onLevelLoadFailed(data);
        }, this);

        EventManagerInstance.on('level-reset', (data: EventData) => {
            this.onLevelReset(data);
        }, this);

        // 监听网格事件
        EventManagerInstance.on('grid-cell-selected', (data: EventData) => {
            this.onGridCellSelected(data);
        }, this);
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        if (this.testButtons.length >= 8) {
            // 加载关卡1-1按钮
            this.testButtons[0].node.on(Button.EventType.CLICK, () => {
                this.loadLevel('level_1_1');
            });

            // 加载关卡1-2按钮
            this.testButtons[1].node.on(Button.EventType.CLICK, () => {
                this.loadLevel('level_1_2');
            });

            // 下一关按钮
            this.testButtons[2].node.on(Button.EventType.CLICK, () => {
                this.loadNextLevel();
            });

            // 上一关按钮
            this.testButtons[3].node.on(Button.EventType.CLICK, () => {
                this.loadPreviousLevel();
            });

            // 重新加载关卡按钮
            this.testButtons[4].node.on(Button.EventType.CLICK, () => {
                this.reloadCurrentLevel();
            });

            // 重置关卡按钮
            this.testButtons[5].node.on(Button.EventType.CLICK, () => {
                this.resetLevel();
            });

            // 显示关卡信息按钮
            this.testButtons[6].node.on(Button.EventType.CLICK, () => {
                this.showLevelInfo();
            });

            // 调试信息按钮
            this.testButtons[7].node.on(Button.EventType.CLICK, () => {
                this.showDebugInfo();
            });
        }
    }

    /**
     * 运行示例
     */
    private async runExamples() {
        Log.log(this.MODULE_NAME, '=== LevelManager 使用示例开始 ===');

        if (!this.levelManager) {
            Log.error(this.MODULE_NAME, 'LevelManager未设置');
            return;
        }

        // 等待初始化完成
        await this.delay(1000);

        // 示例1: 预加载关卡
        await this.example1_PreloadLevels();

        await this.delay(1000);

        // 示例2: 加载关卡
        await this.example2_LoadLevel();

        await this.delay(1000);

        // 示例3: 关卡信息获取
        this.example3_LevelInfo();

        await this.delay(1000);

        // 示例4: 缓存管理
        this.example4_CacheManagement();

        this.updateStatusLabel('示例演示完成，可以手动测试各种功能');
    }

    /**
     * 示例1: 预加载关卡
     */
    private async example1_PreloadLevels() {
        Log.log(this.MODULE_NAME, '--- 示例1: 预加载关卡 ---');

        for (const levelId of this._availableLevels) {
            const success = await this.levelManager.preloadLevel(levelId);
            Log.log(this.MODULE_NAME, `预加载关卡 ${levelId}: ${success ? '成功' : '失败'}`);
        }

        const cacheStatus = this.levelManager.getCacheStatus();
        Log.log(this.MODULE_NAME, '缓存状态:', cacheStatus);
    }

    /**
     * 示例2: 加载关卡
     */
    private async example2_LoadLevel() {
        Log.log(this.MODULE_NAME, '--- 示例2: 加载关卡 ---');

        const levelId = 'level_1_1';
        const success = await this.levelManager.loadLevel(levelId);
        
        if (success) {
            Log.log(this.MODULE_NAME, `关卡 ${levelId} 加载成功`);
            this.displayLevelData();
        } else {
            Log.error(this.MODULE_NAME, `关卡 ${levelId} 加载失败`);
        }
    }

    /**
     * 示例3: 关卡信息获取
     */
    private example3_LevelInfo() {
        Log.log(this.MODULE_NAME, '--- 示例3: 关卡信息获取 ---');

        const levelInfo = this.levelManager.getLevelInfo();
        if (levelInfo) {
            Log.log(this.MODULE_NAME, '当前关卡信息:', levelInfo);
        }

        // 获取其他关卡信息
        for (const levelId of this._availableLevels) {
            const info = this.levelManager.getLevelInfo(levelId);
            if (info) {
                Log.log(this.MODULE_NAME, `关卡 ${levelId} 信息:`, info);
            }
        }
    }

    /**
     * 示例4: 缓存管理
     */
    private example4_CacheManagement() {
        Log.log(this.MODULE_NAME, '--- 示例4: 缓存管理 ---');

        const cacheStatus = this.levelManager.getCacheStatus();
        Log.log(this.MODULE_NAME, '当前缓存状态:', cacheStatus);

        // 清除特定关卡缓存
        this.levelManager.clearLevelCache('level_1_2');
        Log.log(this.MODULE_NAME, '清除level_1_2缓存后的状态:', this.levelManager.getCacheStatus());
    }

    // ========== 事件处理方法 ==========

    /**
     * 关卡加载开始
     */
    private onLevelLoadStart(data: EventData) {
        const levelId = data.levelId as string;
        Log.log(this.MODULE_NAME, `关卡加载开始: ${levelId}`);
        this.updateStatusLabel(`正在加载关卡: ${levelId}...`);
    }

    /**
     * 关卡加载完成
     */
    private onLevelLoadComplete(data: EventData) {
        const levelId = data.levelId as string;
        const levelData = data.levelData as LevelData;
        
        Log.log(this.MODULE_NAME, `关卡加载完成: ${levelId}`);
        this.updateStatusLabel(`关卡加载完成: ${levelData.name}`);
        
        // 更新UI显示
        this.displayLevelData();
        this.updateLevelUI(levelData);
    }

    /**
     * 关卡加载失败
     */
    private onLevelLoadFailed(data: EventData) {
        const levelId = data.levelId as string;
        const error = data.error as string;
        
        Log.error(this.MODULE_NAME, `关卡加载失败: ${levelId}, 错误: ${error}`);
        this.updateStatusLabel(`关卡加载失败: ${levelId} - ${error}`);
    }

    /**
     * 关卡重置
     */
    private onLevelReset(data: EventData) {
        const levelId = data.levelId as string;
        Log.log(this.MODULE_NAME, `关卡重置: ${levelId}`);
        this.updateStatusLabel(`关卡已重置: ${levelId}`);
    }

    /**
     * 网格单元格选择
     */
    private onGridCellSelected(data: EventData) {
        const coord = data.coordinate;
        const cell = data.cell;
        
        if (cell && cell.data) {
            Log.debug(this.MODULE_NAME, `选择了特殊单元格 (${coord.row}, ${coord.col}):`, cell.data);
        }
    }

    // ========== UI更新方法 ==========

    /**
     * 显示关卡数据
     */
    private displayLevelData() {
        const levelData = this.levelManager.getCurrentLevelData();
        if (!levelData) {
            this.updateLevelInfoLabel('没有加载的关卡');
            return;
        }

        const info = [
            `关卡: ${levelData.name}`,
            `ID: ${levelData.id}`,
            `难度: ${levelData.difficulty}/10`,
            `描述: ${levelData.description}`,
            `网格: ${levelData.grid.rows}x${levelData.grid.cols}`,
            `环境: ${levelData.environment?.timeOfDay || '未知'} - ${levelData.environment?.weather || '未知'}`,
            `敌人波次: ${levelData.enemies?.waves?.length || 0}`,
            `可用植物: ${levelData.resources?.availablePlants?.length || 0}种`,
            `特殊单元格: ${levelData.specialCells?.length || 0}个`,
            `预设对象: ${levelData.presetObjects?.length || 0}个`
        ].join('\n');

        this.updateLevelInfoLabel(info);
    }

    /**
     * 更新关卡UI
     */
    private updateLevelUI(levelData: LevelData) {
        // 这里可以根据关卡数据更新UI元素
        // 比如显示可用植物、目标、资源等
        
        if (this.levelUIContainer) {
            // 清除旧的UI元素
            this.levelUIContainer.removeAllChildren();
            
            // 创建新的UI元素
            this.createObjectivesUI(levelData.objectives);
            this.createResourcesUI(levelData.resources);
            this.createAvailablePlantsUI(levelData.resources?.availablePlants || []);
        }
    }

    /**
     * 创建目标UI
     */
    private createObjectivesUI(objectives: any) {
        if (!objectives) return;

        Log.debug(this.MODULE_NAME, '创建目标UI:', objectives);
        // 实际实现中应该创建UI节点显示目标信息
    }

    /**
     * 创建资源UI
     */
    private createResourcesUI(resources: any) {
        if (!resources) return;

        Log.debug(this.MODULE_NAME, '创建资源UI:', resources);
        // 实际实现中应该创建UI节点显示资源信息
    }

    /**
     * 创建可用植物UI
     */
    private createAvailablePlantsUI(plants: string[]) {
        Log.debug(this.MODULE_NAME, '创建植物选择UI:', plants);
        // 实际实现中应该创建植物选择卡片
    }

    /**
     * 更新关卡信息标签
     */
    private updateLevelInfoLabel(text: string) {
        if (this.levelInfoLabel) {
            this.levelInfoLabel.string = text;
        }
        Log.debug(this.MODULE_NAME, '关卡信息:', text);
    }

    /**
     * 更新状态标签
     */
    private updateStatusLabel(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
        Log.log(this.MODULE_NAME, text);
    }

    // ========== 关卡操作方法 ==========

    /**
     * 加载指定关卡
     */
    private async loadLevel(levelId: string) {
        const success = await this.levelManager.loadLevel(levelId);
        if (success) {
            this._currentLevelIndex = this._availableLevels.indexOf(levelId);
        }
    }

    /**
     * 加载下一关
     */
    private async loadNextLevel() {
        const nextIndex = (this._currentLevelIndex + 1) % this._availableLevels.length;
        const nextLevelId = this._availableLevels[nextIndex];
        await this.loadLevel(nextLevelId);
    }

    /**
     * 加载上一关
     */
    private async loadPreviousLevel() {
        const prevIndex = (this._currentLevelIndex - 1 + this._availableLevels.length) % this._availableLevels.length;
        const prevLevelId = this._availableLevels[prevIndex];
        await this.loadLevel(prevLevelId);
    }

    /**
     * 重新加载当前关卡
     */
    private async reloadCurrentLevel() {
        const success = await this.levelManager.reloadCurrentLevel();
        if (success) {
            this.updateStatusLabel('关卡重新加载完成');
        } else {
            this.updateStatusLabel('关卡重新加载失败');
        }
    }

    /**
     * 重置关卡
     */
    private resetLevel() {
        this.levelManager.resetLevel();
    }

    /**
     * 显示关卡信息
     */
    private showLevelInfo() {
        const levelData = this.levelManager.getCurrentLevelData();
        if (levelData) {
            Log.log(this.MODULE_NAME, '=== 详细关卡信息 ===');
            Log.log(this.MODULE_NAME, '基础信息:', {
                id: levelData.id,
                name: levelData.name,
                description: levelData.description,
                difficulty: levelData.difficulty,
                author: levelData.author,
                tags: levelData.tags
            });
            
            Log.log(this.MODULE_NAME, '网格配置:', levelData.grid);
            Log.log(this.MODULE_NAME, '环境配置:', levelData.environment);
            Log.log(this.MODULE_NAME, '背景配置:', levelData.background);
            Log.log(this.MODULE_NAME, '目标配置:', levelData.objectives);
            Log.log(this.MODULE_NAME, '敌人配置:', levelData.enemies);
            Log.log(this.MODULE_NAME, '资源配置:', levelData.resources);
            Log.log(this.MODULE_NAME, '自定义数据:', levelData.customData);
        } else {
            Log.warn(this.MODULE_NAME, '没有当前关卡数据');
        }
    }

    /**
     * 显示调试信息
     */
    private showDebugInfo() {
        this.levelManager.debugInfo();
        
        if (this.gridManager) {
            this.gridManager.debugInfo();
        }
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== 公共接口方法 ==========

    /**
     * 手动加载关卡1-1
     */
    public manualLoadLevel1_1() {
        this.loadLevel('level_1_1');
    }

    /**
     * 手动加载关卡1-2
     */
    public manualLoadLevel1_2() {
        this.loadLevel('level_1_2');
    }

    /**
     * 手动加载下一关
     */
    public manualLoadNext() {
        this.loadNextLevel();
    }

    /**
     * 手动加载上一关
     */
    public manualLoadPrevious() {
        this.loadPreviousLevel();
    }

    /**
     * 手动重新加载
     */
    public manualReload() {
        this.reloadCurrentLevel();
    }

    /**
     * 手动重置
     */
    public manualReset() {
        this.resetLevel();
    }

    /**
     * 手动显示信息
     */
    public manualShowInfo() {
        this.showLevelInfo();
    }

    /**
     * 手动显示调试信息
     */
    public manualShowDebug() {
        this.showDebugInfo();
    }

    /**
     * 获取当前关卡的自定义数据
     */
    public getCurrentLevelCustomData(): any {
        const levelData = this.levelManager.getCurrentLevelData();
        return levelData ? levelData.customData : null;
    }

    /**
     * 检查关卡解锁条件
     */
    public checkUnlockConditions(): boolean {
        const customData = this.getCurrentLevelCustomData();
        if (!customData || !customData.unlockConditions) {
            return true;
        }

        const conditions = customData.unlockConditions.requirements;
        for (const condition of conditions) {
            // 这里应该检查具体的解锁条件
            Log.debug(this.MODULE_NAME, '检查解锁条件:', condition);
        }

        return true; // 简化实现，总是返回true
    }

    /**
     * 获取关卡成就列表
     */
    public getLevelAchievements(): any[] {
        const customData = this.getCurrentLevelCustomData();
        return customData ? (customData.achievements || []) : [];
    }
}