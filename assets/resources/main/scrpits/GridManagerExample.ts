import { _decorator, Component, Node, Button, Label, Vec3 } from 'cc';
import { GridManager, GridCoordinate, GridCellType } from './GridManager';
import { EventManagerInstance, EventData } from './EventManager';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * GridManager使用示例
 * 演示如何使用GridManager创建类似植物大战僵尸的网格系统
 */
@ccclass('GridManagerExample')
export class GridManagerExample extends Component {
    
    @property({ type: GridManager, tooltip: '网格管理器' })
    public gridManager: GridManager = null;

    @property({ type: [Button], tooltip: '测试按钮列表' })
    public testButtons: Button[] = [];

    @property({ type: Label, tooltip: '信息显示标签' })
    public infoLabel: Label = null;

    @property({ type: Node, tooltip: '植物预制件' })
    public plantPrefab: Node = null;

    @property({ type: Node, tooltip: '僵尸预制件' })
    public zombiePrefab: Node = null;

    private readonly MODULE_NAME = 'GridManagerExample';
    private _plants: Map<string, Node> = new Map();
    private _zombies: Node[] = [];
    private _selectedPlantType: string = 'sunflower';

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
        // 监听网格单元格选择事件
        EventManagerInstance.on('grid-cell-selected', (data: EventData) => {
            this.onGridCellSelected(data);
        }, this);

        // 监听网格单元格高亮事件
        EventManagerInstance.on('grid-cell-highlighted', (data: EventData) => {
            this.onGridCellHighlighted(data);
        }, this);

        // 监听网格单元格占用事件
        EventManagerInstance.on('grid-cell-occupied', (data: EventData) => {
            this.onGridCellOccupied(data);
        }, this);
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        if (this.testButtons.length >= 6) {
            // 种植向日葵按钮
            this.testButtons[0].node.on(Button.EventType.CLICK, () => {
                this._selectedPlantType = 'sunflower';
                this.updateInfoLabel('选择了向日葵，点击网格种植');
            });

            // 种植豌豆射手按钮
            this.testButtons[1].node.on(Button.EventType.CLICK, () => {
                this._selectedPlantType = 'peashooter';
                this.updateInfoLabel('选择了豌豆射手，点击网格种植');
            });

            // 生成僵尸按钮
            this.testButtons[2].node.on(Button.EventType.CLICK, () => {
                this.spawnZombie();
            });

            // 清除所有植物按钮
            this.testButtons[3].node.on(Button.EventType.CLICK, () => {
                this.clearAllPlants();
            });

            // 显示路径按钮
            this.testButtons[4].node.on(Button.EventType.CLICK, () => {
                this.showPathExample();
            });

            // 调试信息按钮
            this.testButtons[5].node.on(Button.EventType.CLICK, () => {
                this.showDebugInfo();
            });
        }
    }

    /**
     * 运行示例
     */
    private async runExamples() {
        Log.log(this.MODULE_NAME, '=== GridManager 使用示例开始 ===');

        if (!this.gridManager) {
            Log.error(this.MODULE_NAME, 'GridManager未设置');
            return;
        }

        // 等待网格初始化完成
        await this.delay(500);

        // 示例1: 设置特殊单元格类型
        this.example1_SetupSpecialCells();

        await this.delay(1000);

        // 示例2: 演示植物种植
        this.example2_PlantDemo();

        await this.delay(1000);

        // 示例3: 演示路径查找
        this.example3_PathfindingDemo();

        await this.delay(1000);

        // 示例4: 网格统计信息
        this.example4_GridStats();

        this.updateInfoLabel('示例演示完成，可以手动测试各种功能');
    }

    /**
     * 示例1: 设置特殊单元格类型
     */
    private example1_SetupSpecialCells() {
        Log.log(this.MODULE_NAME, '--- 示例1: 设置特殊单元格类型 ---');

        // 设置一些障碍物
        this.gridManager.setCellType(2, 4, GridCellType.OBSTACLE);
        this.gridManager.setCellType(3, 6, GridCellType.OBSTACLE);

        // 设置特殊区域
        this.gridManager.setCellType(1, 5, GridCellType.SPECIAL);

        Log.log(this.MODULE_NAME, '特殊单元格设置完成');
    }

    /**
     * 示例2: 演示植物种植
     */
    private example2_PlantDemo() {
        Log.log(this.MODULE_NAME, '--- 示例2: 演示植物种植 ---');

        // 在几个位置种植植物
        this.plantAt(1, 2, 'sunflower');
        this.plantAt(2, 3, 'peashooter');
        this.plantAt(3, 2, 'sunflower');
        this.plantAt(4, 3, 'peashooter');

        Log.log(this.MODULE_NAME, '演示植物种植完成');
    }

    /**
     * 示例3: 演示路径查找
     */
    private example3_PathfindingDemo() {
        Log.log(this.MODULE_NAME, '--- 示例3: 演示路径查找 ---');

        // 从右侧生成点到左侧目标点查找路径
        const start: GridCoordinate = { row: 2, col: 8 }; // 右侧生成点
        const end: GridCoordinate = { row: 2, col: 0 };   // 左侧目标点

        const path = this.gridManager.findPath(start, end);
        if (path) {
            Log.log(this.MODULE_NAME, `找到路径，长度: ${path.length}`);
            path.forEach((coord, index) => {
                Log.debug(this.MODULE_NAME, `路径点 ${index}: (${coord.row}, ${coord.col})`);
            });
        } else {
            Log.warn(this.MODULE_NAME, '未找到路径');
        }
    }

    /**
     * 示例4: 网格统计信息
     */
    private example4_GridStats() {
        Log.log(this.MODULE_NAME, '--- 示例4: 网格统计信息 ---');

        const stats = this.gridManager.getGridStats();
        Log.log(this.MODULE_NAME, '网格统计信息:', stats);

        // 获取不同类型的单元格
        const plantZones = this.gridManager.getCellsByType(GridCellType.PLANT_ZONE);
        const spawnPoints = this.gridManager.getCellsByType(GridCellType.SPAWN);
        const goalPoints = this.gridManager.getCellsByType(GridCellType.GOAL);

        Log.log(this.MODULE_NAME, `植物区域: ${plantZones.length} 个`);
        Log.log(this.MODULE_NAME, `生成点: ${spawnPoints.length} 个`);
        Log.log(this.MODULE_NAME, `目标点: ${goalPoints.length} 个`);
    }

    // ========== 事件处理方法 ==========

    /**
     * 处理网格单元格选择
     */
    private onGridCellSelected(data: EventData) {
        const coord = data.coordinate as GridCoordinate;
        const cell = data.cell;

        Log.debug(this.MODULE_NAME, `单元格被选择: (${coord.row}, ${coord.col})`);

        if (cell && cell.cellType === GridCellType.PLANT_ZONE && this._selectedPlantType) {
            // 尝试在选择的位置种植植物
            if (this.plantAt(coord.row, coord.col, this._selectedPlantType)) {
                this.updateInfoLabel(`在 (${coord.row}, ${coord.col}) 种植了 ${this._selectedPlantType}`);
            } else {
                this.updateInfoLabel(`无法在 (${coord.row}, ${coord.col}) 种植植物`);
            }
        } else {
            this.updateInfoLabel(`选择了 (${coord.row}, ${coord.col}) - ${cell ? cell.cellType : '无效'}`);
        }
    }

    /**
     * 处理网格单元格高亮
     */
    private onGridCellHighlighted(data: EventData) {
        const coord = data.coordinate as GridCoordinate;
        Log.debug(this.MODULE_NAME, `单元格被高亮: (${coord.row}, ${coord.col})`);
    }

    /**
     * 处理网格单元格占用
     */
    private onGridCellOccupied(data: EventData) {
        const coord = data.coordinate as GridCoordinate;
        const occupied = data.occupied as boolean;
        
        Log.debug(this.MODULE_NAME, `单元格占用状态改变: (${coord.row}, ${coord.col}) -> ${occupied}`);
    }

    // ========== 游戏逻辑方法 ==========

    /**
     * 在指定位置种植植物
     */
    private plantAt(row: number, col: number, plantType: string): boolean {
        if (!this.gridManager.canPlaceAt(row, col)) {
            Log.warn(this.MODULE_NAME, `无法在 (${row}, ${col}) 种植植物`);
            return false;
        }

        // 创建植物节点
        const plantNode = this.createPlantNode(plantType);
        if (!plantNode) {
            Log.error(this.MODULE_NAME, `创建植物节点失败: ${plantType}`);
            return false;
        }

        // 设置植物位置
        const worldPos = this.gridManager.gridToWorldPosition(row, col);
        plantNode.setWorldPosition(worldPos);

        // 占用网格单元
        if (this.gridManager.setCellOccupied(row, col, plantNode)) {
            // 添加到植物列表
            const key = `${row},${col}`;
            this._plants.set(key, plantNode);
            
            // 添加到场景
            this.node.addChild(plantNode);
            
            Log.log(this.MODULE_NAME, `成功种植 ${plantType} 在 (${row}, ${col})`);
            return true;
        }

        // 如果占用失败，销毁节点
        plantNode.destroy();
        return false;
    }

    /**
     * 创建植物节点
     */
    private createPlantNode(plantType: string): Node | null {
        // 这里应该根据植物类型创建不同的节点
        // 为了示例，我们创建一个简单的节点
        const plantNode = new Node(`Plant_${plantType}`);
        
        // 添加植物组件或设置植物属性
        plantNode.addComponent('PlantComponent'); // 假设有植物组件
        
        // 设置植物数据
        const plantData = {
            type: plantType,
            health: this.getPlantHealth(plantType),
            damage: this.getPlantDamage(plantType),
            attackSpeed: this.getPlantAttackSpeed(plantType)
        };
        
        // 将数据存储在节点上
        (plantNode as any).plantData = plantData;
        
        return plantNode;
    }

    /**
     * 获取植物生命值
     */
    private getPlantHealth(plantType: string): number {
        const healthMap: { [key: string]: number } = {
            'sunflower': 100,
            'peashooter': 150,
            'wallnut': 300,
            'cherrybomb': 50
        };
        return healthMap[plantType] || 100;
    }

    /**
     * 获取植物伤害
     */
    private getPlantDamage(plantType: string): number {
        const damageMap: { [key: string]: number } = {
            'sunflower': 0,
            'peashooter': 20,
            'wallnut': 0,
            'cherrybomb': 200
        };
        return damageMap[plantType] || 0;
    }

    /**
     * 获取植物攻击速度
     */
    private getPlantAttackSpeed(plantType: string): number {
        const speedMap: { [key: string]: number } = {
            'sunflower': 0,
            'peashooter': 1.5,
            'wallnut': 0,
            'cherrybomb': 0
        };
        return speedMap[plantType] || 0;
    }

    /**
     * 生成僵尸
     */
    private spawnZombie() {
        // 在随机的生成点生成僵尸
        const spawnCells = this.gridManager.getCellsByType(GridCellType.SPAWN);
        if (spawnCells.length === 0) {
            Log.warn(this.MODULE_NAME, '没有可用的生成点');
            return;
        }

        const randomSpawn = spawnCells[Math.floor(Math.random() * spawnCells.length)];
        const zombieNode = this.createZombieNode();
        
        if (zombieNode) {
            const worldPos = this.gridManager.gridToWorldPosition(
                randomSpawn.coordinate.row, 
                randomSpawn.coordinate.col
            );
            zombieNode.setWorldPosition(worldPos);
            this.node.addChild(zombieNode);
            this._zombies.push(zombieNode);
            
            Log.log(this.MODULE_NAME, `生成僵尸在 (${randomSpawn.coordinate.row}, ${randomSpawn.coordinate.col})`);
            this.updateInfoLabel(`生成了一只僵尸在 (${randomSpawn.coordinate.row}, ${randomSpawn.coordinate.col})`);
        }
    }

    /**
     * 创建僵尸节点
     */
    private createZombieNode(): Node | null {
        const zombieNode = new Node('Zombie');
        
        // 添加僵尸组件
        zombieNode.addComponent('ZombieComponent'); // 假设有僵尸组件
        
        // 设置僵尸数据
        const zombieData = {
            health: 100,
            damage: 10,
            speed: 50
        };
        
        (zombieNode as any).zombieData = zombieData;
        
        return zombieNode;
    }

    /**
     * 清除所有植物
     */
    private clearAllPlants() {
        for (const [key, plantNode] of this._plants.entries()) {
            const [row, col] = key.split(',').map(Number);
            
            // 清空网格单元
            this.gridManager.clearCell(row, col);
            
            // 销毁植物节点
            if (plantNode && plantNode.isValid) {
                plantNode.destroy();
            }
        }
        
        this._plants.clear();
        Log.log(this.MODULE_NAME, '清除了所有植物');
        this.updateInfoLabel('清除了所有植物');
    }

    /**
     * 显示路径示例
     */
    private showPathExample() {
        // 清除现有高亮
        this.gridManager.clearHighlight();
        
        // 找一条从右到左的路径
        const start: GridCoordinate = { row: 2, col: 8 };
        const end: GridCoordinate = { row: 2, col: 0 };
        
        const path = this.gridManager.findPath(start, end);
        if (path) {
            // 依次高亮路径上的每个点
            this.highlightPath(path, 0);
            this.updateInfoLabel(`找到路径，长度: ${path.length}`);
        } else {
            this.updateInfoLabel('未找到路径');
        }
    }

    /**
     * 高亮路径
     */
    private highlightPath(path: GridCoordinate[], index: number) {
        if (index >= path.length) {
            return;
        }
        
        const coord = path[index];
        this.gridManager.highlightCell(coord.row, coord.col);
        
        // 延迟高亮下一个点
        setTimeout(() => {
            this.highlightPath(path, index + 1);
        }, 300);
    }

    /**
     * 显示调试信息
     */
    private showDebugInfo() {
        this.gridManager.debugInfo();
        
        const stats = this.gridManager.getGridStats();
        const config = this.gridManager.getGridConfig();
        
        this.updateInfoLabel(`网格: ${config.rows}x${config.cols}, 占用: ${stats.occupiedCells}/${stats.totalCells}`);
    }

    /**
     * 更新信息标签
     */
    private updateInfoLabel(text: string) {
        if (this.infoLabel) {
            this.infoLabel.string = text;
        }
        Log.log(this.MODULE_NAME, text);
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== 公共接口方法 ==========

    /**
     * 手动种植向日葵
     */
    public plantSunflower() {
        this._selectedPlantType = 'sunflower';
        this.updateInfoLabel('选择了向日葵，点击网格种植');
    }

    /**
     * 手动种植豌豆射手
     */
    public plantPeashooter() {
        this._selectedPlantType = 'peashooter';
        this.updateInfoLabel('选择了豌豆射手，点击网格种植');
    }

    /**
     * 手动生成僵尸
     */
    public manualSpawnZombie() {
        this.spawnZombie();
    }

    /**
     * 手动清除植物
     */
    public manualClearPlants() {
        this.clearAllPlants();
    }

    /**
     * 手动显示路径
     */
    public manualShowPath() {
        this.showPathExample();
    }

    /**
     * 手动显示调试信息
     */
    public manualShowDebug() {
        this.showDebugInfo();
    }
}