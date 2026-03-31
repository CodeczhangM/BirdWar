import { CombatEntity } from './CombatSystem';

/**
 * 全局战斗实体注册表（单例）
 * CombatEntity 在 onLoad/onDestroy 时自动注册/注销，
 * SkillManager 通过此表查找目标，避免每帧遍历场景树。
 */
export class EntityRegistry {
    private static _instance: EntityRegistry = new EntityRegistry();
    private _entities: Set<CombatEntity> = new Set();

    static get instance(): EntityRegistry { return this._instance; }

    register(entity: CombatEntity): void {
        this._entities.add(entity);
    }

    unregister(entity: CombatEntity): void {
        this._entities.delete(entity);
    }

    /** 返回所有存活实体的快照数组 */
    getAll(): CombatEntity[] {
        const result: CombatEntity[] = [];
        for (const e of this._entities) {
            if (e && e.isValid && e.isAlive()) result.push(e);
        }
        return result;
    }
}
