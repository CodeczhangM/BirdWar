import { _decorator, Component, Vec2, Vec3, UITransform, Graphics, Animation, Color, Node, instantiate, Prefab } from 'cc';
import { CombatEntity, DamageType } from '../CombatSystem';
import { EntityRegistry } from '../EntityRegistry';
import { Log } from '../Logger';
import { SkillRegistry } from './SkillRegistry';
import { SkillWithTargetOrDir } from './SkillWithTargetOrDir';

const { ccclass } = _decorator;

// ========== 范围类型 ==========
export enum RangeType {
    CIRCLE,   // 圆形 AOE
    RECT,     // 矩形（朝向前方延伸）
    SECTOR,   // 扇形（朝向前方）
    SINGLE,   // 单体（最近目标）
    EMIT      // 触发类型
}

export interface CircleRange  { type: RangeType.CIRCLE; radius: number }
export interface RectRange    { type: RangeType.RECT;   width: number; height: number }
export interface SectorRange  { type: RangeType.SECTOR; radius: number; angle: number }
export interface SingleRange  { type: RangeType.SINGLE; maxRange: number }
export interface EmitRange    { type: RangeType.EMIT;}
export type SkillRange = CircleRange | RectRange | SectorRange | SingleRange | EmitRange

// ========== 技能配置 ==========
export interface SkillConfig {
    name: string
    cooldown: number
    damage: number
    damageType: DamageType
    range: SkillRange
    /** 施法距离：技能中点 = 自身位置 + facing * castDistance */
    castDistance: number
    animIndex: number
    duration: number
}

// ========== SkillManager ==========
const MODULE = 'SkillManager';

// 半透明调试颜色
const DEBUG_COLORS = {
    CIRCLE: new Color(0,   255, 255, 80),
    RECT:   new Color(0,   255, 0,   80),
    SECTOR: new Color(255, 0,   255, 80),
    SINGLE: new Color(255, 255, 0,   80),
};

@ccclass('SkillManager')
export class SkillManager extends Component {

    public skills: SkillConfig[] = [];
    private _cooldowns: number[] = [];
    private _prefabNodes: Map<number, Node> = new Map();
    private _combatEntity: CombatEntity = null;
    /** 朝向：1 = 右，-1 = 左 */
    public facing: number = 1;


    public openDebug: boolean = true;
    private _debugShowTime: number = 0;
    private _skillDebugIndex: number = 0;
    private _graphics: Graphics | null = null;
    private _debugDrawNode: Node | null = null;
    private _scale : Vec3 = Vec3.ZERO;
    // private _SkillWithTargetDirection : SkillWithTargetOrDir = null;

    private readonly MODULE_NAME = 'SkillManager';

    protected onLoad(): void {
        this._combatEntity = this.getComponent(CombatEntity);
        if (this.openDebug) this._createDebugDrawNode();
    }

    protected update(dt: number): void {
        this._scale = this.node.scale;
        for (let i = 0; i < this._cooldowns.length; i++) {
            if (this._cooldowns[i] > 0) this._cooldowns[i] -= dt;
        }

        if (this.openDebug) {
            this._debugShowTime += dt;
            if (this._debugShowTime < 2) {
                this._drawDebugRange();
            } else {
                if (this._graphics) this._graphics.clear();
            }
        }
    }

    // ========== 公共接口 ==========

    public useSkill(index: number): boolean {
        Log.debug(MODULE, `use skill ${index}, skill size = ${this.skills.length}`);

        // 若 slot 为空，尝试从注册表按 animIndex 自动挂载
        if (!this.skills[index]) {
            const mounted = this.mountFromRegistry(index);
            if (mounted < 0) return false;
        }

        const skill = this.skills[index];
        if (!skill) return false;
        if (!this._combatEntity || !this._combatEntity.isAlive()) return false;
        if ((this._cooldowns[index] ?? 0) > 0) return false;

        //1. 挂载 prefab 并按 duration 决定存活时间, step 展现技能
        this._spawnSkillPrefab(index, skill);

        //2.step 进入cooldown
        this._cooldowns[index] = skill.cooldown;

        //3.找敌人
        const targets = this._findTargets(skill);
        if (targets.length === 0 &&
            skill.range.type !== RangeType.CIRCLE &&
            skill.range.type !== RangeType.RECT) {
            return false;
        }
        //4.计算伤害，并实施
        const dmg = skill.damage > 0 ? skill.damage : this._combatEntity.attackPower;
        for (const target of targets) {
            this._combatEntity.attackTarget(target, dmg, skill.damageType);
        }

        //5. 调试
        if (this.openDebug) { this._debugShowTime = 0; this._skillDebugIndex = index; }
        Log.debug(MODULE, `${this.node.name} 释放技能[${index}] "${skill.name}"，命中 ${targets.length} 个目标`);
        return true;
    }

    public getCooldown(index: number): number {
        return Math.max(0, this._cooldowns[index] ?? 0);
    }

    public isReady(index: number): boolean {
        return this.getCooldown(index) <= 0;
    }

    // ========== 注册表挂载 / 释放 ==========

    /** 从 SkillRegistry 按 animIndex 挂载技能，返回挂载后的 slot index */
    public mountFromRegistry(animIndex: number): number {
        const config = SkillRegistry.instance.getConfig(animIndex);
        if (!config) { Log.error(MODULE, `SkillRegistry: animIndex ${animIndex} not found`); return -1; }
        const index = this.skills.length;
        this.skills.push(config);
        this._cooldowns.push(0);
        return index;
    }

    /** 释放指定 slot 的技能（移除配置及对应 prefab 节点） */
    public releaseSkill(index: number): void {
        if (index < 0 || index >= this.skills.length) return;
        this.skills.splice(index, 1);
        this._cooldowns.splice(index, 1);

        const node = this._prefabNodes.get(index);
        if (node) { node.destroy(); this._prefabNodes.delete(index); }

        // 重新映射 index > 移除位置的 prefab 节点
        const updated = new Map<number, Node>();
        this._prefabNodes.forEach((n, i) => updated.set(i > index ? i - 1 : i, n));
        this._prefabNodes = updated;
    }

    /** 实例化技能 prefab，duration > 0 时到期自动销毁 */
    private _spawnSkillPrefab(index: number, skill: SkillConfig): void {
        const prefab = SkillRegistry.instance.getPrefab(skill.animIndex);
        if (!prefab) return;

        // 销毁上一次同 slot 的残留节点
        const old = this._prefabNodes.get(index);
        if (old && old.isValid) old.destroy();

        const node = instantiate(prefab);
        // 不作为 player 的子节点，以避免跟随 player 旋转，直接挂载到场景中或指定的层级（这里使用 director.getScene() 作为父节点，或者 player 的父节点）
        node.setParent(this.node.parent);
        
        // 如果原本需要根据 player 的 scale 设置 scale
        const parent = this.node.parent;
        const localPos = parent!.getComponent(UITransform)?.convertToNodeSpaceAR(this.node.worldPosition);

        if (localPos) {
            localPos.x += this.facing * skill.castDistance;
            node.setPosition(localPos);
        }
        
        node.setScale(this.facing, 1);
        this._prefabNodes.set(index, node);
        
        const anim = node.getComponent(Animation);

        if (skill.duration > 0) {
            this.scheduleOnce(() => {
                Log.debug(this.MODULE_NAME, "destory prefeb.");
                if (node.isValid) node.destroy();
                this._prefabNodes.delete(index);
            }, skill.duration);
        }

        // const _SkillWithTargetDirection: SkillWithTargetOrDir = node.getComponent(SkillWithTargetOrDir);
        // if(_SkillWithTargetDirection) {
            // _SkillWithTargetDirection.moveDir = new Vec3(this.facing, 0 , 0);
        // }

       
    }

    // ========== 目标查找 ==========

    /** 计算技能中心点（世界坐标） */
    private _castCenter(skill: SkillConfig): Vec2 {
        const self = new Vec2(this.node.worldPosition.x, this.node.worldPosition.y);
        return new Vec2(self.x + this.facing * skill.castDistance, self.y);
    }

    private _findTargets(skill: SkillConfig): CombatEntity[] {
        const center = this._castCenter(skill);
        const range = skill.range;
        const all = this._getHostileEntities();

        Log.debug(this.MODULE_NAME, `center: ${center}`)
        switch (range.type) {
            case RangeType.CIRCLE:
                return all.filter(e => {
                    const ep = new Vec2(e.node.worldPosition.x, e.node.worldPosition.y);
                    Log.debug(this.MODULE_NAME, `center: ${center}, ep:${ep}, distance:${Vec2.distance(center, ep)}`);
                    return Vec2.distance(center, ep) <= range.radius;
                });

            case RangeType.RECT: {
                // 矩形以 center 为中心，沿 facing 方向，宽=width，高=height
                const hw = range.width / 2;
                const hh = range.height / 2;
                return all.filter(e => {
                    const ep = new Vec2(e.node.worldPosition.x, e.node.worldPosition.y);
                    // 转换到矩形局部空间（facing 为 x 轴正方向）
                    const dx = (ep.x - center.x) * this.facing;
                    const dy = ep.y - center.y;
                    return dx >= -hw && dx <= hw && Math.abs(dy) <= hh;
                });
            }

            case RangeType.SECTOR: {
                const halfAngle = range.angle / 2;
                return all.filter(e => {
                    const ep = new Vec2(e.node.worldPosition.x, e.node.worldPosition.y);
                    const dx = ep.x - center.x;
                    const dy = ep.y - center.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > range.radius) return false;
                    // 将 dx 转换到朝向空间（facing=-1 时翻转 x）
                    const angleDeg = Math.atan2(dy, dx * this.facing) * (180 / Math.PI);
                    return Math.abs(angleDeg) <= halfAngle;
                });
            }

            case RangeType.SINGLE: {
                let nearest: CombatEntity = null;
                let minDist = range.maxRange;
                for (const e of all) {
                    const ep = new Vec2(e.node.worldPosition.x, e.node.worldPosition.y);
                    const d = Vec2.distance(center, ep);
                    if (d < minDist) { minDist = d; nearest = e; }
                }
                return nearest ? [nearest] : [];
            }

            case RangeType.EMIT: {
                return [];
            }
        }
    }

    private _getHostileEntities(): CombatEntity[] {
        if (!this._combatEntity) return [];
        return EntityRegistry.instance.getAll().filter(
            e => e !== this._combatEntity && this._combatEntity.canDamageTarget(e)
        );
    }

    // ========== Debug 绘制 ==========

    private _createDebugDrawNode(): void {
        this._debugDrawNode = new Node('__SKILL_DEBUG_DRAW');
        this._debugDrawNode.layer = this.node.layer;
        this._graphics = this._debugDrawNode.addComponent(Graphics);
        this._graphics.lineWidth = 2;
        this.node.addChild(this._debugDrawNode);
        this._debugDrawNode.setPosition(0, 0, 0);
    }

    private _drawDebugRange(): void {
        if (!this._graphics) return;
        const skill = this.skills[this._skillDebugIndex];
        if (!skill) return;

        this._graphics.clear();

        // castCenter 相对于 self 的局部偏移（子节点坐标系）
        const offsetX = this.facing * skill.castDistance / this._scale.x;

        const g = this._graphics;
        const range = skill.range;

        switch (range.type) {
            case RangeType.CIRCLE:
                g.fillColor = DEBUG_COLORS.CIRCLE;
                g.circle(offsetX , 0, range.radius / this._scale.x);
                g.fill();
                break;

            case RangeType.RECT:
                g.fillColor = DEBUG_COLORS.RECT;
                // rect(x, y, w, h)：左下角坐标
                g.rect(offsetX - range.width / 2 * this._scale.x, - range.height / 2 * this._scale.y, range.width / this._scale.x, range.height / this._scale.y);
                g.fill();
                break;

            case RangeType.SECTOR:
                g.fillColor = DEBUG_COLORS.SECTOR;
                this._drawSector(g, offsetX, 0, range.radius/ this._scale.x, range.angle);
                g.fill();
                break;

            case RangeType.SINGLE:
                g.fillColor = DEBUG_COLORS.SINGLE;
                g.circle(offsetX, 0, range.maxRange / this._scale.x);
                g.fill();
                break;
        }
    }

    private _drawSector(g: Graphics, cx: number, cy: number, radius: number, angle: number): void {
        const half = (angle / 2) * Math.PI / 180;
        const step = 3 * Math.PI / 180;
        // facing=-1 时扇形朝左，旋转 180°
        const baseAngle = this.facing >= 0 ? 0 : Math.PI;

        g.moveTo(cx, cy);
        for (let a = -half; a <= half + 0.001; a += step) {
            const rad = baseAngle + a;
            g.lineTo(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius);
        }
        g.lineTo(cx, cy);
    }
}
