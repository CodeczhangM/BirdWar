# GridManager 网格管理器

GridManager 是一个强大的网格管理系统，专为类似植物大战僵尸的网格玩法设计。它提供完整的网格划分、坐标转换、路径查找和可视化功能。

## 主要功能

### 1. 网格系统
- 可配置的网格大小和单元格尺寸
- 灵活的网格起始位置设置
- 支持多种单元格类型
- 网格坐标与世界坐标的双向转换

### 2. 单元格管理
- 单元格占用状态管理
- 可建造性和可通行性控制
- 单元格类型动态设置
- 邻居单元格查询

### 3. 路径查找
- A*算法路径查找
- 支持障碍物避让
- 可配置的移动方向（4方向/8方向）

### 4. 可视化系统
- 网格线绘制
- 单元格类型颜色标识
- 高亮和选择指示器
- 调试信息显示

### 5. 事件系统
- 网格交互事件
- 单元格状态变化事件
- 与EventManager集成

## 基础使用

### 导入GridManager
```typescript
import { GridManager, GridCoordinate, GridCellType } from './GridManager';
```

### 基本配置
```typescript
@ccclass('GameScene')
export class GameScene extends Component {
    @property({ type: GridManager })
    public gridManager: GridManager = null;

    start() {
        // 配置网格
        this.gridManager.reconfigureGrid({
            rows: 5,
            cols: 9,
            cellWidth: 100,
            cellHeight: 100,
            startPosition: new Vec3(-400, 200, 0),
            showGrid: true
        });
    }
}
```

## 核心接口

### GridCoordinate - 网格坐标
```typescript
interface GridCoordinate {
    row: number;    // 行索引（从0开始）
    col: number;    // 列索引（从0开始）
}
```

### GridCell - 网格单元
```typescript
interface GridCell {
    coordinate: GridCoordinate;     // 网格坐标
    worldPosition: Vec3;            // 世界坐标
    localPosition: Vec3;            // 本地坐标
    occupied: boolean;              // 是否被占用
    occupant: Node | null;          // 占用者节点
    cellType: GridCellType;         // 单元格类型
    walkable: boolean;              // 是否可通行
    buildable: boolean;             // 是否可建造
    data: any;                      // 自定义数据
}
```

### GridCellType - 单元格类型
```typescript
enum GridCellType {
    EMPTY = 'empty',           // 空地
    PLANT_ZONE = 'plant_zone', // 植物区域（可建造）
    PATH = 'path',             // 路径（可通行）
    SPAWN = 'spawn',           // 生成点
    GOAL = 'goal',             // 目标点
    OBSTACLE = 'obstacle',     // 障碍物
    SPECIAL = 'special'        // 特殊区域
}
```

## 坐标转换

### 网格坐标转世界坐标
```typescript
// 将网格坐标转换为世界坐标
const worldPos = gridManager.gridToWorldPosition(2, 3);
console.log(`网格(2,3)的世界坐标: ${worldPos.x}, ${worldPos.y}`);
```

### 世界坐标转网格坐标
```typescript
// 将世界坐标转换为网格坐标
const gridCoord = gridManager.worldToGridPosition(new Vec3(100, 50, 0));
if (gridCoord) {
    console.log(`世界坐标对应的网格: (${gridCoord.row}, ${gridCoord.col})`);
}
```

### 坐标有效性检查
```typescript
// 检查坐标是否在网格范围内
if (gridManager.isValidCoordinate(row, col)) {
    console.log('坐标有效');
}
```

## 单元格操作

### 获取单元格
```typescript
// 获取指定位置的单元格
const cell = gridManager.getCell(2, 3);
if (cell) {
    console.log(`单元格类型: ${cell.cellType}`);
    console.log(`是否被占用: ${cell.occupied}`);
    console.log(`是否可建造: ${cell.buildable}`);
}
```

### 占用单元格
```typescript
// 在指定位置放置对象
const plantNode = new Node('Plant');
if (gridManager.setCellOccupied(2, 3, plantNode)) {
    console.log('植物种植成功');
} else {
    console.log('无法在此位置种植');
}

// 清空单元格
gridManager.clearCell(2, 3);
```

### 检查单元格状态
```typescript
// 检查是否可以在指定位置建造
if (gridManager.canPlaceAt(2, 3)) {
    console.log('可以在此位置建造');
}

// 检查是否可以通行
if (gridManager.canWalkAt(2, 3)) {
    console.log('此位置可以通行');
}
```

### 设置单元格类型
```typescript
// 设置单元格为障碍物
gridManager.setCellType(2, 3, GridCellType.OBSTACLE);

// 设置单元格为植物区域
gridManager.setCellType(1, 4, GridCellType.PLANT_ZONE);
```

## 查找和搜索

### 按类型查找单元格
```typescript
// 获取所有植物区域
const plantZones = gridManager.getCellsByType(GridCellType.PLANT_ZONE);
console.log(`找到 ${plantZones.length} 个植物区域`);

// 获取所有生成点
const spawnPoints = gridManager.getCellsByType(GridCellType.SPAWN);
spawnPoints.forEach(cell => {
    console.log(`生成点: (${cell.coordinate.row}, ${cell.coordinate.col})`);
});
```

### 获取可用单元格
```typescript
// 获取所有可建造的空闲单元格
const availableCells = gridManager.getAvailableBuildCells();
console.log(`可建造位置: ${availableCells.length} 个`);
```

### 获取邻居单元格
```typescript
// 获取4方向邻居
const neighbors4 = gridManager.getNeighborCells(2, 3, false);

// 获取8方向邻居（包括对角线）
const neighbors8 = gridManager.getNeighborCells(2, 3, true);

console.log(`4方向邻居: ${neighbors4.length} 个`);
console.log(`8方向邻居: ${neighbors8.length} 个`);
```

## 路径查找

### A*路径查找
```typescript
// 从生成点到目标点查找路径
const start: GridCoordinate = { row: 2, col: 8 }; // 右侧生成点
const end: GridCoordinate = { row: 2, col: 0 };   // 左侧目标点

const path = gridManager.findPath(start, end);
if (path) {
    console.log(`找到路径，长度: ${path.length}`);
    
    // 遍历路径点
    path.forEach((coord, index) => {
        console.log(`路径点 ${index}: (${coord.row}, ${coord.col})`);
        
        // 将单位移动到路径点
        const worldPos = gridManager.gridToWorldPosition(coord.row, coord.col);
        // moveUnitTo(worldPos);
    });
} else {
    console.log('未找到路径');
}
```

### 路径查找应用示例
```typescript
// 僵尸移动逻辑
export class ZombieController extends Component {
    private currentPath: GridCoordinate[] = [];
    private currentPathIndex: number = 0;

    public moveToGoal() {
        const currentPos = this.gridManager.worldToGridPosition(this.node.worldPosition);
        const goalCells = this.gridManager.getCellsByType(GridCellType.GOAL);
        
        if (currentPos && goalCells.length > 0) {
            const nearestGoal = goalCells[0].coordinate;
            this.currentPath = this.gridManager.findPath(currentPos, nearestGoal);
            this.currentPathIndex = 0;
            
            if (this.currentPath) {
                this.moveAlongPath();
            }
        }
    }

    private moveAlongPath() {
        if (this.currentPathIndex >= this.currentPath.length) {
            return; // 到达目标
        }

        const nextCoord = this.currentPath[this.currentPathIndex];
        const worldPos = this.gridManager.gridToWorldPosition(nextCoord.row, nextCoord.col);
        
        // 移动到下一个位置
        this.moveToPosition(worldPos, () => {
            this.currentPathIndex++;
            this.moveAlongPath();
        });
    }
}
```

## 可视化系统

### 网格显示控制
```typescript
// 显示/隐藏网格线
gridManager.showGrid = true;
gridManager.updateGridDisplay();

// 设置网格颜色
gridManager.gridColor = new Color(255, 255, 255, 100);
gridManager.highlightColor = new Color(255, 255, 0, 150);
```

### 高亮系统
```typescript
// 高亮指定单元格
gridManager.highlightCell(2, 3);

// 清除高亮
gridManager.clearHighlight();

// 监听高亮事件
EventManagerInstance.on('grid-cell-highlighted', (data) => {
    const coord = data.coordinate as GridCoordinate;
    console.log(`单元格 (${coord.row}, ${coord.col}) 被高亮`);
});
```

## 事件系统

### 监听网格事件
```typescript
export class PlantManager extends Component {
    start() {
        this.setupGridEventListeners();
    }

    private setupGridEventListeners() {
        // 监听单元格选择事件
        EventManagerInstance.on('grid-cell-selected', (data) => {
            const coord = data.coordinate as GridCoordinate;
            const cell = data.cell;
            
            if (cell && cell.cellType === GridCellType.PLANT_ZONE) {
                this.tryPlantAt(coord.row, coord.col);
            }
        }, this);

        // 监听单元格占用事件
        EventManagerInstance.on('grid-cell-occupied', (data) => {
            const coord = data.coordinate as GridCoordinate;
            const occupied = data.occupied as boolean;
            
            if (occupied) {
                console.log(`单元格 (${coord.row}, ${coord.col}) 被占用`);
            } else {
                console.log(`单元格 (${coord.row}, ${coord.col}) 被清空`);
            }
        }, this);

        // 监听单元格类型变化事件
        EventManagerInstance.on('grid-cell-type-changed', (data) => {
            const coord = data.coordinate as GridCoordinate;
            const cellType = data.cellType as GridCellType;
            
            console.log(`单元格 (${coord.row}, ${coord.col}) 类型变为 ${cellType}`);
        }, this);
    }

    onDestroy() {
        EventManagerInstance.clearTargetListeners(this);
    }
}
```

### 触发网格交互
```typescript
// 在UI中处理点击事件
export class GridUI extends Component {
    @property({ type: GridManager })
    public gridManager: GridManager = null;

    start() {
        // 监听节点触摸事件
        this.node.on(Node.EventType.TOUCH_END, this.onGridTouch, this);
    }

    private onGridTouch(event: EventTouch) {
        const touchPos = event.getUILocation();
        const worldPos = this.uiToWorldPosition(touchPos);
        const gridCoord = this.gridManager.worldToGridPosition(worldPos);
        
        if (gridCoord) {
            // 触发网格单元格点击事件
            EventManagerInstance.emit('grid-cell-clicked', {
                coordinate: gridCoord
            });
        }
    }
}
```

## 实际应用示例

### 植物大战僵尸式游戏
```typescript
export class PVZGameManager extends Component {
    @property({ type: GridManager })
    public gridManager: GridManager = null;

    private selectedPlantType: string = '';
    private plants: Map<string, Node> = new Map();

    start() {
        this.setupPVZGrid();
        this.setupEventListeners();
    }

    /**
     * 设置PVZ风格的网格
     */
    private setupPVZGrid() {
        // 配置5行9列的网格，类似PVZ
        this.gridManager.reconfigureGrid({
            rows: 5,
            cols: 9,
            cellWidth: 100,
            cellHeight: 120,
            startPosition: new Vec3(-400, 240, 0),
            showGrid: true
        });

        // 设置特殊区域
        for (let row = 0; row < 5; row++) {
            // 最右侧为僵尸生成点
            this.gridManager.setCellType(row, 8, GridCellType.SPAWN);
            
            // 最左侧为目标点（房子）
            this.gridManager.setCellType(row, 0, GridCellType.GOAL);
            
            // 中间区域为植物种植区
            for (let col = 1; col < 8; col++) {
                this.gridManager.setCellType(row, col, GridCellType.PLANT_ZONE);
            }
        }
    }

    /**
     * 种植植物
     */
    public plantAt(row: number, col: number, plantType: string): boolean {
        if (!this.gridManager.canPlaceAt(row, col)) {
            return false;
        }

        const plantNode = this.createPlant(plantType);
        const worldPos = this.gridManager.gridToWorldPosition(row, col);
        plantNode.setWorldPosition(worldPos);

        if (this.gridManager.setCellOccupied(row, col, plantNode)) {
            this.plants.set(`${row},${col}`, plantNode);
            this.node.addChild(plantNode);
            return true;
        }

        plantNode.destroy();
        return false;
    }

    /**
     * 生成僵尸
     */
    public spawnZombie(row: number): Node | null {
        const spawnCol = 8; // 最右侧生成
        
        if (!this.gridManager.canWalkAt(row, spawnCol)) {
            return null;
        }

        const zombieNode = this.createZombie();
        const worldPos = this.gridManager.gridToWorldPosition(row, spawnCol);
        zombieNode.setWorldPosition(worldPos);
        
        // 设置僵尸移动路径
        const goalCoord: GridCoordinate = { row, col: 0 };
        const startCoord: GridCoordinate = { row, col: spawnCol };
        const path = this.gridManager.findPath(startCoord, goalCoord);
        
        if (path) {
            const zombieController = zombieNode.getComponent('ZombieController');
            if (zombieController) {
                zombieController.setPath(path);
            }
        }

        this.node.addChild(zombieNode);
        return zombieNode;
    }

    private createPlant(plantType: string): Node {
        // 创建植物节点的具体实现
        const plantNode = new Node(`Plant_${plantType}`);
        // 添加植物组件和逻辑
        return plantNode;
    }

    private createZombie(): Node {
        // 创建僵尸节点的具体实现
        const zombieNode = new Node('Zombie');
        // 添加僵尸组件和逻辑
        return zombieNode;
    }
}
```

### 塔防游戏应用
```typescript
export class TowerDefenseManager extends Component {
    @property({ type: GridManager })
    public gridManager: GridManager = null;

    start() {
        this.setupTowerDefenseGrid();
    }

    /**
     * 设置塔防风格的网格
     */
    private setupTowerDefenseGrid() {
        // 创建更复杂的地图布局
        this.gridManager.reconfigureGrid({
            rows: 8,
            cols: 12,
            cellWidth: 80,
            cellHeight: 80,
            startPosition: new Vec3(-480, 320, 0)
        });

        // 设置路径
        this.createPath([
            { row: 0, col: 0 },   // 起点
            { row: 0, col: 5 },
            { row: 3, col: 5 },
            { row: 3, col: 9 },
            { row: 6, col: 9 },
            { row: 6, col: 11 }   // 终点
        ]);

        // 设置可建造区域
        this.setupBuildableAreas();
    }

    private createPath(pathCoords: GridCoordinate[]) {
        // 使用A*算法创建平滑路径
        for (let i = 0; i < pathCoords.length - 1; i++) {
            const start = pathCoords[i];
            const end = pathCoords[i + 1];
            const pathSegment = this.gridManager.findPath(start, end);
            
            if (pathSegment) {
                pathSegment.forEach(coord => {
                    this.gridManager.setCellType(coord.row, coord.col, GridCellType.PATH);
                });
            }
        }
    }

    private setupBuildableAreas() {
        // 将非路径区域设置为可建造
        for (let row = 0; row < this.gridManager.rows; row++) {
            for (let col = 0; col < this.gridManager.cols; col++) {
                const cell = this.gridManager.getCell(row, col);
                if (cell && cell.cellType !== GridCellType.PATH) {
                    this.gridManager.setCellType(row, col, GridCellType.PLANT_ZONE);
                }
            }
        }
    }
}
```

## 配置选项

### GridConfig接口
```typescript
interface GridConfig {
    rows: number;              // 网格行数
    cols: number;              // 网格列数
    cellWidth: number;         // 单元格宽度
    cellHeight: number;        // 单元格高度
    startPosition: Vec3;       // 网格起始位置（左上角）
    showGrid: boolean;         // 是否显示网格线
    gridColor: Color;          // 网格线颜色
    highlightColor: Color;     // 高亮颜色
}
```

### 运行时重新配置
```typescript
// 动态调整网格大小
gridManager.reconfigureGrid({
    rows: 6,
    cols: 10,
    cellWidth: 120,
    cellHeight: 100
});

// 获取当前配置
const config = gridManager.getGridConfig();
console.log('当前网格配置:', config);
```

## 调试和统计

### 获取网格统计信息
```typescript
const stats = gridManager.getGridStats();
console.log('网格统计:', {
    totalCells: stats.totalCells,           // 总单元格数
    occupiedCells: stats.occupiedCells,     // 已占用单元格数
    buildableCells: stats.buildableCells,   // 可建造单元格数
    walkableCells: stats.walkableCells,     // 可通行单元格数
    cellTypeCount: stats.cellTypeCount      // 各类型单元格数量
});
```

### 调试信息输出
```typescript
// 输出详细的调试信息
gridManager.debugInfo();

// 输出内容包括：
// - 网格配置信息
// - 网格统计数据
// - 当前高亮和选择状态
// - 各种单元格类型的分布
```

## 性能优化

### 1. 批量操作
```typescript
// 批量设置单元格类型
const cellsToUpdate = [
    { row: 1, col: 1, type: GridCellType.OBSTACLE },
    { row: 2, col: 2, type: GridCellType.OBSTACLE },
    { row: 3, col: 3, type: GridCellType.OBSTACLE }
];

cellsToUpdate.forEach(({ row, col, type }) => {
    gridManager.setCellType(row, col, type);
});
```

### 2. 事件管理
```typescript
// 在组件销毁时清理事件监听器
onDestroy() {
    EventManagerInstance.clearTargetListeners(this);
}
```

### 3. 可视化优化
```typescript
// 只在需要时显示网格
gridManager.showGrid = false; // 提高性能

// 在调试时才启用详细显示
gridManager.enableDebug = false;
gridManager.showCoordinates = false;
```

## 扩展功能

### 自定义单元格类型
```typescript
// 扩展GridCellType枚举
enum CustomGridCellType {
    WATER = 'water',
    BRIDGE = 'bridge',
    TELEPORTER = 'teleporter'
}

// 在configureCellByType中添加自定义逻辑
private configureCellByType(cell: GridCell) {
    switch (cell.cellType) {
        case 'water':
            cell.walkable = false;
            cell.buildable = false;
            break;
        case 'bridge':
            cell.walkable = true;
            cell.buildable = false;
            break;
        // ... 其他自定义类型
    }
}
```

### 多层网格系统
```typescript
export class MultiLayerGridManager extends Component {
    @property({ type: [GridManager] })
    public gridLayers: GridManager[] = [];

    public getCell(layer: number, row: number, col: number): GridCell | null {
        if (layer >= 0 && layer < this.gridLayers.length) {
            return this.gridLayers[layer].getCell(row, col);
        }
        return null;
    }
}
```

## 最佳实践

### 1. 网格设计原则
- 根据游戏类型选择合适的网格大小
- 保持单元格尺寸与游戏对象尺寸的协调
- 合理设置不同类型的单元格区域

### 2. 性能考虑
- 避免频繁的网格重配置
- 使用事件系统而不是轮询检查网格状态
- 在不需要时关闭可视化功能

### 3. 代码组织
- 将网格相关逻辑封装在专门的管理器中
- 使用事件系统实现模块间解耦
- 为不同游戏类型创建专门的网格配置

### 4. 调试技巧
- 使用调试模式查看网格状态
- 利用统计信息监控网格使用情况
- 通过事件日志跟踪网格操作

## 注意事项

1. **坐标系统**: 网格坐标从(0,0)开始，对应左上角
2. **世界坐标**: 确保世界坐标系与网格坐标系的对应关系正确
3. **事件清理**: 及时清理事件监听器，避免内存泄漏
4. **路径查找**: A*算法适用于大多数情况，复杂地形可能需要优化
5. **可视化性能**: 大网格时考虑关闭实时可视化功能

GridManager为网格类游戏提供了完整的解决方案，支持从简单的植物大战僵尸到复杂的塔防游戏等多种玩法。通过合理配置和使用，可以快速构建出功能完善的网格游戏系统。