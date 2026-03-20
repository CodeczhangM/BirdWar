import { Log } from './Logger';
import { ProceduralDungeonGenerator, Dungeon,TileType } from './ProceduralDungeonGenerator';
import { _decorator, Component, Node, Prefab, instantiate, Vec3, Sprite, Color, UITransform, Label, BoxCollider2D, RigidBody2D, ERigidBody2DType } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DungeonController')
export class DungeonController extends Component {
    @property(ProceduralDungeonGenerator)
    dungeonGenerator: ProceduralDungeonGenerator = null;

    @property(Node)
    dungeonContainer: Node = null;

    @property(Prefab)
    floorTilePrefab: Prefab = null;
    
    @property(Prefab)
    wallTilePrefab: Prefab = null;
    
    @property(Prefab)
    corridorTilePrefab: Prefab = null;

    @property(Prefab)
    doorTilePrefab: Prefab = null;

    @property(Prefab)
    emptyTilePrefab: Prefab = null;

    @property
    tileSize: number = 32;

    @property({ tooltip: '使用调试颜色渲染（不需要 Prefab）' })
    useDebugColors: boolean = false;

    @property({ tooltip: '显示调试网格' })
    showDebugGrid: boolean = false;

    @property({ tooltip: '显示房间标记' })
    showRoomMarkers: boolean = false;

    @property({ tooltip: '为 EMPTY/WALL 添加物理碰撞体' })
    addPhysicsWalls: boolean = true;
    
    protected onLoad(): void {
        if (!this.dungeonGenerator) {
           Log.error('DungeonController', 'DungeonGenerator is not assigned!');
            return;
        }
    }


    start() {
        // 生成地牢
        const dungeon = this.dungeonGenerator.generateDungeon();
        
        // 使用生成的地牢数据
        Log.log('DungeonController', `生成了 ${dungeon.rooms.length} 个房间`);
        Log.log('DungeonController', `起点房间:`, dungeon.startRoom);
        Log.log('DungeonController', `终点房间:`, dungeon.exitRoom);

        if (this.useDebugColors) {
            this.renderDungeonWithColors(dungeon);
            if (this.showDebugGrid) {
                this.renderDebugGrid(dungeon);
            }
            if (this.showRoomMarkers) {
                this.renderRoomMarkers(dungeon);
            }
        } else {
            this.renderDungeon(dungeon);
        }
    }


    renderDungeon(dungeon: Dungeon) {
        // 清空容器
        this.dungeonContainer.removeAllChildren();
        
        // 渲染每个格子
        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                const tile = dungeon.tiles[y][x];
                let prefab: Prefab = null;
                
                switch (tile) {
                    case TileType.EMPTY:
                        prefab = this.emptyTilePrefab;
                        break;
                    case TileType.FLOOR:
                        prefab = this.floorTilePrefab;
                        break;
                    case TileType.WALL:
                        prefab = this.wallTilePrefab;
                        break;
                    case TileType.DOOR:
                        prefab = this.doorTilePrefab;
                        break;
                    case TileType.CORRIDOR:
                        prefab = this.corridorTilePrefab;
                        break;
                }
                
                if (prefab) {
                    const tileNode = instantiate(prefab);
                    tileNode.setParent(this.dungeonContainer);
                    tileNode.setPosition(
                        x * this.tileSize,
                        y * this.tileSize,
                        0
                    );

                    // 为 EMPTY 和 WALL 添加物理碰撞体
                    if (this.addPhysicsWalls && (tile === TileType.EMPTY || tile === TileType.WALL)) {
                        this._addWallCollider(tileNode);
                    }
                }
            }
        }
    }

    /**
     * 为墙壁/空白 tile 添加碰撞体
     */
    private _addWallCollider(tileNode: Node) {
        // 添加静态刚体
        const rigidBody = tileNode.addComponent(RigidBody2D);
        rigidBody.type = ERigidBody2DType.Static;

        // 添加碰撞体
        const collider = tileNode.addComponent(BoxCollider2D);
        collider.size.set(this.tileSize, this.tileSize);
        collider.sensor = false; // 实体碰撞
    }

    /**
     * 根据 TileType 获取对应的 Prefab
     */
    private getPrefabForTile(tile: TileType): Prefab | null {
        switch (tile) {
            case TileType.EMPTY:
                return this.emptyTilePrefab;
            case TileType.FLOOR:
                return this.floorTilePrefab;
            case TileType.WALL:
                return this.wallTilePrefab;
            case TileType.DOOR:
                return this.doorTilePrefab;
            case TileType.CORRIDOR:
                return this.corridorTilePrefab;
            default:
                Log.warn('DungeonController', `未知的 TileType: ${tile}`);
                return null;
        }
    }

    /**
     * 获取 TileType 的显示名称
     */
    public static getTileTypeName(tile: TileType): string {
        switch (tile) {
            case TileType.EMPTY: return 'EMPTY';
            case TileType.FLOOR: return 'FLOOR';
            case TileType.WALL: return 'WALL';
            case TileType.DOOR: return 'DOOR';
            case TileType.CORRIDOR: return 'CORRIDOR';
            default: return 'UNKNOWN';
        }
    }

    /**
     * 获取 TileType 对应的颜色（用于调试/可视化）
     */
    public static getTileColor(tile: TileType): { r: number, g: number, b: number, a: number } {
        switch (tile) {
            case TileType.EMPTY: return { r: 0.1, g: 0.1, b: 0.1, a: 1 };
            case TileType.FLOOR: return { r: 0.8, g: 0.8, b: 0.8, a: 1 };
            case TileType.WALL: return { r: 0.3, g: 0.3, b: 0.3, a: 1 };
            case TileType.DOOR: return { r: 0.9, g: 0.6, b: 0.2, a: 1 };
            case TileType.CORRIDOR: return { r: 0.6, g: 0.6, b: 0.6, a: 1 };
            default: return { r: 1, g: 0, b: 1, a: 1 };
        }
    }
    /**
     * 使用颜色绘制调试地牢（不需要 Prefab）
     */
    renderDungeonWithColors(dungeon: Dungeon) {
        this.dungeonContainer.removeAllChildren();

        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                const tile = dungeon.tiles[y][x];
                const color = DungeonController.getTileColor(tile);

                const tileNode = new Node(`tile_${x}_${y}`);
                tileNode.setParent(this.dungeonContainer);
                tileNode.setPosition(x * this.tileSize, y * this.tileSize, 0);

                const transform = tileNode.addComponent(UITransform);
                transform.setContentSize(this.tileSize, this.tileSize);

                const sprite = tileNode.addComponent(Sprite);
                sprite.color = new Color(color.r * 255, color.g * 255, color.b * 255, color.a * 255);
                sprite.type = Sprite.Type.FILLED;

                // 为 EMPTY 和 WALL 添加物理碰撞体
                if (this.addPhysicsWalls && (tile === TileType.EMPTY || tile === TileType.WALL)) {
                    this._addWallCollider(tileNode);
                }
            }
        }
    }

    /**
     * 绘制调试网格（叠加层）
     */
    renderDebugGrid(dungeon: Dungeon) {
        const gridNode = new Node('debug_grid');
        gridNode.setParent(this.dungeonContainer);

        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                const tile = dungeon.tiles[y][x];
                const tileName = DungeonController.getTileTypeName(tile);

                const labelNode = new Node(`grid_${x}_${y}`);
                labelNode.setParent(gridNode);
                labelNode.setPosition(x * this.tileSize, y * this.tileSize, 0);

                const transform = labelNode.addComponent(UITransform);
                transform.setContentSize(this.tileSize, this.tileSize);

                const label = labelNode.addComponent(Label);
                label.string = tileName[0];
                label.fontSize = 10;
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                label.verticalAlign = Label.VerticalAlign.CENTER;
                label.color = new Color(255, 255, 255, 200);
            }
        }
    }

    /**
     * 绘制房间标记
     */
    renderRoomMarkers(dungeon: Dungeon) {
        const markersNode = new Node('room_markers');
        markersNode.setParent(this.dungeonContainer);

        for (const room of dungeon.rooms) {
            const markerNode = new Node(`room_${room.id}`);
            markerNode.setParent(markersNode);
            markerNode.setPosition(room.centerX * this.tileSize, room.centerY * this.tileSize, 0);

            const transform = markerNode.addComponent(UITransform);
            transform.setContentSize(this.tileSize * 2, this.tileSize * 2);

            const sprite = markerNode.addComponent(Sprite);
            sprite.color = this.getRoomColor(room.type);
            sprite.type = Sprite.Type.FILLED;

            const labelNode = new Node('label');
            labelNode.setParent(markerNode);
            labelNode.setPosition(0, 0, 0);

            const labelTransform = labelNode.addComponent(UITransform);
            labelTransform.setContentSize(60, 20);

            const label = labelNode.addComponent(Label);
            label.string = `${room.id}:${room.type}`;
            label.fontSize = 10;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.color = new Color(255, 255, 255, 255);
        }
    }

    /**
     * 根据房间类型获取颜色
     */
    private getRoomColor(roomType: string): Color {
        const colorMap: Record<string, Color> = {
            'start': new Color(0, 255, 0, 200),
            'exit': new Color(255, 0, 0, 200),
            'combat': new Color(255, 100, 100, 200),
            'treasure': new Color(255, 255, 0, 200),
            'shop': new Color(0, 150, 255, 200),
            'rest': new Color(100, 200, 100, 200),
            'elite': new Color(200, 0, 255, 200),
            'trap': new Color(255, 100, 0, 200)
        };
        return colorMap[roomType] || new Color(128, 128, 128, 200);
    }
}


