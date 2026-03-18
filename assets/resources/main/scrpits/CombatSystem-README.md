# 战斗系统 (Combat System)

一个完整的、解耦的战斗系统，支持多种实体类型、阵营系统和自动碰撞检测。

## 核心特性

### 1. 实体类型 (EntityType)
- **PLAYER** - 主角
- **ENEMY** - 敌人
- **BULLET** - 子弹
- **REWARD** - 奖励
- **BUFF** - 增益
- **DEBUFF** - 减益
- **NEUTRAL** - 中立
- **OBSTACLE** - 障碍物

### 2. 阵营系统 (Faction)
- **PLAYER** - 玩家阵营
- **ENEMY** - 敌人阵营
- **NEUTRAL** - 中立阵营

### 3. 伤害类型 (DamageType)
- **PHYSICAL** - 物理伤害（受防御力影响）
- **MAGICAL** - 魔法伤害
- **TRUE** - 真实伤害
- **HEAL** - 治疗

## 使用方法

### 基础设置

1. **添加 CombatEntity 组件**
   ```typescript
   // 在 Cocos Creator 编辑器中：
   // 1. 选择节点
   // 2. 添加组件 -> 自定义组件 -> CombatEntity
   // 3. 在 Inspector 中配置属性
   ```

2. **配置实体属性**
   ```typescript
   // Inspector 配置示例：
   Entity Type: PLAYER
   Faction: PLAYER
   Max Health: 100
   Attack Power: 10
   Defense: 5
   Critical Rate: 0.2
   Critical Multiplier: 2
   ```

3. **添加 Collider2D 组件**
   - CombatEntity 需要 Collider2D 组件才能检测碰撞
   - 确保物理系统已启用

### 代码示例

#### ��建玩家角色
```typescript
// 在节点上添加 CombatEntity 组件
const player = playerNode.addComponent(CombatEntity);
player.entityType = EntityType.PLAYER;
player.faction = Faction.PLAYER;
player.maxHealth = 100;
player.attackPower = 15;
player.defense = 5;

// 订阅事件
player.onDamage((damage, target) => {
    console.log(`受到 ${damage.amount} 点伤害`);
});

player.onDeath((killer) => {
    console.log('玩家死亡');
    // 显示游戏结束界面
});
```

#### 创建敌人
```typescript
const enemy = enemyNode.addComponent(CombatEntity);
enemy.entityType = EntityType.ENEMY;
enemy.faction = Faction.ENEMY;
enemy.maxHealth = 50;
enemy.attackPower = 8;

enemy.onDeath((killer) => {
    // 掉落奖励
    this.spawnReward(enemy.node.position);
});
```

#### 创建子弹
```typescript
const bullet = bulletNode.addComponent(CombatEntity);
bullet.entityType = EntityType.BULLET;
bullet.faction = Faction.PLAYER; // 玩家子弹
bullet.attackPower = 20;

bullet.onHit((target) => {
    // 命中后销毁子弹
    bullet.node.destroy();
});
```

#### 创建奖励
```typescript
const reward = rewardNode.addComponent(CombatEntity);
reward.entityType = EntityType.REWARD;

reward.onCollect((collector) => {
    // 给玩家加分
    if (collector.entityType === EntityType.PLAYER) {
        this.addScore(100);
    }
});
```

#### 创建增益道具
```typescript
const buff = buffNode.addComponent(CombatEntity);
buff.entityType = EntityType.BUFF;

buff.onCollect((collector) => {
    // 增加攻击力
    collector.attackPower *= 1.5;
    
    // 5秒后恢复
    this.scheduleOnce(() => {
        collector.attackPower /= 1.5;
    }, 5);
});
```

### 自定义碰撞规则

如果预设规则不满足需求，可以使用自定义规则：

```typescript
const entity = node.getComponent(CombatEntity);

// 方式1：在 Inspector 中启用 "Use Custom Rule"
entity.useCustomRule = true;
entity.customCanCollideWith = EntityType.PLAYER | EntityType.ENEMY;
entity.customCanDamage = EntityType.ENEMY;
entity.customCanBeDamagedBy = EntityType.BULLET;

// 方式2：通过代码设置
entity.setCollisionRule({
    canCollideWith: EntityType.PLAYER | EntityType.ENEMY,
    canDamage: EntityType.ENEMY,
    canBeDamagedBy: EntityType.BULLET
});
```

### 手动造成伤害

```typescript
const attacker = attackerNode.getComponent(CombatEntity);
const target = targetNode.getComponent(CombatEntity);

const damage: DamageInfo = {
    amount: 50,
    type: DamageType.PHYSICAL,
    source: attacker,
    isCritical: false
};

target.takeDamage(damage);
```

### 治疗

```typescript
const entity = node.getComponent(CombatEntity);
entity.heal(30); // 恢复 30 点生命值
```

### 检查关系

```typescript
const entity1 = node1.getComponent(CombatEntity);
const entity2 = node2.getComponent(CombatEntity);

// 是否敌对
if (entity1.isHostile(entity2)) {
    console.log('敌对关系');
}

// 是否友军
if (entity1.isFriendly(entity2)) {
    console.log('友军关系');
}
```

## 预设碰撞规则

系统提供了以下预设规则：

### 玩家 (PLAYER)
- 可碰撞：敌人、子弹、奖励、增益、减益、障碍物
- 可伤害：敌人
- 可被伤害：敌人、子弹

### 敌人 (ENEMY)
- 可碰撞：玩家、子弹、障碍物
- 可伤害：玩家
- 可被伤害：玩家、子弹

### 玩家子弹 (PLAYER_BULLET)
- 可碰撞：敌人、障碍物
- 可伤害：敌人
- 不可被伤害

### 敌人子弹 (ENEMY_BULLET)
- 可碰撞：玩家、障碍物
- 可伤害：玩家
- 不可被伤害

### 奖励 (REWARD)
- 可碰撞：玩家
- 不造成伤害
- 不可被伤害

### 增益 (BUFF)
- 可碰撞：玩家
- 不造成伤害
- 不可被伤害

### 减益 (DEBUFF)
- 可碰撞：玩家、敌人
- 不造成伤害
- 不可被伤害

### 障碍物 (OBSTACLE)
- 可碰撞：玩家、敌人、子弹
- 不造成伤害
- 不可被伤害

## 事件系统

### 可订阅的事件

```typescript
const entity = node.getComponent(CombatEntity);

// 受伤事件
entity.onDamage((damage: DamageInfo, target: CombatEntity) => {
    console.log(`受到 ${damage.amount} 点伤害`);
    if (damage.isCritical) {
        console.log('暴击！');
    }
});

// 碰撞事件
entity.onHit((target: CombatEntity) => {
    console.log(`命中 ${target.node.name}`);
});

// 死亡事件
entity.onDeath((killer: CombatEntity) => {
    console.log(`被 ${killer.node.name} 击杀`);
});

// 收集事件（仅奖励、增益、减益）
entity.onCollect((collector: CombatEntity) => {
    console.log(`被 ${collector.node.name} 收集`);
});
```

## 高级功能

### 无敌状态
```typescript
entity.invincible = true; // 开启无敌
entity.invincible = false; // 关闭无敌
```

### 暴击系统
```typescript
entity.criticalRate = 0.3; // 30% 暴击率
entity.criticalMultiplier = 2.5; // 暴击伤害 2.5 倍
```

### 生命值查询
```typescript
const isAlive = entity.isAlive();
const healthPercent = entity.getHealthPercent(); // 0-1
const currentHP = entity.currentHealth;
const maxHP = entity.maxHealth;
```

## 最佳实践

1. **使用预设规则**：大多数情况下，预设规则已经足够
2. **订阅事件**：通过事件系统实现游戏逻辑，保持解耦
3. **合理设置阵营**：确保阵营设置正确，避免友军误伤
4. **添加 Collider2D**：确保节点有碰撞器组件
5. **启用物理系统**：在项目设置中启用 2D 物理引擎
6. **调试日志**：开发时启用 `enableDebugLog` 查看详细信息

## 注意事项

1. 必须添加 Collider2D 组件才能检测碰撞
2. 确保物理系统已启用
3. 子弹等实体建议在命中后手动销毁
4. 奖励、增益、减益会在收集后自动销毁
5. 死亡实体会在下一帧自动销毁（可在回调中阻止）

## 示例场景设置

```
场景结构：
├── Player (CombatEntity + Collider2D)
│   └── 类型: PLAYER, 阵营: PLAYER
├── Enemy (CombatEntity + Collider2D)
│   └── 类型: ENEMY, 阵营: ENEMY
├── Bullet (CombatEntity + Collider2D)
│   └── 类型: BULLET, 阵营: PLAYER
├── Reward (CombatEntity + Collider2D)
│   └── 类型: REWARD
└── Buff (CombatEntity + Collider2D)
    └── 类型: BUFF
```

## 扩展建议

1. **添加特效系统**：在事件回调中播放粒子、动画
2. **音效系统**：在受伤、死亡时播放音效
3. **伤害数字**：显示飘字效果
4. **状态系统**：实现中毒、冰冻等状态
5. **技能系统**：结合 InputManager 实现技能释放
