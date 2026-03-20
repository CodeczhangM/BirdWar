import { _decorator, Component, Label, Vec3 } from 'cc';
import { EnemySpawner, SpawnMode, SpawnPositionType, WaveConfig } from './EnemySpawner';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 敌人生成器使用示例
 * 演示如何使用 EnemySpawner 组件
 */
@ccclass('EnemySpawnerExample')
export class EnemySpawnerExample extends Component {

    @property({ type: EnemySpawner, tooltip: '敌人生成器' })
    public spawner: EnemySpawner = null;

    @property({ type: Label, tooltip: '状态显示标签' })
    public statusLabel: Label = null;

    @property({ tooltip: '是否自动开始生成' })
    public autoStart: boolean = true;

    private readonly MODULE_NAME = 'EnemySpawnerExample';

    start() {
        // 如果没有指定，尝试从当前节点获取
        if (!this.spawner) {
            this.spawner = this.getComponent(EnemySpawner);
        }

        if (!this.spawner) {
            Log.error(this.MODULE_NAME, '未找到 EnemySpawner 组件');
            return;
        }

        // 等待加载完成后开始
        this.scheduleOnce(() => {
            if (this.spawner.isLoaded() && this.autoStart) {
                this.startSpawning();
            }
        }, 0.5);

        Log.log(this.MODULE_NAME, '敌人生成器示例初始化完成');
    }

    update(_dt: number) {
        this._updateUI();
    }

    // ========== UI 更新 ==========

    private _updateUI() {
        if (!this.statusLabel || !this.spawner) return;

        const aliveCount = this.spawner.getAliveEnemyCount();
        const wave = this.spawner.getCurrentWave();
        const configs = this.spawner.getEnemyConfigs();

        this.statusLabel.string = 
            `波次: ${wave}\n` +
            `存活敌人: ${aliveCount}\n` +
            `敌人类型: ${configs.length}`;
    }

    // ========== 控制方法 ==========

    /** 开始生成 */
    public startSpawning() {
        if (!this.spawner) return;
        this.spawner.startAutoSpawn();
        Log.log(this.MODULE_NAME, '开始生成敌人');
    }

    /** 停止生成 */
    public stopSpawning() {
        if (!this.spawner) return;
        this.spawner.stopAutoSpawn();
        Log.log(this.MODULE_NAME, '停止生成敌人');
    }

    /** 清除所有敌人 */
    public clearAll() {
        if (!this.spawner) return;
        this.spawner.clearAllEnemies();
        Log.log(this.MODULE_NAME, '清除所有敌人');
    }

    /** 手动生成一个敌人 */
    public spawnOne() {
        if (!this.spawner) return;
        this.spawner.spawnRandomEnemy();
    }

    /** 手动生成多个敌人 */
    public spawnMultiple(count: number) {
        if (!this.spawner) return;
        this.spawner.spawnEnemies(count);
        Log.log(this.MODULE_NAME, `生成 ${count} 个敌人`);
    }

    /** 生成测试波次 */
    public spawnTestWave() {
        if (!this.spawner) return;

        const waveConfig: WaveConfig = {
            waveNumber: 1,
            spawnCount: 10,
            spawnInterval: 0.5,
            enemyTypes: [0, 1, 0, 1, 2] // 交替生成不同类型
        };

        this.spawner.spawnWave(waveConfig);
        Log.log(this.MODULE_NAME, '开始测试波次');
    }

    /** 自定义敌人配置示例 */
    public customizeEnemyConfig() {
        if (!this.spawner) return;

        // 修改第一个敌人的配置
        this.spawner.setEnemyConfig(0, {
            weight: 2,          // 增加生成权重
            maxHealth: 100,     // 更高生命值
            attackPower: 20,    // 更高攻击力
            moveSpeed: 150      // 更快速度
        });

        Log.log(this.MODULE_NAME, '自定义敌人配置完成');
    }
}
