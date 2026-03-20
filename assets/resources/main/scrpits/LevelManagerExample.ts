import { _decorator, Component, Label, resources, JsonAsset } from 'cc';
import { ProceduralDungeonGenerator, Dungeon, RoomType } from './ProceduralDungeonGenerator';
import { EnemySpawner, SpawnMode } from './EnemySpawner';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 关卡管理器示例
 * 演示如何加载关卡配置并生成地牢
 */
@ccclass('LevelManagerExample')
export class LevelManagerExample extends Component {

    @property({ type: ProceduralDungeonGenerator, tooltip: '地牢生成器' })
    public dungeonGenerator: ProceduralDungeonGenerator = null;

    @property({ type: EnemySpawner, tooltip: '敌人生成器' })
    public enemySpawner: EnemySpawner = null;

    @property({ type: Label, tooltip: '状态显示标签' })
    public statusLabel: Label = null;

    @property({ tooltip: '关卡ID' })
    public levelId: string = 'level1';

    private readonly MODULE_NAME = 'LevelManagerExample';
    private _levelConfig: any = null;
    private _currentDungeon: Dungeon = null;

    // ========== 生命周期 ==========

    async start() {
        Log.log(this.MODULE_NAME, '开始加载关卡...');

        // 1. 加载关卡配置
        await this.loadLevel(this.levelId);

        // 2. 生成地牢
        if (this._levelConfig) {
            this.generateDungeon();
        }

        // 3. 配置敌人生成器
        if (this.enemySpawner && this._levelConfig) {
            this.setupEnemySpawner();
        }

        Log.log(this.MODULE_NAME, '关卡加载完成');
    }

    update(_dt: number) {
        this._updateUI();
    }

    // ========== 关卡加载 ==========

    /** 加载关卡配置 */
    public async loadLevel(levelId: string): Promise<boolean> {
        try {
            const configPath = `gameleveldata/${levelId}/${levelId}_config`;
            
            Log.log(this.MODULE_NAME, `加载关卡配置: ${configPath}`);

            // 加载配置文件
            const configAsset = await this._loadJsonAsset(configPath);
            if (!configAsset) {
                Log.error(this.MODULE_NAME, `加载关卡配置失败: ${configPath}`);
                return false;
            }

            this._levelConfig = configAsset.json;
            
            Log.log(this.MODULE_NAME, `关卡配置加载成功: ${this._levelConfig.name}`);
            Log.log(this.MODULE_NAME, `难度: ${this._levelConfig.difficulty}, 标签: ${this._levelConfig.tags.join(', ')}`);

            return true;
        } catch (error) {
            Log.error(this.MODULE_NAME, '加载关卡失败', error);
            return false;
        }
    }

    private _loadJsonAsset(path: string): Promise<JsonAsset> {
        return new Promise((resolve, reject) => {
            resources.load(path, JsonAsset, (err, asset) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(asset);
            });
        });
    }

    // ========== 地牢生成 ==========

    /** 生成地牢 */
    public generateDungeon() {
        if (!this.dungeonGenerator) {
            Log.error(this.MODULE_NAME, '地牢生成器未设置');
            return;
        }

        if (!this._levelConfig) {
            Log.error(this.MODULE_NAME, '关卡配置未加载');
            return;
        }

        // 从配置中读取程序生成参数
        const procGen = this._levelConfig.proceduralGeneration;
        if (!procGen || !procGen.enabled) {
            Log.warn(this.MODULE_NAME, '程序生成未启用');
            return;
        }

        // 配置生成器
        this.dungeonGenerator.minRooms = procGen.roomSize?.min || 8;
        this.dungeonGenerator.maxRooms = procGen.roomSize?.max || 15;
        this.dungeonGenerator.minRoomSize = procGen.roomSize?.min || 4;
        this.dungeonGenerator.maxRoomSize = procGen.roomSize?.max || 10;

        // 生成地牢
        this._currentDungeon = this.dungeonGenerator.generateDungeon({
            roomTypes: procGen.roomTypes
        });

        Log.log(this.MODULE_NAME, `地牢生成完成:`);
        Log.log(this.MODULE_NAME, `  - 房间数: ${this._currentDungeon.rooms.length}`);
        Log.log(this.MODULE_NAME, `  - 起点: 房间 ${this._currentDungeon.startRoom.id}`);
        Log.log(this.MODULE_NAME, `  - 终点: 房间 ${this._currentDungeon.exitRoom.id}`);

        // 打印房间类型统计
        this._printRoomStats();
    }

    private _printRoomStats() {
        const stats = new Map<RoomType, number>();
        
        for (const room of this._currentDungeon.rooms) {
            const count = stats.get(room.type) || 0;
            stats.set(room.type, count + 1);
        }

        Log.log(this.MODULE_NAME, '房间类型统计:');
        for (const [type, count] of stats) {
            Log.log(this.MODULE_NAME, `  - ${type}: ${count}`);
        }
    }

    // ========== 敌人生成配置 ==========

    /** 配置敌人生成器 */
    public setupEnemySpawner() {
        if (!this.enemySpawner || !this._levelConfig) return;

        const enemyConfig = this._levelConfig.enemies;
        if (!enemyConfig || !enemyConfig.spawnRules) {
            Log.warn(this.MODULE_NAME, '敌人配置未找到');
            return;
        }

        const rules = enemyConfig.spawnRules;

        // 配置生成模式
        if (rules.mode === 'procedural') {
            this.enemySpawner.spawnMode = SpawnMode.AUTO_COUNT;
            this.enemySpawner.maintainEnemyCount = rules.maxActiveEnemies || 8;
        }

        // 配置对象池
        this.enemySpawner.useObjectPool = true;
        this.enemySpawner.poolInitialCapacity = rules.maxActiveEnemies || 10;
        this.enemySpawner.poolMaxCapacity = rules.maxEnemies || 50;

        Log.log(this.MODULE_NAME, '敌人生成器配置完成');
        Log.log(this.MODULE_NAME, `  - 模式: ${SpawnMode[this.enemySpawner.spawnMode]}`);
        Log.log(this.MODULE_NAME, `  - 最大敌人数: ${rules.maxEnemies}`);
        Log.log(this.MODULE_NAME, `  - 同时存在: ${rules.maxActiveEnemies}`);
    }

    // ========== UI 更新 ==========

    private _updateUI() {
        if (!this.statusLabel) return;

        let status = `关卡: ${this._levelConfig?.name || '未加载'}\n`;

        if (this._currentDungeon) {
            status += `地牢: ${this._currentDungeon.rooms.length} 个房间\n`;
            status += `尺寸: ${this._currentDungeon.width}x${this._currentDungeon.height}\n`;
        }

        if (this.enemySpawner) {
            status += `敌人: ${this.enemySpawner.getAliveEnemyCount()}`;
        }

        this.statusLabel.string = status;
    }

    // ========== 公共接口 ==========

    /** 获取当前地牢 */
    public getCurrentDungeon(): Dungeon {
        return this._currentDungeon;
    }

    /** 获取关卡配置 */
    public getLevelConfig(): any {
        return this._levelConfig;
    }

    /** 重新生成地牢 */
    public regenerateDungeon() {
        if (!this.dungeonGenerator) return;
        
        this._currentDungeon = this.dungeonGenerator.regenerate();
        Log.log(this.MODULE_NAME, '地牢已重新生成');
    }

    /** 开始游戏 */
    public startGame() {
        if (!this._currentDungeon) {
            Log.error(this.MODULE_NAME, '地牢未生成');
            return;
        }

        // 开始敌人生成
        if (this.enemySpawner) {
            this.enemySpawner.startAutoSpawn();
            Log.log(this.MODULE_NAME, '游戏开始');
        }
    }

    /** 停止游戏 */
    public stopGame() {
        if (this.enemySpawner) {
            this.enemySpawner.stopAutoSpawn();
            this.enemySpawner.clearAllEnemies();
            Log.log(this.MODULE_NAME, '游戏停止');
        }
    }

    /** 打印地牢信息 */
    public debugDungeon() {
        if (!this._currentDungeon) {
            Log.log(this.MODULE_NAME, '地牢未生成');
            return;
        }

        Log.log(this.MODULE_NAME, '=== 地牢信息 ===');
        Log.log(this.MODULE_NAME, `尺寸: ${this._currentDungeon.width}x${this._currentDungeon.height}`);
        Log.log(this.MODULE_NAME, `房间数: ${this._currentDungeon.rooms.length}`);
        
        for (const room of this._currentDungeon.rooms) {
            Log.log(this.MODULE_NAME, 
                `房间 ${room.id}: ${room.type} at (${room.x},${room.y}) ${room.width}x${room.height}, 连接: ${room.connections.length}`
            );
        }
    }
}
