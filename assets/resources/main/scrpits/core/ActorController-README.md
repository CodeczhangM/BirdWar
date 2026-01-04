# ActorController 使用说明

ActorController是一个角色控制器，现在完全基于WeaponsSystem来处理所有射击相关功能，提供角色初始化、生命管理等核心功能。

## 主要功能

### 1. 子节点初始化
- **BirdPlayer**: 鸟类玩家节点
- **BirdGun**: 鸟类武器节点  
- **GunTrickPoint**: 枪口发射点（子弹生成位置）
- **WeaponsSystem**: 武器系统组件（必需）

### 2. 武器系统集成
- 完全依赖WeaponsSystem处理所有射击逻辑
- 自动查找和配置WeaponsSystem组件
- 同步自动攻击状态
- 提供统一的攻击接口

### 3. 角色管理
- 生命值系统
- 角色标签系统
- 状态信息查询
- 死亡处理

## 使用方法

### 基本设置

1. **创建角色节点结构**
```
ActorNode (挂载ActorController)
├── BirdPlayer (角色模型)
├── BirdGun (挂载WeaponsSystem)
│   └── GunTrickPoint (发射点)
```

2. **配置ActorController组件**
```typescript
// 在编辑器中设置，或通过代码设置
actorController.maxHealth = 100;        // 最大生命值
actorController.actorTag = 'Player';    // 角色标签
actorController.autoAttack = true;      // 自动攻击
actorController.attackRange = 400;      // 攻击范围

// WeaponsSystem会自动被查找和配置
```

3. **WeaponsSystem配置**
- ActorController会自动查找WeaponsSystem组件
- 自动设置发射点为GunTrickPoint
- 自动同步拥有者标签和自动攻击状态

### 代码示例

```typescript
// 获取ActorController组件
const actor = this.node.getComponent(ActorController);

// 手动攻击指定位置
const targetPos = new Vec3(100, 0, 0);
actor.attackTarget(targetPos);

// 切换武器类型
actor.switchWeapon(WeaponType.BULLET_TYPE_CANNON);

// 获取当前武器类型
const weaponType = actor.getCurrentWeaponType();

// 获取角色状态（包含武器系统信息）
const info = actor.getActorInfo();
console.log(`角色生命: ${info.health}/${info.maxHealth}`);
console.log(`当前武器: ${info.weaponSystem?.currentWeapon}`);
console.log(`活跃子弹数: ${info.activeBullets}`);

// 对角色造成伤害
actor.takeDamage(30);

// 监听角色死亡事件
actor.node.on('actor-death', (actor) => {
    console.log('角色死亡:', actor.node.name);
});
```

## 属性配置

### 必需组件
- `weaponsSystem`: WeaponsSystem组件引用（自动查找）

### 子节点引用
- `birdPlayer`: BirdPlayer节点引用
- `birdGun`: BirdGun节点引用  
- `gunTrickPoint`: 枪口发射点节点引用

### 角色属性
- `maxHealth`: 最大生命值
- `actorTag`: 角色标签
- `autoAttack`: 是否自动攻击
- `attackRange`: 攻击范围

## 武器系统集成

### 自动初始化
ActorController会自动：
1. 查找WeaponsSystem组件
2. 设置发射点为GunTrickPoint
3. 同步拥有者标签
4. 同步自动攻击状态

### 武器控制
```typescript
// 通过ActorController控制武器
actor.switchWeapon(WeaponType.BULLET_TYPE_MULTIPLE);
actor.setAttackSpeed(2.0);  // 会同步到WeaponsSystem
actor.setAttackDamage(50);  // 会同步到WeaponsSystem

// 直接访问WeaponsSystem
const weaponsSystem = actor.weaponsSystem;
if (weaponsSystem) {
    weaponsSystem.currentEnergy = 100;
    weaponsSystem.maxEnergy = 200;
}
```

## 事件系统

### ActorController事件
- `actor-death`: 角色死亡时触发

### WeaponsSystem事件（通过weaponsSystem访问）
- `weapon-fire`: 武器射击时触发
- `weapon-switch`: 武器切换时触发

## 迁移指南

### 从传统ActorController迁移

1. **添加WeaponsSystem组件**
```typescript
// 在BirdGun节点上添加WeaponsSystem组件
const weaponsSystem = birdGun.addComponent(WeaponsSystem);
```

2. **配置武器预制件**
```typescript
// 设置不同武器类型的子弹预制件
weaponsSystem.bulletPrefabs = [
    normalBulletPrefab,    // BULLET_TYPE_NORMAL
    cannonBulletPrefab,    // BULLET_TYPE_CANNON
    multipleBulletPrefab,  // BULLET_TYPE_MULTIPLE
    laserBulletPrefab      // BULLET_TYPE_LASER
];
```

3. **配置武器系统**
```typescript
// 配置WeaponsSystem替代传统属性
weaponsSystem.currentWeaponType = WeaponType.BULLET_TYPE_NORMAL;
weaponsSystem.currentEnergy = 100;
weaponsSystem.maxEnergy = 100;
weaponsSystem.energyRegenRate = 5;
```

## 性能优化

### WeaponsSystem优势
- 专业的对象池管理
- 按武器类型分离的子弹池
- 更高效的子弹更新逻辑
- 能量系统管理

### 最佳实践
1. 确保WeaponsSystem正确配置
2. 使用合适的武器类型
3. 监控能量消耗
4. 合理设置攻击频率

## 故障排除

### 常见问题

**Q: 角色无法攻击**
A: 检查WeaponsSystem组件是否正确挂载和配置

**Q: 找不到WeaponsSystem**
A: 确保WeaponsSystem挂载在ActorController节点或BirdGun节点上

**Q: 攻击属性不生效**
A: 新版本中攻击属性由WeaponsSystem管理，请配置武器系统

**Q: 子弹不显示**
A: 检查WeaponsSystem的bulletPrefabs数组是否正确设置

### 调试信息
```typescript
// 获取详细状态信息
const actorInfo = actor.getActorInfo();
console.log('角色状态:', actorInfo);

// 检查武器系统状态
if (actorInfo.hasWeaponSystem) {
    console.log('武器系统信息:', actorInfo.weaponSystem);
} else {
    console.log('WeaponsSystem未找到');
}
```

## 注意事项

1. **必需组件**: WeaponsSystem是必需的，没有它ActorController无法正常工作
2. **节点结构**: 保持推荐的节点结构以确保自动查找功能正常
3. **性能**: 所有子弹管理现在由WeaponsSystem处理，性能更优
4. **扩展性**: 新功能应该通过WeaponsSystem添加，而不是ActorController
5. **配置**: 所有攻击相关配置现在通过WeaponsSystem进行