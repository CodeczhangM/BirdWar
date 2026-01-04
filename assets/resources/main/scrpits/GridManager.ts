import { _decorator, Component, Node, Vec3, Vec2, Graphics, Color, UITransform } from 'cc';
import { Log } from './Logger';
import { EventManagerInstance, EventData } from './EventManager';

const { ccclass, property } = _decorator;

/**
 * 网格坐标接口
 */
export interface GridCoordinate {
    row: number;
    col: number;
}

/**
 * 网格单元接口
 */
export interface GridCell {
    coordinate: GridCoordinate;
    worldPosition: Vec3;
    localPosition: Vec3;
    occupied: boolean;
    occupant: Node | null;
    cellType: GridCellType;
    walkable: boolean;
    buildable: boolean;
    data: any;
}

/**
 * 网格单元类型枚举
 */
export enum GridCellType {
    EMPTY = 'empty',           // 空地
    PLANT_ZONE = 'plant_zone', // 植物区域
    PATH = 'path',             // 路径
    SPAWN = 'spawn',           // 生成点
    GOAL = 'goal',             // 目标点
    OBSTACLE = 'obstacle',     // 障碍物
    SPECIAL = 'special'        // 特殊区域
}

/**
 * 网格配置接口
 */
export interface GridConfig {
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    startPosition: Vec3;
    showGrid: boolean;
    gridColor: Color;
    highlightColor: Color;
}

/**
 * 网格管理器
 * 负责管理游戏地图的网格系统，类似植物大战僵尸的玩法
 */
@ccclass('GridManager')
export class GridManager extends Component {
    
    // ========== 网格配置 ==========
    @property({ type: Number, tooltip: '网格行数', range: [1, 20, 1] })
    public rows: number = 5;

    @property({ type: Number, tooltip: '网格列数', range: [1, 20, 1] })
    public cols: number = 9;

    @property({ type: Number, tooltip: '单元格宽度', range: [50, 200, 10] })
    public cellWidth: number = 100;

    @property({ type: Number, tooltip: '单元格高度', range: [50, 200, 10] })
    public cellHeight: number = 100;

    @property({ type: Vec3, tooltip: '网格起始位置（左上角）' })
    public startPosition: Vec3 = new Vec3(-400, 200, 0);

    @property({ type: Boolean, tooltip: '是否显示网格线' })
    public showGrid: boolean = true;

    @property({ type: Color, tooltip: '网格线颜色' })
    public gridColor: Color = new Color(255, 255, 255, 100);

    @property({ type: Color, tooltip: '高亮颜色' })
    public highlightColor: Color = new Color(255, 255, 0, 150);

    // ========== 可视化节点 ==========
    @property({ type: Node, tooltip: '网格容器节点' })
    public gridContainer: Node = null;

    @property({ type: Graphics, tooltip: '网格绘制组件' })
    public gridGraphics: Graphics = null;

    @property({ type: Node, tooltip: '高亮指示器节点' })
    public highlightIndicator: Node = null;

    // ========== 调试选项 ==========
    @property({ type: Boolean, tooltip: '启用调试模式' })
    public enableDebug: boolean = false;

    @property({ type: Boolean, tooltip: '显示坐标信息' })
    public showCoordinates: boolean = false;

    // ========== 私有变量 ==========
    private _grid: GridCell[][] = [];
    private _highlightedCell: GridCoordinate | null = null;
    private _selectedCell: GridCoordinate | null = null;
    private readonly MODULE_NAME = 'GridManager';

    // ========== 生命周期 ==========
    onLoad() {
        this.initializeGrid();
        this.setupEventListeners();
    }

    start() {
        this.createGridVisuals();
        this.updateGridDisplay();
    }

    onDestroy() {
        EventManagerInstance.clearTargetListeners(this);
    }

    // ========== 初始化方法 ==========
    
    /**
     * 初始化网格系统
     */
    private initializeGrid() {
        Log.log(this.MODULE_NAME, `初始化网格系统: ${this.rows}x${this.cols}`);
        
        this._grid = [];
        
        for (let row = 0; row < this.rows; row++) {
            this._grid[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const cell = this.createGridCell(row, col);
                this._grid[row][col] = cell;
            }
        }

        Log.log(this.MODULE_NAME, `网格初始化完成，共 ${this.rows * this.cols} 个单元格`);
    }

    /**
     * 创建网格单元
     */
    private createGridCell(row: number, col: number): GridCell {
        const worldPos = this.gridToWorldPosition(row, col);
        const localPos = this.worldToLocalPosition(worldPos);

        const cell: GridCell = {
            coordinate: { row, col },
            worldPosition: worldPos,
            localPosition: localPos,
            occupied: false,
            occupant: null,
            cellType: this.determineCellType(row, col),
            walkable: true,
            buildable: true,
            data: {}
        };

        // 根据单元格类型设置属性
        this.configureCellByType(cell);

        return cell;
    }

    /**
     * 根据位置确定单元格类型
     */
    private determineCellType(row: number, col: number): GridCellType {
        // 默认实现：类似植物大战僵尸的布局
        
        // 最右侧列作为生成点
        if (col === this.cols - 1) {
            return GridCellType.SPAWN;
        }
        
        // 最左侧列作为目标点
        if (col === 0) {
            return GridCellType.GOAL;
        }
        
        // 中间区域作为植物区域
        if (col >= 1 && col <= this.cols - 2) {
            return GridCellType.PLANT_ZONE;
        }
        
        return GridCellType.EMPTY;
    }

    /**
     * 根据类型配置单元格属性
     */
    private configureCellByType(cell: GridCell) {
        switch (cell.cellType) {
            case GridCellType.SPAWN:
                cell.walkable = true;
                cell.buildable = false;
                break;
            case GridCellType.GOAL:
                cell.walkable = true;
                cell.buildable = false;
                break;
            case GridCellType.PLANT_ZONE:
                cell.walkable = false;
                cell.buildable = true;
                break;
            case GridCellType.PATH:
                cell.walkable = true;
                cell.buildable = false;
                break;
            case GridCellType.OBSTACLE:
                cell.walkable = false;
                cell.buildable = false;
                break;
            default:
                cell.walkable = true;
                cell.buildable = true;
                break;
        }
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners() {
        // 监听网格相关事件
        EventManagerInstance.on('grid-cell-clicked', (data: EventData) => {
            this.onCellClicked(data);
        }, this);

        EventManagerInstance.on('grid-cell-hovered', (data: EventData) => {
            this.onCellHovered(data);
        }, this);
    }

    // ========== 坐标转换方法 ==========

    /**
     * 网格坐标转世界坐标
     */
    public gridToWorldPosition(row: number, col: number): Vec3 {
        const x = this.startPosition.x + col * this.cellWidth + this.cellWidth / 2;
        const y = this.startPosition.y - row * this.cellHeight - this.cellHeight / 2;
        return new Vec3(x, y, this.startPosition.z);
    }

    /**
     * 世界坐标转网格坐标
     */
    public worldToGridPosition(worldPos: Vec3): GridCoordinate | null {
        const relativeX = worldPos.x - this.startPosition.x;
        const relativeY = this.startPosition.y - worldPos.y;

        const col = Math.floor(relativeX / this.cellWidth);
        const row = Math.floor(relativeY / this.cellHeight);

        if (this.isValidCoordinate(row, col)) {
            return { row, col };
        }

        return null;
    }

    /**
     * 世界坐标转本地坐标
     */
    private worldToLocalPosition(worldPos: Vec3): Vec3 {
        if (this.gridContainer) {
            const containerTransform = this.gridContainer.getComponent(UITransform);
            if (containerTransform) {
                return containerTransform.convertToNodeSpaceAR(worldPos);
            }
        }
        return worldPos.clone();
    }

    /**
     * 验证坐标是否有效
     */
    public isValidCoordinate(row: number, col: number): boolean {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    // ========== 网格操作方法 ==========

    /**
     * 获取网格单元
     */
    public getCell(row: number, col: number): GridCell | null {
        if (!this.isValidCoordinate(row, col)) {
            return null;
        }
        return this._grid[row][col];
    }

    /**
     * 获取网格单元（通过坐标对象）
     */
    public getCellByCoordinate(coord: GridCoordinate): GridCell | null {
        return this.getCell(coord.row, coord.col);
    }

    /**
     * 设置单元格占用状态
     */
    public setCellOccupied(row: number, col: number, occupant: Node | null): boolean {
        const cell = this.getCell(row, col);
        if (!cell) {
            Log.warn(this.MODULE_NAME, `无效的网格坐标: (${row}, ${col})`);
            return false;
        }

        if (occupant && cell.occupied) {
            Log.warn(this.MODULE_NAME, `网格单元已被占用: (${row}, ${col})`);
            return false;
        }

        if (occupant && !cell.buildable) {
            Log.warn(this.MODULE_NAME, `网格单元不可建造: (${row}, ${col})`);
            return false;
        }

        cell.occupied = occupant !== null;
        cell.occupant = occupant;

        // 触发事件
        EventManagerInstance.emit('grid-cell-occupied', {
            coordinate: { row, col },
            occupied: cell.occupied,
            occupant: occupant
        });

        Log.debug(this.MODULE_NAME, `设置网格占用状态: (${row}, ${col}) -> ${cell.occupied}`);
        return true;
    }

    /**
     * 清空单元格
     */
    public clearCell(row: number, col: number): boolean {
        return this.setCellOccupied(row, col, null);
    }

    /**
     * 检查单元格是否可以放置对象
     */
    public canPlaceAt(row: number, col: number): boolean {
        const cell = this.getCell(row, col);
        return cell && !cell.occupied && cell.buildable;
    }

    /**
     * 检查单元格是否可以通行
     */
    public canWalkAt(row: number, col: number): boolean {
        const cell = this.getCell(row, col);
        return cell && cell.walkable && !cell.occupied;
    }

    /**
     * 设置单元格类型
     */
    public setCellType(row: number, col: number, cellType: GridCellType): boolean {
        const cell = this.getCell(row, col);
        if (!cell) {
            return false;
        }

        cell.cellType = cellType;
        this.configureCellByType(cell);

        // 触发事件
        EventManagerInstance.emit('grid-cell-type-changed', {
            coordinate: { row, col },
            cellType: cellType
        });

        Log.debug(this.MODULE_NAME, `设置网格类型: (${row}, ${col}) -> ${cellType}`);
        return true;
    }

    // ========== 查找和搜索方法 ==========

    /**
     * 获取指定类型的所有单元格
     */
    public getCellsByType(cellType: GridCellType): GridCell[] {
        const cells: GridCell[] = [];
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this._grid[row][col];
                if (cell.cellType === cellType) {
                    cells.push(cell);
                }
            }
        }
        
        return cells;
    }

    /**
     * 获取空闲的可建造单元格
     */
    public getAvailableBuildCells(): GridCell[] {
        const cells: GridCell[] = [];
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this._grid[row][col];
                if (cell.buildable && !cell.occupied) {
                    cells.push(cell);
                }
            }
        }
        
        return cells;
    }

    /**
     * 获取相邻单元格
     */
    public getNeighborCells(row: number, col: number, includeDiagonal: boolean = false): GridCell[] {
        const neighbors: GridCell[] = [];
        
        const directions = includeDiagonal 
            ? [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]]  // 8方向
            : [[-1,0], [0,-1], [0,1], [1,0]];  // 4方向

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            const cell = this.getCell(newRow, newCol);
            if (cell) {
                neighbors.push(cell);
            }
        }
        
        return neighbors;
    }

    /**
     * 查找从起点到终点的路径
     */
    public findPath(start: GridCoordinate, end: GridCoordinate): GridCoordinate[] | null {
        // 简单的A*路径查找实现
        if (!this.isValidCoordinate(start.row, start.col) || 
            !this.isValidCoordinate(end.row, end.col)) {
            return null;
        }

        const openSet: GridCoordinate[] = [start];
        const cameFrom: Map<string, GridCoordinate> = new Map();
        const gScore: Map<string, number> = new Map();
        const fScore: Map<string, number> = new Map();

        const getKey = (coord: GridCoordinate) => `${coord.row},${coord.col}`;
        const heuristic = (a: GridCoordinate, b: GridCoordinate) => 
            Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

        gScore.set(getKey(start), 0);
        fScore.set(getKey(start), heuristic(start, end));

        while (openSet.length > 0) {
            // 找到fScore最小的节点
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if ((fScore.get(getKey(openSet[i])) || Infinity) < 
                    (fScore.get(getKey(current)) || Infinity)) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            if (current.row === end.row && current.col === end.col) {
                // 重建路径
                const path: GridCoordinate[] = [];
                let temp = current;
                while (temp) {
                    path.unshift(temp);
                    temp = cameFrom.get(getKey(temp));
                }
                return path;
            }

            openSet.splice(currentIndex, 1);
            const neighbors = this.getNeighborCells(current.row, current.col);

            for (const neighborCell of neighbors) {
                if (!neighborCell.walkable) continue;

                const neighbor = neighborCell.coordinate;
                const tentativeGScore = (gScore.get(getKey(current)) || Infinity) + 1;

                if (tentativeGScore < (gScore.get(getKey(neighbor)) || Infinity)) {
                    cameFrom.set(getKey(neighbor), current);
                    gScore.set(getKey(neighbor), tentativeGScore);
                    fScore.set(getKey(neighbor), tentativeGScore + heuristic(neighbor, end));

                    if (!openSet.some(coord => coord.row === neighbor.row && coord.col === neighbor.col)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return null; // 没有找到路径
    }

    // ========== 可视化方法 ==========

    /**
     * 创建网格可视化
     */
    private createGridVisuals() {11
        if (!this.showGrid) return;

        // 创建网格容器
        if (!this.gridContainer) {
            this.gridContainer = new Node('GridContainer');
            this.node.addChild(this.gridContainer);
        }

        // 创建网格绘制组件
        if (!this.gridGraphics) {
            const graphicsNode = new Node('GridGraphics');
            this.gridContainer.addChild(graphicsNode);
            this.gridGraphics = graphicsNode.addComponent(Graphics);
        }

        // 创建高亮指示器
        if (!this.highlightIndicator) {
            this.highlightIndicator = new Node('HighlightIndicator');
            this.gridContainer.addChild(this.highlightIndicator);
            const highlightGraphics = this.highlightIndicator.addComponent(Graphics);
            this.drawHighlightIndicator(highlightGraphics);
            this.highlightIndicator.active = false;
        }
    }

    /**
     * 更新网格显示
     */
    private updateGridDisplay() {
        if (!this.showGrid || !this.gridGraphics) return;

        this.drawGrid();
    }

    /**
     * 绘制网格
     */
    private drawGrid() {
        const graphics = this.gridGraphics;
        graphics.clear();
        graphics.strokeColor = this.gridColor;
        graphics.lineWidth = 1;

        // 绘制垂直线
        for (let col = 0; col <= this.cols; col++) {
            const x = this.startPosition.x + col * this.cellWidth;
            graphics.moveTo(x, this.startPosition.y);
            graphics.lineTo(x, this.startPosition.y - this.rows * this.cellHeight);
        }

        // 绘制水平线
        for (let row = 0; row <= this.rows; row++) {
            const y = this.startPosition.y - row * this.cellHeight;
            graphics.moveTo(this.startPosition.x, y);
            graphics.lineTo(this.startPosition.x + this.cols * this.cellWidth, y);
        }

        graphics.stroke();

        // 绘制单元格类型标识
        if (this.enableDebug) {
            this.drawCellTypes();
        }
    }

    /**
     * 绘制单元格类型
     */
    private drawCellTypes() {
        const graphics = this.gridGraphics;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this._grid[row][col];
                const color = this.getCellTypeColor(cell.cellType);
                
                graphics.fillColor = color;
                const x = this.startPosition.x + col * this.cellWidth;
                const y = this.startPosition.y - row * this.cellHeight;
                
                graphics.rect(x + 2, y - this.cellHeight + 2, this.cellWidth - 4, this.cellHeight - 4);
                graphics.fill();
            }
        }
    }

    /**
     * 获取单元格类型颜色
     */
    private getCellTypeColor(cellType: GridCellType): Color {
        switch (cellType) {
            case GridCellType.PLANT_ZONE: return new Color(0, 255, 0, 50);
            case GridCellType.PATH: return new Color(139, 69, 19, 50);
            case GridCellType.SPAWN: return new Color(255, 0, 0, 50);
            case GridCellType.GOAL: return new Color(0, 0, 255, 50);
            case GridCellType.OBSTACLE: return new Color(128, 128, 128, 100);
            case GridCellType.SPECIAL: return new Color(255, 0, 255, 50);
            default: return new Color(255, 255, 255, 20);
        }
    }

    /**
     * 绘制高亮指示器
     */
    private drawHighlightIndicator(graphics: Graphics) {
        graphics.clear();
        graphics.fillColor = this.highlightColor;
        graphics.rect(0, 0, this.cellWidth, this.cellHeight);
        graphics.fill();
    }

    /**
     * 高亮单元格
     */
    public highlightCell(row: number, col: number) {
        if (!this.isValidCoordinate(row, col) || !this.highlightIndicator) {
            return;
        }

        this._highlightedCell = { row, col };
        const worldPos = this.gridToWorldPosition(row, col);
        
        this.highlightIndicator.setWorldPosition(
            worldPos.x - this.cellWidth / 2,
            worldPos.y + this.cellHeight / 2,
            worldPos.z
        );
        this.highlightIndicator.active = true;

        // 触发事件
        EventManagerInstance.emit('grid-cell-highlighted', {
            coordinate: { row, col }
        });
    }

    /**
     * 清除高亮
     */
    public clearHighlight() {
        this._highlightedCell = null;
        if (this.highlightIndicator) {
            this.highlightIndicator.active = false;
        }

        EventManagerInstance.emit('grid-highlight-cleared', {});
    }

    // ========== 事件处理方法 ==========

    /**
     * 处理单元格点击
     */
    private onCellClicked(data: EventData) {
        const coord = data.coordinate as GridCoordinate;
        if (!coord) return;

        this._selectedCell = coord;
        
        // 触发选择事件
        EventManagerInstance.emit('grid-cell-selected', {
            coordinate: coord,
            cell: this.getCellByCoordinate(coord)
        });

        Log.debug(this.MODULE_NAME, `单元格被选择: (${coord.row}, ${coord.col})`);
    }

    /**
     * 处理单元格悬停
     */
    private onCellHovered(data: EventData) {
        const coord = data.coordinate as GridCoordinate;
        if (!coord) return;

        this.highlightCell(coord.row, coord.col);
    }

    // ========== 公共接口方法 ==========

    /**
     * 重新配置网格
     */
    public reconfigureGrid(config: Partial<GridConfig>) {
        if (config.rows !== undefined) this.rows = config.rows;
        if (config.cols !== undefined) this.cols = config.cols;
        if (config.cellWidth !== undefined) this.cellWidth = config.cellWidth;
        if (config.cellHeight !== undefined) this.cellHeight = config.cellHeight;
        if (config.startPosition !== undefined) this.startPosition = config.startPosition;
        if (config.showGrid !== undefined) this.showGrid = config.showGrid;
        if (config.gridColor !== undefined) this.gridColor = config.gridColor;
        if (config.highlightColor !== undefined) this.highlightColor = config.highlightColor;

        // 重新初始化
        this.initializeGrid();
        this.createGridVisuals();
        this.updateGridDisplay();

        Log.log(this.MODULE_NAME, '网格重新配置完成');
    }

    /**
     * 获取网格配置
     */
    public getGridConfig(): GridConfig {
        return {
            rows: this.rows,
            cols: this.cols,
            cellWidth: this.cellWidth,
            cellHeight: this.cellHeight,
            startPosition: this.startPosition.clone(),
            showGrid: this.showGrid,
            gridColor: this.gridColor.clone(),
            highlightColor: this.highlightColor.clone()
        };
    }

    /**
     * 获取网格统计信息
     */
    public getGridStats() {
        const stats = {
            totalCells: this.rows * this.cols,
            occupiedCells: 0,
            buildableCells: 0,
            walkableCells: 0,
            cellTypeCount: {} as { [key: string]: number }
        };

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this._grid[row][col];
                
                if (cell.occupied) stats.occupiedCells++;
                if (cell.buildable) stats.buildableCells++;
                if (cell.walkable) stats.walkableCells++;
                
                const typeKey = cell.cellType;
                stats.cellTypeCount[typeKey] = (stats.cellTypeCount[typeKey] || 0) + 1;
            }
        }

        return stats;
    }

    /**
     * 调试信息
     */
    public debugInfo() {
        Log.log(this.MODULE_NAME, '=== GridManager 调试信息 ===');
        
        const config = this.getGridConfig();
        const stats = this.getGridStats();
        
        Log.log(this.MODULE_NAME, `网格配置: ${config.rows}x${config.cols}, 单元格大小: ${config.cellWidth}x${config.cellHeight}`);
        Log.log(this.MODULE_NAME, `起始位置: (${config.startPosition.x}, ${config.startPosition.y})`);
        Log.log(this.MODULE_NAME, `网格统计:`, stats);
        
        if (this._highlightedCell) {
            Log.log(this.MODULE_NAME, `当前高亮: (${this._highlightedCell.row}, ${this._highlightedCell.col})`);
        }
        
        if (this._selectedCell) {
            Log.log(this.MODULE_NAME, `当前选择: (${this._selectedCell.row}, ${this._selectedCell.col})`);
        }
    }
}