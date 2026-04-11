import { _decorator, Component } from 'cc';
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
    /** 通往该房间的门是否锁定（需要前置房间清怪后解锁） */
    doorsLocked: boolean;
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

// ========== BSP 节点 ==========

interface BSPNode {
    x: number;
    y: number;
    width: number;
    height: number;
    left?: BSPNode;
    right?: BSPNode;
    room?: Room;
}

// ========== 程序生成地牢 ==========

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

    onLoad() {
        this._initRandom();
    }

    private _initRandom() {
        if (this.seed === 0) this.seed = Date.now();
        let seed = this.seed;
        this._random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    // ========== 地牢生成 ==========

    public generateDungeon(config?: Partial<DungeonConfig>): Dungeon {
        const cfg: DungeonConfig = {
            width: config?.width || this.dungeonWidth,
            height: config?.height || this.dungeonHeight,
            minRooms: config?.minRooms || this.minRooms,
            maxRooms: config?.maxRooms || this.maxRooms,
            minRoomSize: config?.minRoomSize || this.minRoomSize,
            maxRoomSize: config?.maxRoomSize || this.maxRoomSize,
            roomTypes: config?.roomTypes || [
                { type: RoomType.COMBAT,   weight: 50 },
                { type: RoomType.TREASURE, weight: 15 },
                { type: RoomType.SHOP,     weight: 10 },
                { type: RoomType.REST,     weight: 10 },
                { type: RoomType.ELITE,    weight: 10 },
                { type: RoomType.TRAP,     weight: 5  }
            ]
        };

        Log.log(this.MODULE_NAME, `开始生成地牢，种子: ${this.seed}`);

        const tiles: TileType[][] = Array.from({ length: cfg.height }, () =>
            new Array(cfg.width).fill(TileType.EMPTY)
        );

        // BSP 分割 → 收集叶节点房间
        const root: BSPNode = { x: 1, y: 1, width: cfg.width - 2, height: cfg.height - 2 };
        const targetRooms = cfg.minRooms + Math.floor(this._random() * (cfg.maxRooms - cfg.minRooms + 1));
        this._bspSplit(root, cfg, 0, targetRooms, { value: 1 });

        const rooms: Room[] = [];
        this._collectRooms(root, rooms, cfg);

        // 绘制房间
        for (const room of rooms) this._carveRoom(tiles, room);

        // MST 连接（无死路保证）
        this._connectByMST(tiles, rooms);

        // 额外环路（约 30% 额外边，避免线性死路）
        this._addExtraConnections(tiles, rooms, 0.3);

        // 分配类型，保证至少一个 REST
        this._assignRoomTypes(rooms, cfg.roomTypes);

        // 起点 / 终点
        rooms[0].type = RoomType.START;
        rooms[0].cleared = true;
        rooms[0].doorsLocked = false;
        rooms[rooms.length - 1].type = RoomType.EXIT;

        // 初始化门锁：非起点房间的门默认锁定，等前置房间清怪后解锁
        for (let i = 1; i < rooms.length; i++) {
            rooms[i].doorsLocked = true;
        }

        const dungeon: Dungeon = { tiles, rooms, startRoom: rooms[0], exitRoom: rooms[rooms.length - 1], width: cfg.width, height: cfg.height };
        Log.log(this.MODULE_NAME, `地牢生成完成，房间数: ${rooms.length}`);
        return dungeon;
    }

    // ========== BSP ==========

    /**
     * BSP 分割：用全局计数器控制叶节点数量，确保生成 [minRooms, maxRooms] 个房间
     * counter.value 记录当前叶节点总数，达到 targetLeaves 后停止分割
     */
    private _bspSplit(node: BSPNode, cfg: DungeonConfig, depth: number, targetLeaves: number, counter: { value: number }) {
        // 每个未分割节点算 1 个叶节点，分割后变 2 个（净增 1）
        const minSplit = cfg.minRoomSize * 2 + 3;
        const canSplitH = node.width >= minSplit;
        const canSplitV = node.height >= minSplit;

        if (depth > 8 || (!canSplitH && !canSplitV) || counter.value >= targetLeaves) return;

        const splitHorizontal = canSplitH && canSplitV
            ? (node.width > node.height ? true : node.height > node.width ? false : this._random() < 0.5)
            : canSplitH;

        if (splitHorizontal) {
            const lo = cfg.minRoomSize + 1;
            const hi = node.width - cfg.minRoomSize - 1;
            if (hi <= lo) return;
            const splitX = lo + Math.floor(this._random() * (hi - lo));
            node.left  = { x: node.x,           y: node.y, width: splitX,                    height: node.height };
            node.right = { x: node.x + splitX + 1, y: node.y, width: node.width - splitX - 1, height: node.height };
        } else {
            const lo = cfg.minRoomSize + 1;
            const hi = node.height - cfg.minRoomSize - 1;
            if (hi <= lo) return;
            const splitY = lo + Math.floor(this._random() * (hi - lo));
            node.left  = { x: node.x, y: node.y,           width: node.width, height: splitY };
            node.right = { x: node.x, y: node.y + splitY + 1, width: node.width, height: node.height - splitY - 1 };
        }

        counter.value++; // 分割成功，叶节点净增 1
        this._bspSplit(node.left!,  cfg, depth + 1, targetLeaves, counter);
        this._bspSplit(node.right!, cfg, depth + 1, targetLeaves, counter);
    }

    private _collectRooms(node: BSPNode, rooms: Room[], cfg: DungeonConfig) {
        if (!node.left && !node.right) {
            // 叶节点分区内可用空间（留 1 格边距）
            const availW = node.width - 2;
            const availH = node.height - 2;
            if (availW < cfg.minRoomSize || availH < cfg.minRoomSize) return;

            const maxW = Math.min(cfg.maxRoomSize, availW);
            const maxH = Math.min(cfg.maxRoomSize, availH);
            const w = cfg.minRoomSize + Math.floor(this._random() * (maxW - cfg.minRoomSize + 1));
            const h = cfg.minRoomSize + Math.floor(this._random() * (maxH - cfg.minRoomSize + 1));

            // 在分区内随机偏移，确保偏移量 >= 0
            const offsetX = Math.max(0, Math.floor(this._random() * (availW - w + 1)));
            const offsetY = Math.max(0, Math.floor(this._random() * (availH - h + 1)));
            const x = node.x + 1 + offsetX;
            const y = node.y + 1 + offsetY;

            const room: Room = {
                id: rooms.length,
                type: RoomType.COMBAT,
                x, y, width: w, height: h,
                centerX: x + Math.floor(w / 2),
                centerY: y + Math.floor(h / 2),
                connections: [],
                enemies: [],
                treasures: [],
                cleared: false,
                doorsLocked: true
            };
            node.room = room;
            rooms.push(room);
            return;
        }
        if (node.left)  this._collectRooms(node.left,  rooms, cfg);
        if (node.right) this._collectRooms(node.right, rooms, cfg);
    }

    // ========== 连接（MST Prim） ==========

    private _connectByMST(tiles: TileType[][], rooms: Room[]) {
        if (rooms.length < 2) return;
        const inMST = new Set<number>([0]);
        while (inMST.size < rooms.length) {
            let bestDist = Infinity, bestA = -1, bestB = -1;
            for (const a of inMST) {
                for (let b = 0; b < rooms.length; b++) {
                    if (inMST.has(b)) continue;
                    const d = this._dist(rooms[a], rooms[b]);
                    if (d < bestDist) { bestDist = d; bestA = a; bestB = b; }
                }
            }
            this._linkRooms(tiles, rooms[bestA], rooms[bestB]);
            inMST.add(bestB);
        }
    }

    private _addExtraConnections(tiles: TileType[][], rooms: Room[], ratio: number) {
        const extra = Math.floor(rooms.length * ratio);
        for (let i = 0; i < extra; i++) {
            const a = rooms[Math.floor(this._random() * rooms.length)];
            const b = rooms[Math.floor(this._random() * rooms.length)];
            if (a.id !== b.id && !a.connections.includes(b.id)) {
                this._linkRooms(tiles, a, b);
            }
        }
    }

    private _linkRooms(tiles: TileType[][], a: Room, b: Room) {
        this._createCorridor(tiles, a, b);
        a.connections.push(b.id);
        b.connections.push(a.id);
    }

    private _dist(a: Room, b: Room): number {
        return Math.abs(a.centerX - b.centerX) + Math.abs(a.centerY - b.centerY);
    }

    // ========== 绘制 ==========

    private _carveRoom(tiles: TileType[][], room: Room) {
        for (let y = room.y; y < room.y + room.height; y++)
            for (let x = room.x; x < room.x + room.width; x++)
                if (this._inBounds(tiles, x, y)) tiles[y][x] = TileType.FLOOR;

        for (let y = room.y - 1; y <= room.y + room.height; y++)
            for (let x = room.x - 1; x <= room.x + room.width; x++)
                if (this._inBounds(tiles, x, y) && tiles[y][x] === TileType.EMPTY)
                    tiles[y][x] = TileType.WALL;
    }

    private _createCorridor(tiles: TileType[][], a: Room, b: Room) {
        let x = a.centerX, y = a.centerY;
        const setTile = (tx: number, ty: number) => {
            if (!this._inBounds(tiles, tx, ty)) return;
            if (tiles[ty][tx] === TileType.EMPTY || tiles[ty][tx] === TileType.WALL)
                tiles[ty][tx] = TileType.CORRIDOR;
        };
        // 在走廊与房间交界处放置门
        const markDoor = (tx: number, ty: number) => {
            if (this._inBounds(tiles, tx, ty) && tiles[ty][tx] === TileType.FLOOR)
                tiles[ty][tx] = TileType.DOOR;
        };

        while (x !== b.centerX) { setTile(x, y); x += x < b.centerX ? 1 : -1; }
        while (y !== b.centerY) { setTile(x, y); y += y < b.centerY ? 1 : -1; }

        // 在走廊两端入口标记门
        markDoor(a.centerX, a.centerY);
        markDoor(b.centerX, b.centerY);
    }

    private _inBounds(tiles: TileType[][], x: number, y: number): boolean {
        return y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length;
    }

    // ========== 类型分配 ==========

    private _assignRoomTypes(rooms: Room[], roomTypes: { type: RoomType; weight: number }[]) {
        const totalWeight = roomTypes.reduce((s, rt) => s + rt.weight, 0);
        let hasRest = false;

        // 跳过 index 0（START）和最后一个（EXIT）
        for (let i = 1; i < rooms.length - 1; i++) {
            let r = this._random() * totalWeight;
            for (const rt of roomTypes) {
                r -= rt.weight;
                if (r <= 0) { rooms[i].type = rt.type; break; }
            }
            if (rooms[i].type === RoomType.REST) hasRest = true;
        }

        // 保证至少一个 REST 房间
        if (!hasRest && rooms.length > 2) {
            const idx = 1 + Math.floor(this._random() * (rooms.length - 2));
            rooms[idx].type = RoomType.REST;
        }
    }

    // ========== 门控逻辑 ==========

    /**
     * 玩家清除房间怪物后调用，解锁所有相邻房间的门
     * @returns 被解锁的房间列表
     */
    public onRoomCleared(dungeon: Dungeon, room: Room): Room[] {
        room.cleared = true;
        const unlocked: Room[] = [];
        for (const connId of room.connections) {
            const neighbor = dungeon.rooms[connId];
            if (neighbor && neighbor.doorsLocked) {
                neighbor.doorsLocked = false;
                unlocked.push(neighbor);
            }
        }
        return unlocked;
    }

    /** 判断玩家是否可以进入某个房间（门未锁） */
    public canEnterRoom(room: Room): boolean {
        return !room.doorsLocked;
    }

    // ========== 工具方法 ==========

    public getRoomAt(dungeon: Dungeon, x: number, y: number): Room | null {
        for (const room of dungeon.rooms) {
            if (x >= room.x && x < room.x + room.width &&
                y >= room.y && y < room.y + room.height) return room;
        }
        return null;
    }

    public getConnectedRooms(dungeon: Dungeon, room: Room): Room[] {
        return room.connections.map(id => dungeon.rooms[id]).filter(Boolean);
    }

    public regenerate(): Dungeon {
        this.seed = Date.now();
        this._initRandom();
        return this.generateDungeon();
    }

    public getDungeonPixelSize(tileSize: number) {
        return { width: this.dungeonWidth * tileSize, height: this.dungeonHeight * tileSize };
    }

    public getDungeonGridSize() {
        return { width: this.dungeonWidth, height: this.dungeonHeight };
    }
}
