import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { Log } from './Logger';

const { ccclass } = _decorator;

// ========== 接口定义 ==========

/** 可池化对象接口 */
export interface IPoolable {
    /** 从池中取出时调用 */
    onSpawn?(): void;
    /** 归还到池中时调用 */
    onRecycle?(): void;
}

/** 对象池配置 */
export interface PoolConfig {
    /** 预制体 */
    prefab: Prefab;
    /** 初始容量 */
    initialCapacity?: number;
    /** 最大容量（0 表示无限制） */
    maxCapacity?: number;
    /** 是否自动扩容 */
    autoExpand?: boolean;
}

// ========== 对象池 ==========

/**
 * 通用对象池
 * 用于管理可复用的节点对象
 */
export class ObjectPool {
    private _name: string;
    private _prefab: Prefab;
    private _pool: Node[] = [];
    private _activeObjects: Set<Node> = new Set();
    private _maxCapacity: number;
    private _autoExpand: boolean;
    private _parent: Node = null;

    constructor(name: string, config: PoolConfig, parent?: Node) {
        this._name = name;
        this._prefab = config.prefab;
        this._maxCapacity = config.maxCapacity || 0;
        this._autoExpand = config.autoExpand !== false;
        this._parent = parent;

        // 预创建对象
        const initialCapacity = config.initialCapacity || 0;
        for (let i = 0; i < initialCapacity; i++) {
            const obj = this._createObject();
            this._pool.push(obj);
        }

        Log.log('ObjectPool', `对象池 "${name}" 创建完成，初始容量: ${initialCapacity}`);
    }

    /** 创建新对象 */
    private _createObject(): Node {
        const obj = instantiate(this._prefab);
        obj.active = false;
        if (this._parent) {
            obj.parent = this._parent;
        }
        return obj;
    }

    /** 从池中获取对象 */
    public get(): Node | null {
        let obj: Node = null;

        // 从池中取出
        if (this._pool.length > 0) {
            obj = this._pool.pop();
        } 
        // 自动扩容
        else if (this._autoExpand) {
            if (this._maxCapacity === 0 || this._activeObjects.size < this._maxCapacity) {
                obj = this._createObject();
            } else {
                Log.warn('ObjectPool', `对象池 "${this._name}" 已达到最大容量 ${this._maxCapacity}`);
                return null;
            }
        } 
        // 无可用对象
        else {
            Log.warn('ObjectPool', `对象池 "${this._name}" 已空，且不允许扩容`);
            return null;
        }

        // 激活对象
        obj.active = true;
        this._activeObjects.add(obj);

        // 调用生命周期回调
        const poolable = obj.getComponent('IPoolable') as any;
        if (poolable && typeof poolable.onSpawn === 'function') {
            poolable.onSpawn();
        }

        return obj;
    }

    /** 归还对象到池 */
    public put(obj: Node) {
        if (!obj || !obj.isValid) return;

        // 检查是否是活跃对象
        if (!this._activeObjects.has(obj)) {
            Log.warn('ObjectPool', `对象 ${obj.name} 不属于此对象池`);
            return;
        }

        // 调用生命周期回调
        const poolable = obj.getComponent('IPoolable') as any;
        if (poolable && typeof poolable.onRecycle === 'function') {
            poolable.onRecycle();
        }

        // 停用对象
        obj.active = false;
        this._activeObjects.delete(obj);

        // 归还到池
        if (this._maxCapacity === 0 || this._pool.length < this._maxCapacity) {
            this._pool.push(obj);
        } else {
            // 超出容量，直接销毁
            obj.destroy();
        }
    }

    /** 清空对象池 */
    public clear() {
        // 销毁池中对象
        for (const obj of this._pool) {
            if (obj && obj.isValid) {
                obj.destroy();
            }
        }
        this._pool = [];

        // 销毁活跃对象
        for (const obj of this._activeObjects) {
            if (obj && obj.isValid) {
                obj.destroy();
            }
        }
        this._activeObjects.clear();

        Log.log('ObjectPool', `对象池 "${this._name}" 已清空`);
    }

    /** 获取池中对象数量 */
    public getPoolSize(): number {
        return this._pool.length;
    }

    /** 获取活跃对象数量 */
    public getActiveSize(): number {
        return this._activeObjects.size;
    }

    /** 获取总容量 */
    public getTotalSize(): number {
        return this._pool.length + this._activeObjects.size;
    }

    /** 预热对象池 */
    public prewarm(count: number) {
        for (let i = 0; i < count; i++) {
            const obj = this._createObject();
            this._pool.push(obj);
        }
        Log.log('ObjectPool', `对象池 "${this._name}" 预热 ${count} 个对象`);
    }
}

// ========== 对象池管理器 ==========

/**
 * 对象池管理器
 * 管理多个对象池
 */
@ccclass('ObjectPoolManager')
export class ObjectPoolManager extends Component {

    // ---------- 单例 ----------

    private static _instance: ObjectPoolManager = null;
    public static get instance(): ObjectPoolManager { return ObjectPoolManager._instance; }

    // ---------- 私有状态 ----------

    private readonly MODULE_NAME = 'ObjectPoolManager';
    private _pools: Map<string, ObjectPool> = new Map();

    // ========== 生命周期 ==========

    onLoad() {
        if (ObjectPoolManager._instance && ObjectPoolManager._instance !== this) {
            this.destroy();
            return;
        }
        ObjectPoolManager._instance = this;

        Log.log(this.MODULE_NAME, '对象池管理器初始化完成');
    }

    onDestroy() {
        // 清空所有对象池
        for (const pool of this._pools.values()) {
            pool.clear();
        }
        this._pools.clear();

        if (ObjectPoolManager._instance === this) {
            ObjectPoolManager._instance = null;
        }
    }

    // ========== 对象池管理 ==========

    /** 创建对象池 */
    public createPool(name: string, config: PoolConfig, parent?: Node): ObjectPool {
        if (this._pools.has(name)) {
            Log.warn(this.MODULE_NAME, `对象池 "${name}" 已存在`);
            return this._pools.get(name);
        }

        const pool = new ObjectPool(name, config, parent);
        this._pools.set(name, pool);

        Log.log(this.MODULE_NAME, `创建对象池: ${name}`);
        return pool;
    }

    /** 获取对象池 */
    public getPool(name: string): ObjectPool | null {
        return this._pools.get(name) || null;
    }

    /** 删除对象池 */
    public removePool(name: string) {
        const pool = this._pools.get(name);
        if (pool) {
            pool.clear();
            this._pools.delete(name);
            Log.log(this.MODULE_NAME, `删除对象池: ${name}`);
        }
    }

    /** 清空所有对象池 */
    public clearAll() {
        for (const pool of this._pools.values()) {
            pool.clear();
        }
        this._pools.clear();
        Log.log(this.MODULE_NAME, '清空所有对象池');
    }

    /** 获取所有对象池名称 */
    public getPoolNames(): string[] {
        return Array.from(this._pools.keys());
    }

    /** 获取对象池统计信息 */
    public getPoolStats(): { name: string; poolSize: number; activeSize: number; totalSize: number }[] {
        const stats = [];
        for (const [name, pool] of this._pools) {
            stats.push({
                name,
                poolSize: pool.getPoolSize(),
                activeSize: pool.getActiveSize(),
                totalSize: pool.getTotalSize()
            });
        }
        return stats;
    }

    /** 打印所有对象池状态 */
    public debugPools() {
        Log.log(this.MODULE_NAME, '=== 对象池状态 ===');
        for (const stat of this.getPoolStats()) {
            Log.log(this.MODULE_NAME, 
                `${stat.name}: 池中=${stat.poolSize}, 活跃=${stat.activeSize}, 总计=${stat.totalSize}`
            );
        }
    }
}
