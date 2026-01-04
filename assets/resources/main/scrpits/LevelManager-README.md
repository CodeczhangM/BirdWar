# LevelManager 系统文档

## 概述

LevelManager 是一个完整的关卡管理系统，专为植物大战僵尸风格的游戏设计。它提供了基于 JSON 的关卡数据管理、动态环境配置、资源加载和事件驱动的关卡控制功能。

## 核心特性

### 🎮 关卡数据管理
- **JSON 配置**: 使用 JSON 文件定义关卡数据，支持热更新
- **数据验证**: 自动验证关卡数据完整性和有效性
- **缓存系统**: 智能缓存机制，提高关卡加载性能
- **版本控制**: 支持关卡版本管理和兼容性检查

### 🌍 环境系统
- **动态环境**: 支持天气、时间、光照等环境参数
- **视差背景**: 多层视差背景系统，增强视觉效果
- **粒子效果**: 可配置的环境粒子效果
- **音效管理**: 背景音乐和环境音效的统一管理

### 🎯 游戏机制
- **目标系统**: 主要目标和次要目标的完整管理
- **敌人配置**: 波次敌人、Boss 敌人的详细配置
- **资源管理**: 阳光、植物成本、特殊道具的管理
- **特殊单元格**: 支持生成点、目标点、障碍物等特殊网格

### 🔧 扩展性
- **自定义数据**: 支持任意自定义数据扩展
- **预设对象**: 可配置的预设游戏对象
- **成就系统**: 内置成就和解锁条件支持
- **教程系统**: 完整的新手教程配置

## 快速开始

### 1. 基础设置

```typescript
import { LevelManager } from './LevelManager';
import { GridManager } from './GridManager';

@ccclass('GameController')
export class GameController extends Component {
    @property(LevelManager)
    levelManager: LevelManager = null;
    
    @property(GridManager)
    gridManager: GridManager = null;
    
    start() {
        // 设置网格管理器
        this.levelManager.gridManager = this.gridManager;
        
        // 加载第一关
        this.levelManager.loadLevel('level_1_1');
    }
}
```

### 2. 监听关卡事件

```typescript
import { EventManagerInstance } from './EventManager';

// 监听关卡加载完成
EventManagerInstance.on('level-load-complete', (data) => {
    const levelData = data.levelData;
    console.log(`关卡加载完成: ${levelData.name}`);
    
    // 初始化游戏逻辑
    this.initializeGameplay(levelData);
});

// 监听关卡重置
EventManagerInstance.on('level-reset', (data) => {
    console.log(`关卡重置: ${data.levelId}`);
    this.resetGameState();
});
```

### 3. 创建关卡数据

```json
{
  "id": "level_1_1",
  "name": "阳光海滩",
  "description": "第一关：在阳光明媚的海滩上开始你的植物大战僵尸之旅！",
  "difficulty": 1,
  "version": "1.0.0",
  "author": "GameDeveloper",
  "tags": ["tutorial", "easy", "beach"],
  
  "grid": {
    "rows": 5,
    "cols": 9,
    "cellWidth": 100,
    "cellHeight": 120,
    "startPosition": { "x": -400, "y": 240, "z": 0 },
    "showGrid": true
  },
  
  "resources": {
    "startingSun": 150,
    "availablePlants": ["sunflower", "peashooter", "wallnut"],
    "plantCosts": {
      "sunflower": 50,
      "peashooter": 100,
      "wallnut": 50
    }
  }
}
```

## 详细配置

### 关卡基础信息

```typescript
interface LevelData {
    id: string;              // 关卡唯一标识
    name: string;            // 关卡名称
    description: string;     // 关卡描述
    difficulty: number;      // 难度等级 (1-10)
    version: string;         // 版本号
    author: string;          // 作者
    tags: string[];          // 标签
}
```

### 网格配置

```typescript
interface LevelGridConfig {
    rows: number;            // 网格行数
    cols: number;            // 网格列数
    cellWidth: number;       // 单元格宽度
    cellHeight: number;      // 单元格高度
    startPosition: Vec3;     // 起始位置
    showGrid: boolean;       // 是否显示网格线
    gridColor: Color;        // 网格线颜色
    highlightColor: Color;   // 高亮颜色
}
```

### 环境配置

```typescript
interface LevelEnvironment {
    weather: string;         // 天气类型
    timeOfDay: string;       // 时间段
    temperature: number;     // 温度
    windSpeed: number;       // 风速
    visibility: number;      // 可见度
    ambientLight: Color;     // 环境光
    fogColor: Color;         // 雾颜色
    fogDensity: number;      // 雾密度
    soundscape: string;      // 环境音效
    particles: string[];     // 粒子效果
    customEffects: any[];    // 自定义效果
}
```

### 背景配置

```typescript
interface LevelBackground {
    backgroundImage: string;     // 背景图片
    backgroundMusic: string;     // 背景音乐
    parallaxLayers: Array<{      // 视差层
        image: string;
        speed: number;
        depth: number;
    }>;
    skybox: string;             // 天空盒
    groundTexture: string;      // 地面纹理
    decorations: Array<{        // 装饰物
        sprite: string;
        position: Vec2;
        scale: number;
        rotation: number;
    }>;
}
```

### 目标配置

```typescript
interface LevelObjectives {
    primary: Array<{            // 主要目标
        type: string;
        description: string;
        target: number;
        current: number;
        completed: boolean;
    }>;
    secondary: Array<{          // 次要目标
        type: string;
        description: string;
        target: number;
        current: number;
        completed: boolean;
        reward: any;
    }>;
    timeLimit: number;          // 时间限制
    scoreTarget: number;        // 分数目标
}
```

### 敌人配置

```typescript
interface LevelEnemies {
    waves: Array<{              // 敌人波次
        waveNumber: number;
        delay: number;
        enemies: Array<{
            type: string;
            count: number;
            spawnRow: number;
            spawnDelay: number;
            health: number;
            speed: number;
            damage: number;
            specialAbilities: string[];
        }>;
    }>;
    bossEnemies: Array<{        // Boss敌人
        type: string;
        appearTime: number;
        health: number;
        phases: any[];
    }>;
}
```

### 资源配置

```typescript
interface LevelResources {
    startingSun: number;                              // 初始阳光
    sunGenerationRate: number;                        // 阳光生成速率
    availablePlants: string[];                        // 可用植物
    plantCosts: { [plantType: string]: number };     // 植物成本
    specialItems: Array<{                            // 特殊道具
        type: string;
        count: number;
        cost: number;
    }>;
}
```

## API 参考

### 核心方法

#### loadLevel(levelId: string): Promise<boolean>
加载指定关卡

```typescript
const success = await levelManager.loadLevel('level_1_1');
if (success) {
    console.log('关卡加载成功');
}
```

#### getCurrentLevelData(): LevelData | null
获取当前关卡数据

```typescript
const levelData = levelManager.getCurrentLevelData();
if (levelData) {
    console.log(`当前关卡: ${levelData.name}`);
}
```

#### reloadCurrentLevel(): Promise<boolean>
重新加载当前关卡

```typescript
await levelManager.reloadCurrentLevel();
```

#### resetLevel(): void
重置关卡状态

```typescript
levelManager.resetLevel();
```

#### preloadLevel(levelId: string): Promise<boolean>
预加载关卡数据

```typescript
await levelManager.preloadLevel('level_1_2');
```

### 缓存管理

#### getCacheStatus(): { [levelId: string]: boolean }
获取缓存状态

```typescript
const cacheStatus = levelManager.getCacheStatus();
console.log('缓存状态:', cacheStatus);
```

#### clearLevelCache(levelId?: string): void
清除关卡缓存

```typescript
// 清除特定关卡缓存
levelManager.clearLevelCache('level_1_1');

// 清除所有缓存
levelManager.clearLevelCache();
```

### 信息获取

#### getLevelInfo(levelId?: string): any
获取关卡信息

```typescript
// 获取当前关卡信息
const currentInfo = levelManager.getLevelInfo();

// 获取指定关卡信息
const specificInfo = levelManager.getLevelInfo('level_1_2');
```

#### debugInfo(): void
输出调试信息

```typescript
levelManager.debugInfo();
```

## 事件系统

### 关卡事件

| 事件名称 | 触发时机 | 数据参数 |
|---------|---------|---------|
| `level-load-start` | 关卡开始加载 | `{ levelId: string }` |
| `level-load-complete` | 关卡加载完成 | `{ levelId: string, levelData: LevelData }` |
| `level-load-failed` | 关卡加载失败 | `{ levelId: string, error: string }` |
| `level-reset` | 关卡重置 | `{ levelId: string, levelData: LevelData }` |

### 事件监听示例

```typescript
// 监听关卡加载开始
EventManagerInstance.on('level-load-start', (data) => {
    showLoadingScreen(data.levelId);
});

// 监听关卡加载完成
EventManagerInstance.on('level-load-complete', (data) => {
    hideLoadingScreen();
    initializeLevel(data.levelData);
});

// 监听关卡加载失败
EventManagerInstance.on('level-load-failed', (data) => {
    showErrorMessage(`关卡加载失败: ${data.error}`);
});
```

## 高级用法

### 自定义关卡验证

```typescript
class CustomLevelManager extends LevelManager {
    protected validateLevelData(levelData: LevelData): boolean {
        // 调用基础验证
        if (!super.validateLevelData(levelData)) {
            return false;
        }
        
        // 添加自定义验证逻辑
        if (levelData.customData?.requiredVersion) {
            const requiredVersion = levelData.customData.requiredVersion;
            if (!this.checkVersionCompatibility(requiredVersion)) {
                Log.error('LevelManager', `版本不兼容: 需要 ${requiredVersion}`);
                return false;
            }
        }
        
        return true;
    }
    
    private checkVersionCompatibility(requiredVersion: string): boolean {
        // 实现版本兼容性检查
        return true;
    }
}
```

### 动态关卡生成

```typescript
class ProceduralLevelManager extends LevelManager {
    public async generateRandomLevel(difficulty: number): Promise<LevelData> {
        const levelData: LevelData = {
            id: `random_${Date.now()}`,
            name: `随机关卡 - 难度${difficulty}`,
            description: '程序生成的随机关卡',
            difficulty: difficulty,
            version: '1.0.0',
            author: 'ProceduralGenerator',
            tags: ['random', 'procedural'],
            
            // 根据难度生成网格配置
            grid: this.generateGridConfig(difficulty),
            
            // 生成环境配置
            environment: this.generateEnvironment(difficulty),
            
            // 生成其他配置...
            background: this.generateBackground(),
            objectives: this.generateObjectives(difficulty),
            enemies: this.generateEnemies(difficulty),
            resources: this.generateResources(difficulty),
            
            specialCells: [],
            presetObjects: [],
            customData: {}
        };
        
        return levelData;
    }
}
```

### 关卡进度保存

```typescript
class SaveableLevelManager extends LevelManager {
    public saveProgress(): void {
        const levelData = this.getCurrentLevelData();
        if (!levelData) return;
        
        const progressData = {
            levelId: levelData.id,
            objectives: levelData.objectives,
            timestamp: Date.now(),
            customData: levelData.customData
        };
        
        // 保存到本地存储
        localStorage.setItem('levelProgress', JSON.stringify(progressData));
    }
    
    public loadProgress(): boolean {
        const savedData = localStorage.getItem('levelProgress');
        if (!savedData) return false;
        
        try {
            const progressData = JSON.parse(savedData);
            
            // 恢复关卡进度
            return this.restoreProgress(progressData);
        } catch (error) {
            Log.error('SaveableLevelManager', '进度加载失败', error);
            return false;
        }
    }
}
```

## 性能优化

### 1. 资源预加载
```typescript
// 预加载下一关资源
const nextLevelId = this.getNextLevelId();
if (nextLevelId) {
    levelManager.preloadLevel(nextLevelId);
}
```

### 2. 缓存管理
```typescript
// 定期清理不需要的缓存
setInterval(() => {
    const cacheStatus = levelManager.getCacheStatus();
    const currentLevel = levelManager.currentLevelId;
    
    for (const levelId in cacheStatus) {
        if (levelId !== currentLevel && this.shouldClearCache(levelId)) {
            levelManager.clearLevelCache(levelId);
        }
    }
}, 60000); // 每分钟检查一次
```

### 3. 异步加载
```typescript
// 使用异步加载避免阻塞
async loadLevelWithProgress(levelId: string) {
    const progressCallback = (progress: number) => {
        this.updateLoadingBar(progress);
    };
    
    const success = await levelManager.loadLevelAsync(levelId, progressCallback);
    return success;
}
```

## 故障排除

### 常见问题

1. **关卡加载失败**
   - 检查 JSON 文件路径是否正确
   - 验证 JSON 格式是否有效
   - 确认资源文件是否存在

2. **网格配置错误**
   - 检查 GridManager 是否正确设置
   - 验证网格尺寸参数是否合理
   - 确认起始位置是否在有效范围内

3. **资源加载问题**
   - 检查 ResourceLoader 是否正确初始化
   - 验证资源路径是否正确
   - 确认 bundle 名称是否匹配

### 调试技巧

```typescript
// 启用详细日志
levelManager.enableDebug = true;

// 输出调试信息
levelManager.debugInfo();

// 检查缓存状态
console.log('缓存状态:', levelManager.getCacheStatus());

// 验证关卡数据
const levelData = levelManager.getCurrentLevelData();
if (levelData) {
    console.log('关卡验证:', this.validateLevelData(levelData));
}
```

## 最佳实践

### 1. 关卡设计原则
- **渐进式难度**: 确保难度曲线平滑上升
- **多样化目标**: 提供不同类型的挑战目标
- **平衡性**: 保持游戏的公平性和挑战性
- **可扩展性**: 预留扩展空间，支持未来功能

### 2. 性能考虑
- **资源优化**: 合理使用资源预加载和缓存
- **内存管理**: 及时清理不需要的资源
- **异步操作**: 避免阻塞主线程
- **批量处理**: 合并相似的操作

### 3. 代码组织
- **模块化**: 将不同功能分离到独立模块
- **接口设计**: 使用清晰的接口定义
- **错误处理**: 完善的错误处理和恢复机制
- **文档维护**: 保持代码和文档的同步更新

## 扩展示例

查看 `LevelManagerExample.ts` 文件获取完整的使用示例，包括：
- 基础关卡加载和管理
- 事件监听和处理
- UI 集成和更新
- 调试和测试功能

## 相关系统

- **GridManager**: 网格管理系统
- **ResourceLoader**: 资源加载系统
- **EventManager**: 事件管理系统
- **Logger**: 日志系统

## 版本历史

- **v1.0.0**: 初始版本，基础关卡管理功能
- 支持 JSON 配置的关卡数据
- 完整的环境和背景系统
- 事件驱动的关卡控制
- 缓存和性能优化

---

*本文档持续更新中，如有问题请参考示例代码或联系开发团队。*