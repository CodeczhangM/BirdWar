import { _decorator, Component, Node, Vec2, Vec3, instantiate, Prefab } from 'cc';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

// ========== 类型定义 ==========

export enum RoomType {
    COMBAT = 'combat',
    TREASURE = 'treasure',
    SHOP = 'shop',
    REST = 'rest',
    ELITE = 'elite',
    TRAP = 'trap',
    START = 'start',
    EXIT = 'exit'
}

export enum TileType {
    EMPTY = 0,
    FLOOR = 1,
    WALL = 2,
    DOOR = 3,
    CORRIDOR = 4
}

export interface Room {
    id: number;
    type: RoomType;
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    connections: number[];
    enemies: any[];
    treasures: any[];
    cleared: boolean;
}

export interface DungeonConfig {
    width: number;
    height: number;
    minRooms: number;
    maxRooms: number;
    minRoomSize: number;
    maxRoomSize: number;
    roomTypes: { type: RoomType; weight: number }[];
}

export interface Dungeon {
    tiles: TileType[][];
    rooms: Room[];
    startRoom: Room;
    exitRoom: Room;
    width: number;
    height: number;
}

// ========== 程序生成地牢 ==========

/**
 * 程序化地牢生成器
 * 使用 BSP (Binary Space Partitioning) 算法生成地牢
 */
@ccclass('ProceduralDungeonGenerator')
export class ProceduralDungeonGenerator extends Component {

    @property({ tooltip: '地牢宽度（格子数）' })
    public dungeonWidth: number = 50;

    @property({ tooltip: '地牢高度（格子数）' })
    public dungeonHeight: number = 50;

    @property({ tooltip: '最小房间数' })
    public minRooms: number = 8;

    @property({ tooltip: '最大房间数' })
    public maxRooms: number = 15;

    @property({ tooltip: '最小房间大小' })
    public minRoomSize: number = 4;

    @property({ tooltip: '最大房间大小' })
    public maxRoomSize: number = 10;

    @property({ tooltip: '随机种子（0为随机）' })
    public seed: number = 0;

    private readonly MODULE_NAME = 'ProceduralDungeonGenerator';
    private _random: () => number;

    // ========== 生命周期 ==========

    onLoad() {
        this._initRandom();
    }

    // ========== 初始化 ==========

    private _initRandom() {
        if (this.seed === 0) {
            this.seed = Date.now();
        }
        
        // 简单的伪随机数生成器
        let seed = this.seed;
        this._random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    // ========== 地牢生成 ==========

    /** 生成地牢 */
    public generateDungeon(config?: Partial<DungeonConfig>): Dungeon {
        const finalConfig: DungeonConfig = {
            width: config?.width || this.dungeonWidth,
            height: config?.height || this.dungeonHeight,
            minRooms: config?.minRooms || this.minRooms,
            maxRooms: config?.maxRooms || this.maxRooms,
            minRoomSize: config?.minRoomSize || this.minRoomSize,
            maxRoomSize: config?.maxRoomSize || this.maxRoomSize,
            roomTypes: config?.roomTypes || [
                { type: RoomType.COMBAT, weight: 50 },
                { type: RoomType.TREASURE, weight: 15 },
                { type: RoomType.SHOP, weight: 10 },
                { type: RoomType.REST, weight: 10 },
                { type: RoomType.ELITE, weight: 10 },
                { type: RoomType.TRAP, weight: 5 }
            ]
        };

        Log.log(this.MODULE_NAME, `开始生成地牢，种子: ${this.seed}`);

        // 初始化地图
        const tiles: TileType[][] = [];
        for (let y = 0; y < finalConfig.height; y++) {
            tiles[y] = [];
            for (let x = 0; x < finalConfig.width; x++) {
                tiles[y][x] = TileType.EMPTY;
            }
        }

        // 生成房间
        const rooms = this._generateRooms(finalConfig);
        
        // 在地图上绘制房间
        for (const room of rooms) {
            this._carveRoom(tiles, room);
        }

        // 连接房间
        this._connectRooms(tiles, rooms);

        // 分配房间类型
        this._assignRoomTypes(rooms, finalConfig.roomTypes);

        // 设置起点和终点
        const startRoom = rooms[0];
        startRoom.type = RoomType.START;
        
        const exitRoom = rooms[rooms.length - 1];
        exitRoom.type = RoomType.EXIT;

        const dungeon: Dungeon = {
            tiles,
            rooms,
            startRoom,
            exitRoom,
            width: finalConfig.width,
            height: finalConfig.height
        };

        Log.log(this.MODULE_NAME, `地牢生成完成，房间数: ${rooms.length}`);

        return dungeon;
    }

    /** 生成房间 */
    private _generateRooms(config: DungeonConfig): Room[] {
        const rooms: Room[] = [];
        const roomCount = Math.floor(
            config.minRooms + this._random() * (config.maxRooms - config.minRooms)
        );

        let attempts = 0;
        const maxAttempts = roomCount * 10;

        while (rooms.length < roomCount && attempts < maxAttempts) {
            attempts++;

            const width = Math.floor(
                config.minRoomSize + this._random() * (config.maxRoomSize - config.minRoomSize)
            );
            const height = Math.floor(
                config.minRoomSize + this._random() * (config.maxRoomSize - config.minRoomSize)
            );
            const x = Math.floor(this._random() * (config.width - width - 2)) + 1;
            const y = Math.floor(this._random() * (config.height - height - 2)) + 1;

            const newRoom: Room = {
                id: rooms.length,
                type: RoomType.COMBAT,
                x,
                y,
                width,
                height,
                centerX: x + Math.floor(width / 2),
                centerY: y + Math.floor(height / 2),
                connections: [],
                enemies: [],
                treasures: [],
                cleared: false
            };

            // 检查是否与现有房间重叠
            let overlaps = false;
            for (const room of rooms) {
                if (this._roomsOverlap(newRoom, room)) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                rooms.push(newRoom);
            }
        }

        return rooms;
    }

    /** 检查两个房间是否重叠 */
    private _roomsOverlap(room1: Room, room2: Room): boolean {
        return !(
            room1.x + room1.width + 1 < room2.x ||
            room1.x > room2.x + room2.width + 1 ||
            room1.y + room1.height + 1 < room2.y ||
            room1.y > room2.y + room2.height + 1
        );
    }

    /** 在地图上绘制房间 */
    private _carveRoom(tiles: TileType[][], room: Room) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
                    tiles[y][x] = TileType.FLOOR;
                }
            }
        }

        // 绘制墙壁
        for (let y = room.y - 1; y <= room.y + room.height; y++) {
            for (let x = room.x - 1; x <= room.x + room.width; x++) {
                if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
                    if (tiles[y][x] === TileType.EMPTY) {
                        tiles[y][x] = TileType.WALL;
                    }
                }
            }
        }
    }

    /** 连接房间 */
    private _connectRooms(tiles: TileType[][], rooms: Room[]) {
        for (let i = 0; i < rooms.length - 1; i++) {
            const room1 = rooms[i];
            const room2 = rooms[i + 1];

            // 创建走廊
            this._createCorridor(tiles, room1, room2);
            
            // 记录连接
            room1.connections.push(room2.id);
            room2.connections.push(room1.id);
        }

        // 添加一些额外的连接以增加复杂度
        const extraConnections = Math.floor(rooms.length * 0.3);
        for (let i = 0; i < extraConnections; i++) {
            const room1 = rooms[Math.floor(this._random() * rooms.length)];
            const room2 = rooms[Math.floor(this._random() * rooms.length)];
            
            if (room1.id !== room2.id && room1.connections.indexOf(room2.id) < 0) {
                this._createCorridor(tiles, room1, room2);
                room1.connections.push(room2.id);
                room2.connections.push(room1.id);
            }
        }
    }

    /** 创建走廊 */
    private _createCorridor(tiles: TileType[][], room1: Room, room2: Room) {
        let x = room1.centerX;
        let y = room1.centerY;

        // 先水平移动
        while (x !== room2.centerX) {
            if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
                if (tiles[y][x] === TileType.EMPTY || tiles[y][x] === TileType.WALL) {
                    tiles[y][x] = TileType.CORRIDOR;
                }
            }
            x += x < room2.centerX ? 1 : -1;
        }

        // 再垂直移动
        while (y !== room2.centerY) {
            if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
                if (tiles[y][x] === TileType.EMPTY || tiles[y][x] === TileType.WALL) {
                    tiles[y][x] = TileType.CORRIDOR;
                }
            }
            y += y < room2.centerY ? 1 : -1;
        }
    }

    /** 分配房间类型 */
    private _assignRoomTypes(rooms: Room[], roomTypes: { type: RoomType; weight: number }[]) {
        const totalWeight = roomTypes.reduce((sum, rt) => sum + rt.weight, 0);

        // 跳过第一个和最后一个房间（起点和终点）
        for (let i = 1; i < rooms.length - 1; i++) {
            let random = this._random() * totalWeight;
            
            for (const roomType of roomTypes) {
                random -= roomType.weight;
                if (random <= 0) {
                    rooms[i].type = roomType.type;
                    break;
                }
            }
        }
    }

    // ========== 工具方法 ==========

    /** 获取指定位置的房间 */
    public getRoomAt(dungeon: Dungeon, x: number, y: number): Room | null {
        for (const room of dungeon.rooms) {
            if (x >= room.x && x < room.x + room.width &&
                y >= room.y && y < room.y + room.height) {
                return room;
            }
        }
        return null;
    }

    /** 获取房间的相邻房间 */
    public getConnectedRooms(dungeon: Dungeon, room: Room): Room[] {
        return room.connections.map(id => dungeon.rooms[id]).filter(r => r !== undefined);
    }

    /** 重新生成地牢（使用新种子） */
    public regenerate(): Dungeon {
        this.seed = Date.now();
        this._initRandom();
        return this.generateDungeon();
    }

    /**
     * 获取地牢的实际像素尺寸
     * @param tileSize 每个格子的像素大小
     * @returns 地牢的宽度和高度（像素）
     */
    public getDungeonPixelSize(tileSize: number): { width: number, height: number } {
        return {
            width: this.dungeonWidth * tileSize,
            height: this.dungeonHeight * tileSize
        };
    }

    /**
     * 获取地牢的格子尺寸
     * @returns 地牢的宽度和高度（格子数）
     */
    public getDungeonGridSize(): { width: number, height: number } {
        return {
            width: this.dungeonWidth,
            height: this.dungeonHeight
        };
    }
}
