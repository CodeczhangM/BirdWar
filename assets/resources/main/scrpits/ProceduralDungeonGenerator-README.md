# ProceduralDungeonGenerator 使用指南

## 概述

[`ProceduralDungeonGenerator`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:68) 是一个程序化地牢生成器，使用 BSP (Binary Space Partitioning) 算法生成随机地牢。它可以创建包含多个房间、走廊和不同房间类型的地牢地图。

## 核心功能

- 🎲 **随机地牢生成**：基于种子的可重现随机生成
- 🏠 **多种房间类型**：战斗、宝藏、商店、休息、精英、陷阱、起点、终点
- 🔗 **智能房间连接**：自动生成走廊连接房间
- ⚙️ **高度可配置**：支持自定义地牢大小、房间数量、房间大小等

## 快速开始

### 1. 基本使用

```typescript
import { _decorator, Component } from 'cc';
import { ProceduralDungeonGenerator, Dungeon } from './ProceduralDungeonGenerator';

const { ccclass, property } = _decorator;

@ccclass('DungeonController')
export class DungeonController extends Component {
    
    @property(ProceduralDungeonGenerator)
    dungeonGenerator: ProceduralDungeonGenerator = null;
    
    start() {
        // 生成地牢
        const dungeon = this.dungeonGenerator.generateDungeon();
        
        // 使用生成的地牢数据
        console.log(`生成了 ${dungeon.rooms.length} 个房间`);
        console.log(`起点房间:`, dungeon.startRoom);
        console.log(`终点房间:`, dungeon.exitRoom);
    }
}
```

### 2. 在编辑器中配置

将 [`ProceduralDungeonGenerator`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:68) 组件添加到节点后，可以在属性检查器中配置：

- **dungeonWidth**: 地牢宽度（格子数），默认 50
- **dungeonHeight**: 地牢高度（格子数），默认 50
- **minRooms**: 最小房间数，默认 8
- **maxRooms**: 最大房间数，默认 15
- **minRoomSize**: 最小房间大小，默认 4
- **maxRoomSize**: 最大房间大小，默认 10
- **seed**: 随机种子（0为随机），默认 0

## 高级用法

### 1. 自定义配置生成

```typescript
// 使用自定义配置生成地牢
const dungeon = this.dungeonGenerator.generateDungeon({
    width: 80,
    height: 80,
    minRooms: 15,
    maxRooms: 25,
    minRoomSize: 6,
    maxRoomSize: 12,
    roomTypes: [
        { type: RoomType.COMBAT, weight: 60 },
        { type: RoomType.TREASURE, weight: 20 },
        { type: RoomType.SHOP, weight: 10 },
        { type: RoomType.REST, weight: 10 }
    ]
});
```

### 2. 遍历地牢数据

```typescript
// 遍历所有房间
for (const room of dungeon.rooms) {
    console.log(`房间 ${room.id}:`);
    console.log(`  类型: ${room.type}`);
    console.log(`  位置: (${room.x}, ${room.y})`);
    console.log(`  大小: ${room.width}x${room.height}`);
    console.log(`  中心: (${room.centerX}, ${room.centerY})`);
    console.log(`  连接: ${room.connections.join(', ')}`);
}

// 遍历地图格子
for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
        const tile = dungeon.tiles[y][x];
        // TileType.EMPTY = 0
        // TileType.FLOOR = 1
        // TileType.WALL = 2
        // TileType.DOOR = 3
        // TileType.CORRIDOR = 4
    }
}
```

### 3. 查询房间信息

```typescript
// 获取指定位置的房间
const room = this.dungeonGenerator.getRoomAt(dungeon, 10, 15);
if (room) {
    console.log(`找到房间: ${room.type}`);
}

// 获取房间的相邻房间
const connectedRooms = this.dungeonGenerator.getConnectedRooms(dungeon, room);
console.log(`相邻房间数: ${connectedRooms.length}`);
```

### 4. 重新生成地牢

```typescript
// 使用新的随机种子重新生成
const newDungeon = this.dungeonGenerator.regenerate();
```

## 数据结构

### RoomType（房间类型）

```typescript
enum RoomType {
    COMBAT = 'combat',      // 战斗房间
    TREASURE = 'treasure',  // 宝藏房间
    SHOP = 'shop',          // 商店房间
    REST = 'rest',          // 休息房间
    ELITE = 'elite',        // 精英房间
    TRAP = 'trap',          // 陷阱房间
    START = 'start',        // 起点房间
    EXIT = 'exit'           // 终点房间
}
```

### TileType（格子类型）

```typescript
enum TileType {
    EMPTY = 0,      // 空白
    FLOOR = 1,      // 地板
    WALL = 2,       // 墙壁
    DOOR = 3,       // 门
    CORRIDOR = 4    // 走廊
}
```

### Room（房间数据）

```typescript
interface Room {
    id: number;              // 房间ID
    type: RoomType;          // 房间类型
    x: number;               // 左上角X坐标
    y: number;               // 左上角Y坐标
    width: number;           // 宽度
    height: number;          // 高度
    centerX: number;         // 中心X坐标
    centerY: number;         // 中心Y坐标
    connections: number[];   // 连接的房间ID列表
    enemies: any[];          // 敌人列表
    treasures: any[];        // 宝藏列表
    cleared: boolean;        // 是否已清理
}
```

### Dungeon（地牢数据）

```typescript
interface Dungeon {
    tiles: TileType[][];     // 地图格子数据（二维数组）
    rooms: Room[];           // 房间列表
    startRoom: Room;         // 起点房间
    exitRoom: Room;          // 终点房间
    width: number;           // 地牢宽度
    height: number;          // 地牢高度
}
```

## 实际应用示例

### 示例1：渲染地牢地图

```typescript
import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { ProceduralDungeonGenerator, Dungeon, TileType } from './ProceduralDungeonGenerator';

const { ccclass, property } = _decorator;

@ccclass('DungeonRenderer')
export class DungeonRenderer extends Component {
    
    @property(ProceduralDungeonGenerator)
    dungeonGenerator: ProceduralDungeonGenerator = null;
    
    @property(Prefab)
    floorTilePrefab: Prefab = null;
    
    @property(Prefab)
    wallTilePrefab: Prefab = null;
    
    @property(Prefab)
    corridorTilePrefab: Prefab = null;
    
    @property(Node)
    dungeonContainer: Node = null;
    
    @property
    tileSize: number = 32;
    
    start() {
        const dungeon = this.dungeonGenerator.generateDungeon();
        this.renderDungeon(dungeon);
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
                    case TileType.FLOOR:
                        prefab = this.floorTilePrefab;
                        break;
                    case TileType.WALL:
                        prefab = this.wallTilePrefab;
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
                }
            }
        }
    }
}
```

### 示例2：房间事件处理

```typescript
import { _decorator, Component } from 'cc';
import { ProceduralDungeonGenerator, Dungeon, Room, RoomType } from './ProceduralDungeonGenerator';

const { ccclass, property } = _decorator;

@ccclass('DungeonGameplay')
export class DungeonGameplay extends Component {
    
    @property(ProceduralDungeonGenerator)
    dungeonGenerator: ProceduralDungeonGenerator = null;
    
    private dungeon: Dungeon = null;
    private currentRoom: Room = null;
    
    start() {
        this.dungeon = this.dungeonGenerator.generateDungeon();
        this.currentRoom = this.dungeon.startRoom;
        this.enterRoom(this.currentRoom);
    }
    
    enterRoom(room: Room) {
        console.log(`进入房间: ${room.type}`);
        
        switch (room.type) {
            case RoomType.COMBAT:
                this.startCombat(room);
                break;
            case RoomType.TREASURE:
                this.openTreasure(room);
                break;
            case RoomType.SHOP:
                this.openShop(room);
                break;
            case RoomType.REST:
                this.restPlayer(room);
                break;
            case RoomType.ELITE:
                this.startEliteCombat(room);
                break;
            case RoomType.TRAP:
                this.triggerTrap(room);
                break;
            case RoomType.EXIT:
                this.completeLevel();
                break;
        }
    }
    
    moveToConnectedRoom(roomId: number) {
        const nextRoom = this.dungeon.rooms[roomId];
        if (nextRoom && this.currentRoom.connections.includes(roomId)) {
            this.currentRoom = nextRoom;
            this.enterRoom(nextRoom);
        }
    }
    
    private startCombat(room: Room) {
        console.log('开始战斗!');
        // 生成敌人逻辑
    }
    
    private openTreasure(room: Room) {
        console.log('发现宝藏!');
        // 宝藏逻辑
    }
    
    private openShop(room: Room) {
        console.log('进入商店');
        // 商店逻辑
    }
    
    private restPlayer(room: Room) {
        console.log('休息恢复');
        // 恢复逻辑
    }
    
    private startEliteCombat(room: Room) {
        console.log('精英战斗!');
        // 精英战斗逻辑
    }
    
    private triggerTrap(room: Room) {
        console.log('触发陷阱!');
        // 陷阱逻辑
    }
    
    private completeLevel() {
        console.log('关卡完成!');
        // 完成逻辑
    }
}
```

### 示例3：小地图显示

```typescript
import { _decorator, Component, Graphics, Color } from 'cc';
import { ProceduralDungeonGenerator, Dungeon, Room, TileType } from './ProceduralDungeonGenerator';

const { ccclass, property } = _decorator;

@ccclass('MinimapRenderer')
export class MinimapRenderer extends Component {
    
    @property(ProceduralDungeonGenerator)
    dungeonGenerator: ProceduralDungeonGenerator = null;
    
    @property(Graphics)
    graphics: Graphics = null;
    
    @property
    scale: number = 2;
    
    private dungeon: Dungeon = null;
    
    start() {
        this.dungeon = this.dungeonGenerator.generateDungeon();
        this.drawMinimap();
    }
    
    drawMinimap() {
        this.graphics.clear();
        
        // 绘制地图格子
        for (let y = 0; y < this.dungeon.height; y++) {
            for (let x = 0; x < this.dungeon.width; x++) {
                const tile = this.dungeon.tiles[y][x];
                
                if (tile === TileType.FLOOR || tile === TileType.CORRIDOR) {
                    this.graphics.fillColor = Color.WHITE;
                    this.graphics.rect(
                        x * this.scale,
                        y * this.scale,
                        this.scale,
                        this.scale
                    );
                    this.graphics.fill();
                } else if (tile === TileType.WALL) {
                    this.graphics.fillColor = Color.GRAY;
                    this.graphics.rect(
                        x * this.scale,
                        y * this.scale,
                        this.scale,
                        this.scale
                    );
                    this.graphics.fill();
                }
            }
        }
        
        // 绘制房间标记
        for (const room of this.dungeon.rooms) {
            let color = Color.BLUE;
            
            if (room.type === 'start') {
                color = Color.GREEN;
            } else if (room.type === 'exit') {
                color = Color.RED;
            } else if (room.type === 'treasure') {
                color = Color.YELLOW;
            }
            
            this.graphics.fillColor = color;
            this.graphics.circle(
                room.centerX * this.scale,
                room.centerY * this.scale,
                3
            );
            this.graphics.fill();
        }
    }
}
```

## 注意事项

1. **性能考虑**：生成大型地牢（如 100x100）可能需要一些时间，建议在加载场景时生成
2. **种子控制**：设置相同的种子可以生成相同的地牢，适合关卡设计和测试
3. **房间重叠**：算法会自动避免房间重叠，但如果参数设置不当可能导致生成的房间数少于预期
4. **连接性**：所有房间都会被连接，确保玩家可以到达每个房间

## API 参考

### 主要方法

- [`generateDungeon(config?: Partial<DungeonConfig>): Dungeon`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:118) - 生成地牢
- [`getRoomAt(dungeon: Dungeon, x: number, y: number): Room | null`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:343) - 获取指定位置的房间
- [`getConnectedRooms(dungeon: Dungeon, room: Room): Room[]`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:354) - 获取相邻房间
- [`regenerate(): Dungeon`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:359) - 重新生成地牢

## 相关文件

- [`ProceduralDungeonGenerator.ts`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:1) - 主要实现文件
- [`Logger.ts`](assets/resources/main/scrpits/Logger.ts:1) - 日志系统（依赖）

## 总结

[`ProceduralDungeonGenerator`](assets/resources/main/scrpits/ProceduralDungeonGenerator.ts:68) 提供了一个完整的地牢生成解决方案，适合 Roguelike、地牢探索等类型的游戏。通过合理配置参数和处理生成的数据，可以创建丰富多样的游戏体验。
