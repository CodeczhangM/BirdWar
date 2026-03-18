import { _decorator, Component, Label } from 'cc';
import { CombatEntity, EntityType, Faction, DamageInfo, DamageType } from './CombatSystem';
import { Log } from './Logger';

const { ccclass, property } = _decorator;

/**
 * 战斗系统使用示例
 * 演示如何使用 CombatEntity 组件
 */
@ccclass('CombatSystemExample')
export class CombatSystemExample extends Component {

    @property({ type: CombatEntity, tooltip: '战斗实体组件' })
    public combatEntity: CombatEntity = null;

    @property({ type: Label, tooltip: '生命值显示标签' })
    public healthLabel: Label = null;

    @property({ type: Label, tooltip: '状态显示标签' })
    public statusLabel: Label = null;

    private readonly MODULE_NAME = 'CombatSystemExample';

    start() {
        // 如果没有指定，��试从当前节点获取
        if (!this.combatEntity) {
            this.combatEntity = this.getComponent(CombatEntity);
        }

        if (!this.combatEntity) {
            Log.error(this.MODULE_NAME, '未找到 CombatEntity 组件');
            return;
        }

        // 订阅战斗事件
        this.combatEntity.onDamage(this._onDamage.bind(this));
        this.combatEntity.onHit(this._onHit.bind(this));
        this.combatEntity.onDeath(this._onDeath.bind(this));
        this.combatEntity.onCollect(this._onCollect.bind(this));

        // 更新 UI
        this._updateUI();

        Log.log(this.MODULE_NAME, '战斗系统示例初始化完成');
    }

    update(_dt: number) {
        this._updateUI();
    }

    // ========== 事件处理 ==========

    private _onDamage(damage: DamageInfo, target: CombatEntity) {
        const critText = damage.isCritical ? ' [暴击]' : '';
        Log.log(this.MODULE_NAME, `受到伤害: ${damage.amount}${critText} (来源: ${damage.source.node.name})`);
        
        // 可以在这里添加受伤特效、音效等
    }

    private _onHit(target: CombatEntity) {
        Log.log(this.MODULE_NAME, `命中目标: ${target.node.name}`);
        
        // 可以在这里添加命中特效、音效等
    }

    private _onDeath(killer: CombatEntity) {
        Log.log(this.MODULE_NAME, `死亡 (击杀者: ${killer?.node.name || '未知'})`);
        
        // 可以在这里添加死亡动画、掉落物品等
        this._playDeathAnimation();
    }

    private _onCollect(collector: CombatEntity) {
        Log.log(this.MODULE_NAME, `被收集 (收集者: ${collector.node.name})`);
        
        // 根据实体类型执行不同的收集效果
        switch (this.combatEntity.entityType) {
            case EntityType.REWARD:
                this._giveReward(collector);
                break;
            case EntityType.BUFF:
                this._applyBuff(collector);
                break;
            case EntityType.DEBUFF:
                this._applyDebuff(collector);
                break;
        }
    }

    // ========== UI 更新 ==========

    private _updateUI() {
        if (!this.combatEntity) return;

        // 更新生命值显示
        if (this.healthLabel) {
            const percent = (this.combatEntity.getHealthPercent() * 100).toFixed(0);
            this.healthLabel.string = `HP: ${this.combatEntity.currentHealth}/${this.combatEntity.maxHealth} (${percent}%)`;
        }

        // 更新状态显示
        if (this.statusLabel) {
            const status = this.combatEntity.isAlive() ? '存活' : '死亡';
            const type = EntityType[this.combatEntity.entityType];
            const faction = Faction[this.combatEntity.faction];
            this.statusLabel.string = `状态: ${status} | 类型: ${type} | 阵营: ${faction}`;
        }
    }

    // ========== 效果实现 ==========

    private _playDeathAnimation() {
        // 播放死亡动画
        Log.log(this.MODULE_NAME, '播放死亡动画');
        // 可以在这里调用 Spine 动画或其他效果
    }

    private _giveReward(collector: CombatEntity) {
        // 给予奖励
        Log.log(this.MODULE_NAME, `给予奖励给 ${collector.node.name}`);
        // 可以增加金币、经验等
    }

    private _applyBuff(target: CombatEntity) {
        // 应用增益效果
        Log.log(this.MODULE_NAME, `应用增益给 ${target.node.name}`);
        // 可以增加攻击力、速度等
        target.attackPower *= 1.5;
        
        // 一段时间后移除增益
        this.scheduleOnce(() => {
            target.attackPower /= 1.5;
            Log.log(this.MODULE_NAME, `增益效果结束`);
        }, 5);
    }

    private _applyDebuff(target: CombatEntity) {
        // 应用减益效果
        Log.log(this.MODULE_NAME, `应用减益给 ${target.node.name}`);
        // 可以降低攻击力、速度等
        target.attackPower *= 0.5;
        
        // 一段时间后移除减益
        this.scheduleOnce(() => {
            target.attackPower /= 0.5;
            Log.log(this.MODULE_NAME, `减益效果结束`);
        }, 5);
    }

    // ========== 公共接口 ==========

    /** 手动造成伤害 */
    public dealDamage(amount: number, type: DamageType = DamageType.PHYSICAL) {
        if (!this.combatEntity) return;

        const damage: DamageInfo = {
            amount,
            type,
            source: this.combatEntity
        };

        // 这里需要目标实体，实际使用时应该从碰撞或其他方式获取
        Log.log(this.MODULE_NAME, `准备造成 ${amount} 点 ${type} 伤害`);
    }

    /** 手动治疗 */
    public healSelf(amount: number) {
        if (!this.combatEntity) return;
        this.combatEntity.heal(amount);
        Log.log(this.MODULE_NAME, `治疗 ${amount} 点生命值`);
    }

    /** 设置无敌状态 */
    public setInvincible(invincible: boolean) {
        if (!this.combatEntity) return;
        this.combatEntity.invincible = invincible;
        Log.log(this.MODULE_NAME, `无敌状态: ${invincible}`);
    }
}
