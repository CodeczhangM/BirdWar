import { Prefab } from 'cc';
import { DamageType } from '../CombatSystem';
import { SkillConfig, SkillRange } from './SkillManager';

export class SkillRegistry {
    private static _instance: SkillRegistry;
    static get instance(): SkillRegistry {
        if (!this._instance) this._instance = new SkillRegistry();
        return this._instance;
    }

    /** animIndex -> SkillConfig */
    private _configs: Map<number, SkillConfig> = new Map();
    /** animIndex -> Prefab（技能特效/子弹 prefab，可选） */
    private _prefabs: Map<number, Prefab> = new Map();

    /** 注册技能配置，key 为 animIndex */
    register(config: SkillConfig, prefab?: Prefab): void {
        this._configs.set(config.animIndex, config);
        if (prefab) this._prefabs.set(config.animIndex, prefab);
    }

    getConfig(animIndex: number): SkillConfig | undefined {
        return this._configs.get(animIndex);
    }

    getPrefab(animIndex: number): Prefab | undefined {
        return this._prefabs.get(animIndex);
    }

    /** 返回所有已注册的 SkillConfig 列表 */
    getAllConfigs(): SkillConfig[] {
        return Array.from(this._configs.values());
    }
}
