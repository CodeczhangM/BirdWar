# 敌人生成器 (Enemy Spawner)

一个功能完整的敌人生成系统，支持自动加载预制体、多种生成模式和位置策略。

## 核心特性

### 1. 生成模式 (SpawnMode)
- **MANUAL** - 手动生成（通过代码调用）
- **AUTO_INTERVAL** - 自动间隔生成（按固定时间间隔）
- **AUTO_WAVE** - 波次生成（按波次配置生��）
- **AUTO_COUNT** - 保持数量生成（维持固定数量的敌人）

### 2. 生成位置类型 (SpawnPositionType)
- **FIXED** - 固定位置（生成器节点位置）
- **RANDOM_AREA** - 区域内随机（矩形区域）
- **CIRCLE** - 圆形边缘（圆周上随机点）
- **PATH** - 路径点（从预设点列表中随机选择）

### 3. 自动资源加载
- 自动加载指定文件夹下的所有敌人预制体
- 支持权重系统，控制不同敌人的生成概率
- 自动配置 CombatEntity 组件

## 使用方法

### 基础设置

1. **创建敌人预制体文件夹**
   ```
   assets/resources/enemies/
   ├── enemy1.prefab
   ├── enemy2.prefab
   └── enemy3.prefab
   ```

2. **添加 EnemySpawner 组件**
   ```typescript
   // 在 Cocos Creator 编辑器中：
   // 1. 创建空节点
   // 2. 添加组件 -> 自定义组件 -> EnemySpawner
   // 3. 配置属性
   ```

3. **配置 Inspector 属性**
   ```
   Enemy Folder Path: enemies
   Spawn Mode: AUTO_INTERVAL
   Spawn Position Type: RANDOM_AREA
   Auto Spawn Interval: 2
   Spawn Area Width: 500
   Spawn Area Height: 500
   ```

### 代码示例

#### 基础使用
```typescript
// 获取生成器
const spawner = node.getComponent(EnemySpawner);

// 手动生成一个敌人
spawner.spawnRandomEnemy();

// 手动生成多个敌人
spawner.spawnEnemies(5);

// 生成指定类型的敌人
spawner.spawnEnemyByIndex(0); // 生成第一种敌人
```

#### 自动生成控制
```typescript
// 开始自动生成
spawner.startAutoSpawn();

// 停止自动生成
spawner.stopAutoSpawn();

// 清除所有敌人
spawner.clearAllEnemies();
```

#### 波次生成
```typescript
const waveConfig: WaveConfig = {
    waveNumber: 1,
    spawnCount: 10,         // ���成 10 个敌人
    spawnInterval: 0.5,     // 每 0.5 秒生成一个
    enemyTypes: [0, 1, 2]   // 循环使用这些类型
};

spawner.spawnWave(waveConfig);
```

#### 自定义敌人配置
```typescript
// 修改已加载的敌人配置
spawner.setEnemyConfig(0, {
    weight: 3,          // 3倍生成概率
    maxHealth: 150,     // 更高生命值
    attackPower: 25,    // 更高攻击力
    moveSpeed: 120      // 更快速度
});

// 添加新的敌人配置
spawner.addEnemyConfig({
    name: 'Boss',
    prefab: bossPrefab,
    weight: 0.5,        // 较低生成概率
    maxHealth: 500,
    attackPower: 50,
    moveSpeed: 80
});
```

#### 自定义生成位置
```typescript
// 在指定位置生成
const position = new Vec3(100, 200, 0);
spawner.spawnEnemy(config, position);

// 使用路径点生成
spawner.spawnPositionType = SpawnPositionType.PATH;
spawner.spawnPathPoints = [
    new Vec3(0, 300, 0),
    new Vec3(300, 0, 0),
    new Vec3(0, -300, 0),
    new Vec3(-300, 0, 0)
];
```

#### 查询状态
```typescript
// 获取存活敌人数量
const count = spawner.getAliveEnemyCount();

// 获取所有存活敌人节点
const enemies = spawner.getAliveEnemies();

// 遍历所有敌人
for (const enemy of enemies) {
    console.log(enemy.name);
}

// 获取当前波次
const wave = spawner.getCurrentWave();

// 检查是否加载完成
if (spawner.isLoaded()) {
    console.log('资源加载完成');
}
```

## 生成模式详解

### 1. 手动模式 (MANUAL)
```typescript
spawner.spawnMode = SpawnMode.MANUAL;

// 需要手动调用生成方法
spawner.spawnRandomEnemy();
spawner.spawnEnemies(3);
```

### 2. 自动间隔模式 (AUTO_INTERVAL)
```typescript
spawner.spawnMode = SpawnMode.AUTO_INTERVAL;
spawner.autoSpawnInterval = 2; // 每 2 秒生成一个

// 自动运行，无需额外代码
```

### 3. 波次模式 (AUTO_WAVE)
```typescript
spawner.spawnMode = SpawnMode.AUTO_WAVE;

// 需要手动触发波次
const wave1: WaveConfig = {
    waveNumber: 1,
    spawnCount: 5,
    spawnInterval: 1,
    enemyTypes: [0, 1]
};
spawner.spawnWave(wave1);
```

### 4. 保持数量模式 (AUTO_COUNT)
```typescript
spawner.spawnMode = SpawnMode.AUTO_COUNT;
spawner.maintainEnemyCount = 10; // 始终保持 10 个敌人

// 自动运行，敌人死亡后会自动补充
```

## 生成位置详解

### 1. 固定位置 (FIXED)
```typescript
spawner.spawnPositionType = SpawnPositionType.FIXED;
// 所有敌人在生成器节点位置生成
```

### 2. 随机区域 (RANDOM_AREA)
```typescript
spawner.spawnPositionType = SpawnPositionType.RANDOM_AREA;
spawner.spawnAreaWidth = 800;
spawner.spawnAreaHeight = 600;
// 在矩形区域内随机生成
```

### 3. 圆形边缘 (CIRCLE)
```typescript
spawner.spawnPositionType = SpawnPositionType.CIRCLE;
spawner.spawnCircleRadius = 400;
// 在圆周上随机生成
```

### 4. 路径点 (PATH)
```typescript
spawner.spawnPositionType = SpawnPositionType.PATH;
spawner.spawnPathPoints = [
    new Vec3(0, 300, 0),
    new Vec3(300, 0, 0),
    new Vec3(0, -300, 0)
];
// 从路径点中随机选择
```

## 高级功能

### 权重系统
```typescript
// 设置不同敌人的生成权重
spawner.setEnemyConfig(0, { weight: 5 });  // 普通敌人，高权重
spawner.setEnemyConfig(1, { weight: 2 });  // 精英敌人，中权重
spawner.setEnemyConfig(2, { weight: 0.5 }); // Boss，低权重
```

### 动态配置
```typescript
// 根据游戏进度调整敌人属性
const difficulty = this.getCurrentDifficulty();
spawner.setEnemyConfig(0, {
    maxHealth: 50 * difficulty,
    attackPower: 10 * difficulty
});
```

### 事件监听
```typescript
// 监听敌人死亡（通过 CombatEntity）
const enemies = spawner.getAliveEnemies();
for (const enemy of enemies) {
    const combat = enemy.getComponent(CombatEntity);
    combat.onDeath((killer) => {
        console.log('敌人被击杀');
        // 掉落奖励、增加分数等
    });
}
```

## 完整示例

### 创建关卡生成器
```typescript
@ccclass('LevelManager')
export class LevelManager extends Component {
    @property(EnemySpawner)
    spawner: EnemySpawner = null;

    private currentWave: number = 0;

    start() {
        this.startNextWave();
    }

    startNextWave() {
        this.currentWave++;
        
        const waveConfig: WaveConfig = {
            waveNumber: this.currentWave,
            spawnCount: 5 + this.currentWave * 2,  // 每波增加敌人
            spawnInterval: Math.max(0.5, 2 - this.currentWave * 0.1),
            enemyTypes: [0, 1, 2]
        };

        this.spawner.spawnWave(waveConfig);

        // 检查波次完成
        this.schedule(() => {
            if (this.spawner.getAliveEnemyCount() === 0) {
                this.onWaveComplete();
            }
        }, 1);
    }

    onWaveComplete() {
        console.log(`波次 ${this.currentWave} 完成`);
        // 等待 3 秒后开始下一波
        this.scheduleOnce(() => {
            this.startNextWave();
        }, 3);
    }
}
```

## 最佳实践

1. **预制体准备**：确保敌人预制体包含 CombatEntity 和 Collider2D 组件
2. **文件夹组织**：将敌人预制体放在 resources 下的专门文件夹
3. **权重平衡**：合理设置权重，控制敌人出现频率
4. **性能优化**：使用对象池管理敌人实例（可扩展）
5. **调试模式**：开发时启用 enableDebugLog 查看生成信息

## 注意事项

1. 敌人预制体必须放在 resources 目录下
2. 预制体应包含 CombatEntity 组件
3. 生成器会自动设置敌人的 entityType 和 faction
4. 敌人死亡后会自动从跟踪列表中移除
5. 使用 AUTO_COUNT 模式时注意性能影响

## 扩展建议

1. **对象池**：实现敌人对象池，提高性能
2. **AI 系统**：为生成的敌人添加 AI 组件
3. **难度系统**：根据游戏进度动态调整敌人属性
4. **特殊事件**：在特定条件下生成特殊敌人
5. **生成特效**：添加生成动画和特效
