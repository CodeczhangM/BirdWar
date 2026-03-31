import { _decorator, Component, Vec2 } from 'cc';
import { CombatEntity, DamageType } from '../CombatSystem';
import { EntityRegistry } from '../EntityRegistry';
import { Log } from '../Logger';

const { ccclass } = _decorator;

// ========== 范围类型 ==========

export enum RangeType {
    CIRCLE,   // 圆形 AOE
    RECT,     // 矩形
    SECTOR,   // 扇形（朝向前方）
    SINGLE,   // 单体（最近目标）
}

export interface CircleRange  { type: RangeType.CIRCLE; radius: number }
export interface RectRange    { type: RangeType.RECT;   width: number; height: number }
export interface SectorRange  { type: RangeType.SECTOR; radius: number; angle: number }
export interface SingleRange  { type: RangeType.SINGLE; maxRange: number }
export type SkillRange = CircleRange | RectRange | SectorRange | SingleRange

// ========== 技能配置 ==========

export interface SkillConfig {
    /** 技能名称（调试用） */
    name: string
    /** 冷却时间（秒） */
    cooldown: number
    /** 伤害值（0 = 使用 CombatEntity.attackPower） */
    damage: number
    /** 伤害类型 */
    damageType: DamageType
    /** 范围配置 */
    range: SkillRange
    /** 动画索引（-1 = 不播放） */
    animIndex: number
    /** 技能持续时间（秒，0 = 瞬发） */
    duration: number
}

// ========== SkillManager ==========

const MODULE = 'SkillManager';

@ccclass('SkillManager')
export class SkillManager extends Component {

    /** 技能配置列表，由外部（Actor/Enemy）在 onLoad 中填充 */
    public skills: SkillConfig[] = [];

    private _cooldowns: number[] = [];
    private _combatEntity: CombatEntity = null;
    /** 朝向：1 = 右，-1 = 左 */
    public facing: number = 1;

    private readonly MODULE_NAME = 'SkillManager';

    protected onLoad(): void {
        this._combatEntity = this.getComponent(CombatEntity);
    }

    protected update(dt: number): void {
        for (let i = 0; i < this._cooldowns.length; i++) {
            if (this._cooldowns[i] > 0) {
                this._cooldowns[i] -= dt;
            }
        }
    }

    // ========== 公共接口 ==========

    /**
     * 使用技能
     * @param index 技能索引
     * @returns 是否成功释放
     */
    public useSkill(index: number): boolean {
        Log.debug(this.MODULE_NAME, `use skill ${index} , skill size = ${this.skills.length}`)
        const skill = this.skills[index];
        if (!skill) return false;
        if (!this._combatEntity || !this._combatEntity.isAlive()) return false;
        if ((this._cooldowns[index] ?? 0) > 0) return false;

        const targets = this._findTargets(skill.range);
        if (targets.length === 0 && skill.range.type !== RangeType.CIRCLE && skill.range.type !== RangeType.RECT) {
            // 单体/扇形找不到目标时不消耗冷却
            return false;
        }

        this._cooldowns[index] = skill.cooldown;

        const dmg = skill.damage > 0 ? skill.damage : this._combatEntity.attackPower;
        for (const target of targets) {
            this._combatEntity.attackTarget(target, dmg, skill.damageType);
        }

        Log.debug(MODULE, `${this.node.name} 释放技能[${index}] "${skill.name}"，命中 ${targets.length} 个目标`);
        return true;
    }

    /** 查询技能剩余冷却 */
    public getCooldown(index: number): number {
        return Math.max(0, this._cooldowns[index] ?? 0);
    }

    /** 查询技能是否就绪 */
    public isReady(index: number): boolean {
        return this.getCooldown(index) <= 0;
    }

    // ========== 目标查找 ==========

    private _findTargets(range: SkillRange): CombatEntity[] {
        const allEntities = this._getHostileEntities();
        const selfPos = new Vec2(this.node.worldPosition.x, this.node.worldPosition.y);

        switch (range.type) {
            case RangeType.CIRCLE:
                return allEntities.filter(e => {
                    const d = Vec2.distance(selfPos, new Vec2(e.node.worldPosition.x, e.node.worldPosition.y));
                    return d <= range.radius;
                });

            case RangeType.RECT: {
                const hh = range.height / 2;
                return allEntities.filter(e => {
                    // 矩形沿朝向方向，中心在自身前方 hw 处
                    const ep = new Vec2(e.node.worldPosition.x, e.node.worldPosition.y);
                    const local = ep.subtract(selfPos);
                    const lx = local.x * this.facing; // 转换到朝向空间
                    return lx >= 0 && lx <= range.width && Math.abs(local.y) <= hh;
                });
            }

            case RangeType.SECTOR: {
                const halfAngle = range.angle / 2;
                return allEntities.filter(e => {
                    const ep = new Vec2(e.node.worldPosition.x, e.node.worldPosition.y);
                    const dir = ep.subtract(selfPos);
                    const dist = dir.length();
                    if (dist > range.radius) return false;
                    const angleDeg = Math.atan2(dir.y, dir.x * this.facing) * (180 / Math.PI);
                    return Math.abs(angleDeg) <= halfAngle;
                });
            }

            case RangeType.SINGLE: {
                let nearest: CombatEntity = null;
                let minDist = range.maxRange;
                for (const e of allEntities) {
                    const d = Vec2.distance(selfPos, new Vec2(e.node.worldPosition.x, e.node.worldPosition.y));
                    if (d < minDist) { minDist = d; nearest = e; }
                }
                return nearest ? [nearest] : [];
            }
        }
    }

    /** 从注册表获取所有敌对 CombatEntity */
    private _getHostileEntities(): CombatEntity[] {
        if (!this._combatEntity) return [];
        return EntityRegistry.instance.getAll().filter(
            e => e !== this._combatEntity && this._combatEntity.canDamageTarget(e)
        );
    }
}
