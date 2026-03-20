import { _decorator, Component, Node, Prefab, Vec3, instantiate, resources, Enum } from 'cc';
import { CombatEntity, EntityType, Faction } from './CombatSystem';
import { ObjectPool } from './ObjectPool';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

// ========== 枚举定义 ==========

/** 生成模式 */
export enum SpawnMode {
    MANUAL = 0,         // 手动生成
    AUTO_INTERVAL = 1,  // 自动间隔生成
    AUTO_WAVE = 2,      // 波次生成
    AUTO_COUNT = 3      // 保持数量生成
}

/** 生成位置类型 */
export enum SpawnPositionType {
    FIXED = 0,          // 固定位置
    RANDOM_AREA = 1,    // 区域内随机
    CIRCLE = 2,         // 圆形边缘
    PATH = 3            // 路径点
}

// ========== 接口定义 ==========

/** 敌人配置 */
export interface EnemyConfig {
    /** 敌人名称 */
    name: string;
    /** 预制体 */
    prefab: Prefab;
    /** 生成权重（用于随机选择） */
    weight: number;
    /** 最大生命值 */
    maxHealth?: number;
    /** 攻击力 */
    attackPower?: number;
    /** 移动速度 */
    moveSpeed?: number;
}

/** 生成区域配置 */
export interface SpawnArea {
    /** 中心位置 */
    center: Vec3;
    /** 宽度 */
    width: number;
    /** 高度 */
    height: number;
}

/** 波次配置 */
export interface WaveConfig {
    /** 波次编号 */
    waveNumber: number;
    /** 生成数量 */
    spawnCount: number;
    /** 生成间隔（秒） */
    spawnInterval: number;
    /** 敌人类型索引列表 */
    enemyTypes: number[];
}

// ========== 敌人生成器 ==========

/**
 * 敌人生成器组件
 * 自动加载敌人预制体并按配置生成
 */
@ccclass('EnemySpawner')
export class EnemySpawner extends Component {

    // ---------- Inspector 属性 ----------

    @property({ tooltip: '敌人预制体文件夹路径（相对于 resources）' })
    public enemyFolderPath: string = 'enemies';

    @property({ type: Enum(SpawnMode), tooltip: '生成模式' })
    public spawnMode: SpawnMode = SpawnMode.MANUAL;

    @property({ type: Enum(SpawnPositionType), tooltip: '生成位置类型' })
    public spawnPositionType: SpawnPositionType = SpawnPositionType.FIXED;

    @property({ visible: function() { return this.spawnMode === SpawnMode.AUTO_INTERVAL; }, tooltip: '自动生成间隔（秒）' })
    public autoSpawnInterval: number = 2;

    @property({ visible: function() { return this.spawnMode === SpawnMode.AUTO_COUNT; }, tooltip: '保持敌人数量' })
    public maintainEnemyCount: number = 5;

    @property({ visible: function() { return this.spawnPositionType === SpawnPositionType.RANDOM_AREA; }, tooltip: '生成区域宽度' })
    public spawnAreaWidth: number = 500;

    @property({ visible: function() { return this.spawnPositionType === SpawnPositionType.RANDOM_AREA; }, tooltip: '生成区域高度' })
    public spawnAreaHeight: number = 500;

    @property({ visible: function() { return this.spawnPositionType === SpawnPositionType.CIRCLE; }, tooltip: '圆形生成半径' })
    public spawnCircleRadius: number = 300;

    @property({ type: [Vec3], visible: function() { return this.spawnPositionType === SpawnPositionType.PATH; }, tooltip: '路径点列表' })
    public spawnPathPoints: Vec3[] = [];

    @property({ tooltip: '生成的敌人父节点（留空则使用当前节点）' })
    public enemyContainer: Node = null;

    @property({ tooltip: '启用调试日志' })
    public enableDebugLog: boolean = false;

    @property({ tooltip: '启用调试绘制生成区域' })
    public enableDebugDrawArea: boolean = false;

    @property({ tooltip: '启用对象池优化' })
    public useObjectPool: boolean = true;

    @property({ visible: function() { return this.useObjectPool; }, tooltip: '对象池初始容量' })
    public poolInitialCapacity: number = 10;

    @property({ visible: function() { return this.useObjectPool; }, tooltip: '对象池最大容量（0=无限制）' })
    public poolMaxCapacity: number = 50;

    // ---------- 私有状态 ----------

    private readonly MODULE_NAME = 'EnemySpawner';
    private _enemyConfigs: EnemyConfig[] = [];
    private _enemyPools: Map<string, ObjectPool> = new Map();
    private _spawnedEnemies: Node[] = [];
    private _currentWave: number = 0;
    private _spawnTimer: number = 0;
    private _isLoaded: boolean = false;
    private _totalWeight: number = 0;

    // ========== 生命周期 ==========

    async onLoad() {
        // 加载敌人预制体
        await this._loadEnemyPrefabs();

        // 初始化容器
        if (!this.enemyContainer) {
            this.enemyContainer = this.node;
        }

        // 初始化对象池
        if (this.useObjectPool) {
            this._initObjectPools();
        }

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `敌人生成器初始化完成，加载了 ${this._enemyConfigs.length} 个敌人类型`);
        }
    }

    onDestroy() {
        // 清理对象池
        for (const pool of this._enemyPools.values()) {
            pool.clear();
        }
        this._enemyPools.clear();
    }

    update(dt: number) {
        if (!this._isLoaded) return;

        // 清理已销毁的敌人引用
        this._spawnedEnemies = this._spawnedEnemies.filter(enemy => enemy && enemy.isValid);

        // 根据模式执行生成逻辑
        switch (this.spawnMode) {
            case SpawnMode.AUTO_INTERVAL:
                this._updateAutoInterval(dt);
                break;
            case SpawnMode.AUTO_COUNT:
                this._updateAutoCount();
                break;
        }
    }

    // ========== 加载资源 ==========

    private async _loadEnemyPrefabs() {
        try {
            // 加载文件夹下所有预制体
            const prefabs = await this._loadPrefabsFromFolder(this.enemyFolderPath);
            
            if (prefabs.length === 0) {
                Log.warn(this.MODULE_NAME, `未在 ${this.enemyFolderPath} 找到敌人预制体`);
                return;
            }

            // 创建敌人配置
            this._enemyConfigs = prefabs.map((prefab, index) => ({
                name: prefab.name || `Enemy_${index}`,
                prefab: prefab,
                weight: 1, // 默认权重
                maxHealth: 50,
                attackPower: 10,
                moveSpeed: 100
            }));

            // 计算总权重
            this._totalWeight = this._enemyConfigs.reduce((sum, cfg) => sum + cfg.weight, 0);

            this._isLoaded = true;

            if (this.enableDebugLog) {
                Log.log(this.MODULE_NAME, `成功加载 ${this._enemyConfigs.length} 个敌人预制体`);
                this._enemyConfigs.forEach(cfg => {
                    Log.log(this.MODULE_NAME, `  - ${cfg.name} (权重: ${cfg.weight})`);
                });
            }
        } catch (error) {
            Log.error(this.MODULE_NAME, '加载敌人预制体失败', error);
        }
    }

    private _initObjectPools() {
        for (const config of this._enemyConfigs) {
            const pool = new ObjectPool(
                `Enemy_${config.name}`,
                {
                    prefab: config.prefab,
                    initialCapacity: this.poolInitialCapacity,
                    maxCapacity: this.poolMaxCapacity,
                    autoExpand: true
                },
                this.enemyContainer
            );
            this._enemyPools.set(config.name, pool);
        }

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `初始化了 ${this._enemyPools.size} 个对象池`);
        }
    }

    private _loadPrefabsFromFolder(folderPath: string): Promise<Prefab[]> {
        return new Promise((resolve, reject) => {
            resources.loadDir(folderPath, Prefab, (err, prefabs) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(prefabs);
            });
        });
    }

    // ========== 生成逻辑 ==========

    private _updateAutoInterval(dt: number) {
        this._spawnTimer += dt;
        if (this._spawnTimer >= this.autoSpawnInterval) {
            this._spawnTimer = 0;
            this.spawnRandomEnemy();
        }
    }

    private _updateAutoCount() {
        const currentCount = this._spawnedEnemies.length;
        if (currentCount < this.maintainEnemyCount) {
            const spawnCount = this.maintainEnemyCount - currentCount;
            for (let i = 0; i < spawnCount; i++) {
                this.spawnRandomEnemy();
            }
        }
    }

    /** 生成随机敌人 */
    public spawnRandomEnemy(): Node | null {
        if (this._enemyConfigs.length === 0) {
            Log.warn(this.MODULE_NAME, '没有可用的敌人配置');
            return null;
        }

        // 根据权重随机选择敌人
        const config = this._selectRandomEnemy();
        return this.spawnEnemy(config);
    }

    /** 生成指定类型的敌人 */
    public spawnEnemyByIndex(index: number): Node | null {
        if (index < 0 || index >= this._enemyConfigs.length) {
            Log.warn(this.MODULE_NAME, `敌人索引 ${index} 超出范围`);
            return null;
        }

        return this.spawnEnemy(this._enemyConfigs[index]);
    }

    /** 生成指定配置的敌人 */
    public spawnEnemy(config: EnemyConfig, position?: Vec3): Node | null {
        if (!config || !config.prefab) {
            Log.warn(this.MODULE_NAME, '无效的敌人配置');
            return null;
        }

        let enemy: Node = null;

        // 使用对象池或直接实例化
        if (this.useObjectPool) {
            const pool = this._enemyPools.get(config.name);
            if (pool) {
                enemy = pool.get();
            }
        }

        // 如果对象池未启用或获取失败，直接实例化
        if (!enemy) {
            enemy = instantiate(config.prefab);
            enemy.parent = this.enemyContainer;
        }

        // 设置位置
        const spawnPos = position || this._getSpawnPosition();
        enemy.setPosition(spawnPos);

        // 配置战斗实体
        const combatEntity = enemy.getComponent(CombatEntity);
        if (combatEntity) {
            if (config.maxHealth !== undefined) combatEntity.maxHealth = config.maxHealth;
            if (config.attackPower !== undefined) combatEntity.attackPower = config.attackPower;
            combatEntity.currentHealth = combatEntity.maxHealth;
            combatEntity.entityType = EntityType.ENEMY;
            combatEntity.faction = Faction.ENEMY;

            // 订阅死亡事件
            combatEntity.onDeath(() => {
                this._onEnemyDeath(enemy, config);
            });
        }

        // 添加到跟踪列表
        this._spawnedEnemies.push(enemy);

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `生成敌人: ${config.name} 于 (${spawnPos.x.toFixed(0)}, ${spawnPos.y.toFixed(0)})`);
        }

        return enemy;
    }

    /** 批量生成敌人 */
    public spawnEnemies(count: number) {
        for (let i = 0; i < count; i++) {
            this.spawnRandomEnemy();
        }
    }

    /** 生成波次 */
    public spawnWave(waveConfig: WaveConfig) {
        this._currentWave = waveConfig.waveNumber;
        
        let spawnedCount = 0;
        const spawnInterval = waveConfig.spawnInterval;

        const spawnNext = () => {
            if (spawnedCount >= waveConfig.spawnCount) {
                if (this.enableDebugLog) {
                    Log.log(this.MODULE_NAME, `波次 ${waveConfig.waveNumber} 生成完成`);
                }
                return;
            }

            // 选择敌人类型
            const typeIndex = waveConfig.enemyTypes[spawnedCount % waveConfig.enemyTypes.length];
            this.spawnEnemyByIndex(typeIndex);
            spawnedCount++;

            // 继续生成下一个
            if (spawnedCount < waveConfig.spawnCount) {
                this.scheduleOnce(spawnNext, spawnInterval);
            }
        };

        spawnNext();
    }

    // ========== 位置计算 ==========

    private _getSpawnPosition(): Vec3 {
        switch (this.spawnPositionType) {
            case SpawnPositionType.FIXED:
                return this.node.position.clone();
            
            case SpawnPositionType.RANDOM_AREA:
                return this._getRandomAreaPosition();
            
            case SpawnPositionType.CIRCLE:
                return this._getCirclePosition();
            
            case SpawnPositionType.PATH:
                return this._getPathPosition();
            
            default:
                return this.node.position.clone();
        }
    }

    private _getRandomAreaPosition(): Vec3 {
        const x = this.node.position.x + (Math.random() - 0.5) * this.spawnAreaWidth;
        const y = this.node.position.y + (Math.random() - 0.5) * this.spawnAreaHeight;
        return new Vec3(x, y, 0);
    }

    private _getCirclePosition(): Vec3 {
        const angle = Math.random() * Math.PI * 2;
        const x = this.node.position.x + Math.cos(angle) * this.spawnCircleRadius;
        const y = this.node.position.y + Math.sin(angle) * this.spawnCircleRadius;
        return new Vec3(x, y, 0);
    }

    private _getPathPosition(): Vec3 {
        if (this.spawnPathPoints.length === 0) {
            return this.node.position.clone();
        }
        const randomIndex = Math.floor(Math.random() * this.spawnPathPoints.length);
        return this.spawnPathPoints[randomIndex].clone();
    }

    // ========== 敌人选择 ==========

    private _selectRandomEnemy(): EnemyConfig {
        if (this._enemyConfigs.length === 1) {
            return this._enemyConfigs[0];
        }

        // 根据权重随机选择
        let random = Math.random() * this._totalWeight;
        for (const config of this._enemyConfigs) {
            random -= config.weight;
            if (random <= 0) {
                return config;
            }
        }

        return this._enemyConfigs[0];
    }

    // ========== 事件处理 ==========

    private _onEnemyDeath(enemy: Node, config: EnemyConfig) {
        // 从跟踪列表中移除
        const index = this._spawnedEnemies.indexOf(enemy);
        if (index >= 0) {
            this._spawnedEnemies.splice(index, 1);
        }

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `敌人死亡: ${enemy.name}, 剩余: ${this._spawnedEnemies.length}`);
        }

        // 如果使用对象池，归还到池中而不是销毁
        if (this.useObjectPool && config) {
            const pool = this._enemyPools.get(config.name);
            if (pool) {
                // 延迟归还，让死亡动画播放完
                this.scheduleOnce(() => {
                    if (enemy && enemy.isValid) {
                        pool.put(enemy);
                    }
                }, 0.5);
            }
        }
    }

    // ========== 公共 API ==========

    /** 获取当前存活敌人数量 */
    public getAliveEnemyCount(): number {
        return this._spawnedEnemies.length;
    }

    /** 获取所有存活敌人 */
    public getAliveEnemies(): Node[] {
        return [...this._spawnedEnemies];
    }

    /** 清除所有敌人 */
    public clearAllEnemies() {
        for (const enemy of this._spawnedEnemies) {
            if (enemy && enemy.isValid) {
                if (this.useObjectPool) {
                    // 归还到对象池
                    const enemyName = enemy.name.replace(/\d+$/, ''); // 移除实例编号
                    const pool = this._enemyPools.get(enemyName);
                    if (pool) {
                        pool.put(enemy);
                    } else {
                        enemy.destroy();
                    }
                } else {
                    enemy.destroy();
                }
            }
        }
        this._spawnedEnemies = [];

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, '清除所有敌人');
        }
    }

    /** 设置敌人配置 */
    public setEnemyConfig(index: number, config: Partial<EnemyConfig>) {
        if (index < 0 || index >= this._enemyConfigs.length) return;

        const enemyConfig = this._enemyConfigs[index];
        Object.assign(enemyConfig, config);

        // 重新计算总权重
        this._totalWeight = this._enemyConfigs.reduce((sum, cfg) => sum + cfg.weight, 0);

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `更新敌人配置 ${index}: ${enemyConfig.name}`);
        }
    }

    /** 获取敌人配置列表 */
    public getEnemyConfigs(): EnemyConfig[] {
        return [...this._enemyConfigs];
    }

    /** 添加自定义敌人配置 */
    public addEnemyConfig(config: EnemyConfig) {
        this._enemyConfigs.push(config);
        this._totalWeight += config.weight;

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `添加敌人配置: ${config.name}`);
        }
    }

    /** 开始自动生成 */
    public startAutoSpawn() {
        if (this.spawnMode === SpawnMode.MANUAL) {
            this.spawnMode = SpawnMode.AUTO_INTERVAL;
        }
        this._spawnTimer = 0;

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, '开始自动生成');
        }
    }

    /** 停止自动生成 */
    public stopAutoSpawn() {
        this.spawnMode = SpawnMode.MANUAL;

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, '停止自动生成');
        }
    }

    /** 手动生成指定数量的敌人 */
    public manualSpawn(count: number = 1) {
        for (let i = 0; i < count; i++) {
            this.spawnRandomEnemy();
        }
    }

    /** 获取当前波次 */
    public getCurrentWave(): number {
        return this._currentWave;
    }

    /** 是否已加载完成 */
    public isLoaded(): boolean {
        return this._isLoaded;
    }

    /** 获取对象池统计信息 */
    public getPoolStats(): { name: string; poolSize: number; activeSize: number; totalSize: number }[] {
        const stats = [];
        for (const [name, pool] of this._enemyPools) {
            stats.push({
                name,
                poolSize: pool.getPoolSize(),
                activeSize: pool.getActiveSize(),
                totalSize: pool.getTotalSize()
            });
        }
        return stats;
    }

    /** 打印对象池状态 */
    public debugPools() {
        if (!this.useObjectPool) {
            Log.log(this.MODULE_NAME, '对象池未启用');
            return;
        }

        Log.log(this.MODULE_NAME, '=== 对象池状态 ===');
        for (const stat of this.getPoolStats()) {
            Log.log(this.MODULE_NAME,
                `${stat.name}: 池中=${stat.poolSize}, 活跃=${stat.activeSize}, 总计=${stat.totalSize}`
            );
        }
    }

    /** 预热对象池 */
    public prewarmPools(count: number) {
        if (!this.useObjectPool) return;

        for (const pool of this._enemyPools.values()) {
            pool.prewarm(count);
        }

        if (this.enableDebugLog) {
            Log.log(this.MODULE_NAME, `对象池预热完成，每个池 ${count} 个对象`);
        }
    }
}
