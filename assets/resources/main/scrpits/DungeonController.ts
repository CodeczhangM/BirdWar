import { Log } from './Logger';
import { ProceduralDungeonGenerator, Dungeon,TileType } from './ProceduralDungeonGenerator';
import { _decorator, Component, Node,Prefab, instantiate, Vec3 } from 'cc';
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

    @property
    tileSize: number = 32;
    
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


