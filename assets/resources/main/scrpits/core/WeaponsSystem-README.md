# WeaponsSystem 武器系统使用说明

WeaponsSystem是一个完整的武器管理系统，基于WeaponType枚举，与Bullet组件深度整合，提供多种武器类型的支持。

## 系统架构

### 核心组件
1. **WeaponType.ts** - 武器类型定义和配置
2. **WeaponsSystem.ts** - 武器系统主控制器
3. **Bullet.ts** - 增强的子弹组件
4. **ActorController.ts** - 角色控制器（整合武器系统）

## 武器类型

### 支持的武器类型
- **BULLET_TYPE_NORMAL** - 普通子弹：基础单发射击
- **BULLET_TYPE_CANNON** - 加农炮：高伤害，爆炸效果，穿透力
- **BULLET_TYPE_MULTIPLE** - 多重射击：一次发射多发子弹，扇形散射
- **BULLET_TYPE_LASER** - 激光：高速，高穿透，持续伤害

### 武器配置属性
```typescript
interface WeaponConfig {
    type: WeaponType;          // 武器类型
    name: string;              // 武器名称
    damage: number;            // 基础伤害
    fireRate: number;          // 射击速度（每秒发射次数）
    bulletSpeed: number;       // 子弹速度
    bulletLifetime: number;    // 子弹生存时间
    range: number;             // 射程
    bulletCount: number;       // 每次发射子弹数量
    spreadAngle: number;       // 散射角度
    penetration: number;       // 穿透力
    explosionRadius: number;   // 爆炸半径
    energyCost: number;        // 能量消耗
    cooldown: number;          // 冷却时间
}
```

## 使用方法

### 1. 基本设置

#### 节点结构
```
ActorNode (挂载ActorController)
├── BirdPlayer
├── BirdGun (挂载WeaponsSystem)
│   └── GunTrickPoint (发射点)
```

#### 组件配置
```typescript
// WeaponsSystem组件配置
weaponsSystem.currentWeaponType = WeaponType.BULLET_TYPE_NORMAL;
weaponsSystem.bulletPrefabs = [normalBullet, cannonBullet, multipleBullet, laserBullet];
weaponsSystem.firePoint = gunTrickPoint;
weaponsSystem.autoFire = true;
weaponsSystem.currentEnergy = 100;
weaponsSystem.maxEnergy = 100;
weaponsSystem.energyRegenRate = 5;
```

### 2. 代码示例

#### 基本射击
```typescript
// 获取武器系统
const weaponsSystem = this.node.getComponent(WeaponsSystem);

// 手动射击
const targetPos = new Vec3(100, 0, 0);
weaponsSystem.fire(targetPos);

// 切换武器
weaponsSystem.switchWeapon(WeaponType.BULLET_TYPE_CANNON);

// 获取当前武器信息
const weaponInfo = weaponsSystem.getWeaponSystemInfo();
console.log(`当前武器: ${weaponInfo.currentWeapon}`);
console.log(`能量: ${weaponInfo.energy}/${weaponInfo.maxEnergy}`);
```

#### 通过ActorController使用
```typescript
// 获取角色控制器
const actor = this.node.getComponent(ActorController);

// 攻击目标
actor.performAttack(targetPosition);

// 切换武器
actor.switchWeapon(WeaponType.BULLET_TYPE_MULTIPLE);

// 获取武器信息
const actorInfo = actor.getActorInfo();
console.log('武器系统信息:', actorInfo.weaponSystem);
```

### 3. 子弹预制件设置

#### 创建子弹预制件
1. 创建子弹节点
2. 添加Sprite组件（视觉效果）
3. 添加Collider2D组件（碰撞检测）
4. 挂载Bullet组件
5. 配置Bullet组件属性

#### Bullet组件配置
```typescript
// 基础属性
bullet.damage = 25;
bullet.speed = 500;
bullet.lifetime = 3.0;
bullet.targetTags = ['Enemy'];

// 特殊属性
bullet.penetration = 2;        // 穿透力
bullet.explosionRadius = 50;   // 爆炸半径
bullet.isLaser = false;        // 是否为激光
```

## 武器特性详解

### 普通子弹 (NORMAL)
- 单发射击
- 命中后立即销毁
- 适合基础攻击

### 加农炮 (CANNON)
- 高伤害单发
- 爆炸效果（范围伤害）
- 具有穿透力
- 能量消耗高

### 多重射击 (MULTIPLE)
- 一次发射多发子弹
- 扇形散射模式
- 单发伤害较低
- 适合群体攻击

### 激光 (LASER)
- 高速射击
- 强穿透力
- 持续伤害
- 能量消耗中等

## 能量系统

### 能量管理
- 每种武器消耗不同能量
- 自动能量恢复
- 能量不足时无法射击
- 可配置恢复速度

### 能量配置
```typescript
// 设置能量属性
weaponsSystem.maxEnergy = 200;
weaponsSystem.currentEnergy = 200;
weaponsSystem.energyRegenRate = 10; // 每秒恢复10点能量
```

## 事件系统

### WeaponsSystem事件
```typescript
// 监听射击事件
weaponsSystem.node.on('weapon-fire', (event) => {
    console.log('武器射击:', event.detail);
});

// 监听武器切换事件
weaponsSystem.node.on('weapon-switch', (event) => {
    console.log('武器切换:', event.detail);
});
```

### Bullet事件
```typescript
// 监听子弹命中事件
bullet.node.on('bullet-hit', (event) => {
    console.log('子弹命中:', event.detail);
});

// 监听爆炸事件
bullet.node.on('bullet-explosion', (event) => {
    console.log('爆炸效果:', event.detail);
});
```

## 性能优化

### 对象池管理
- 每种武器类型独立的子弹池
- 预创建30个子弹实例
- 自动回收和重用
- 动态扩展池大小

### 最佳实践
1. 合理设置子弹生存时间
2. 控制同时存在的子弹数量
3. 使用合适的射击频率
4. 及时回收不需要的子弹

## 扩展开发

### 添加新武器类型
1. 在WeaponType枚举中添加新类型
2. 在DEFAULT_WEAPON_CONFIGS中添加配置
3. 在WeaponsSystem中添加对应的射击逻辑
4. 在Bullet中添加对应的伤害逻辑

### 自定义武器配置
```typescript
// 修改现有武器配置
weaponsSystem.setWeaponConfig(WeaponType.BULLET_TYPE_NORMAL, {
    damage: 50,
    fireRate: 5.0,
    bulletSpeed: 800
});

// 创建自定义配置
const customConfig: WeaponConfig = {
    type: WeaponType.BULLET_TYPE_LASER,
    name: "超级激光",
    damage: 100,
    fireRate: 10.0,
    // ... 其他属性
};
```

## 调试和监控

### 调试信息
```typescript
// 获取详细状态
const systemInfo = weaponsSystem.getWeaponSystemInfo();
console.log('武器系统状态:', systemInfo);

// 获取子弹信息
const bulletInfo = bullet.getBulletInfo();
console.log('子弹状态:', bulletInfo);
```

### 性能监控
- 监控活跃子弹数量
- 检查能量消耗情况
- 观察射击频率
- 跟踪对象池使用情况

## 注意事项

1. **预制件配置**: 确保每种武器类型都有对应的子弹预制件
2. **能量平衡**: 合理设置各武器的能量消耗
3. **性能考虑**: 避免同时存在过多子弹
4. **碰撞检测**: 正确配置子弹的碰撞器
5. **标签系统**: 使用一致的标签命名规范