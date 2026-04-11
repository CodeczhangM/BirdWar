import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { Log } from '../Logger';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {

    @property({ type: Prefab, tooltip: '敌人预制体' })
    public enemyPrefab: Prefab = null;

    @property({ tooltip: '生成位置' })
    public spawnPosition: Vec3 = new Vec3(0, 0, 0);

    @property({ tooltip: '生成范围' })
    public spawnRange: number = 100;

    @property({ tooltip: '敌人数量' })
    public enemyCount: number = 3;

    @property({ tooltip: '生成间隔' })
    public spawnInterval: number = 2;

    private _spawnTimer: number = 0;
    private _spawnedCount: number = 0;
    private _aliveEnemies: Node[] = [];
    private _onAllDeadCb: (() => void) | null = null;
    private readonly MODULE_NAME = 'EnemyManager';

    protected start(): void {
        this.spawnInitialEnemies();
    }

    protected update(dt: number): void {
        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0 && this._spawnedCount < this.enemyCount) {
            this.spawnEnemy();
            this._spawnTimer = this.spawnInterval;
        }
    }

    private spawnInitialEnemies(): void {
        for (let i = 0; i < this.enemyCount; i++) {
            this.spawnEnemy();
        }
    }

    private spawnEnemy(): void {
        if (!this.enemyPrefab) {
            Log.error(this.MODULE_NAME, '敌人预制体未设置');
            return;
        }

        const enemy = instantiate(this.enemyPrefab);
        const randomX = this.spawnPosition.x + (Math.random() - 0.5) * this.spawnRange;
        const randomY = this.spawnPosition.y + (Math.random() - 0.5) * this.spawnRange;

        enemy.setPosition(randomX, randomY, 0);
        this.node.addChild(enemy);
        this._aliveEnemies.push(enemy);

        // 监听死亡
        const combatEntity = enemy.getComponent('CombatEntity') as any;
        if (combatEntity) {
            combatEntity.onDeath(() => this._onEnemyDead(enemy));
        }

        Log.debug(this.MODULE_NAME, `生成敌人 [${this._spawnedCount + 1}/${this.enemyCount}]`);
        this._spawnedCount++;
    }

    public spawnEnemyAtPosition(pos: Vec3): void {
        if (!this.enemyPrefab) return;

        const enemy = instantiate(this.enemyPrefab);
        enemy.setPosition(pos);
        this.node.addChild(enemy);
        this._aliveEnemies.push(enemy);

        const combatEntity = enemy.getComponent('CombatEntity') as any;
        if (combatEntity) {
            combatEntity.onDeath(() => this._onEnemyDead(enemy));
        }

        Log.debug(this.MODULE_NAME, `在位置生成敌人: ${pos}`);
    }

    private _onEnemyDead(enemy: Node) {
        this._aliveEnemies = this._aliveEnemies.filter(e => e && e.isValid && e !== enemy);
        if (this._aliveEnemies.length === 0 && this._onAllDeadCb) {
            this._onAllDeadCb();
        }
    }

    /** 注册全部敌人死亡回调 */
    public onAllDead(cb: () => void) {
        this._onAllDeadCb = cb;
    }

    /** 获取当前存活敌人数量 */
    public getAliveCount(): number {
        this._aliveEnemies = this._aliveEnemies.filter(e => e && e.isValid);
        return this._aliveEnemies.length;
    }
}
