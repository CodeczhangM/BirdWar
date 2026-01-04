# PostProcessEnv 环境后处理组件

## 概述

PostProcessEnv 是一个用于控制环境后处理效果的组件，可以实时调整阳光暖度、雾密度、阳光强度等环境参数，为游戏场景提供丰富的视觉效果。

## 核心功能

### 🌞 环境参数控制
- **阳光暖度**: 调整场景的色温，营造暖色或冷色氛围
- **雾密度**: 控制场景雾效的浓度
- **阳光强度**: 调整整体光照强度
- **环境光颜色**: 自定义环境光的颜色
- **雾颜色**: 自定义雾效的颜色

### 🎨 预设系统
- **阳光明媚**: 高暖度、低雾密度、强光照
- **雾天**: 低暖度、高雾密度、弱光照
- **暖色调**: 暖色环境光和雾效
- **冷色调**: 冷色环境光和雾效

### 🔧 实时调整
- 支持运行时实时修改参数
- 提供编辑器属性面板配置
- 支持代码动态控制

## 快速开始

### 1. 基础设置

```typescript
import { PostProcessEnv } from './PostProcessEnv';

@ccclass('GameController')
export class GameController extends Component {
    @property(Camera)
    mainCamera: Camera = null;
    
    start() {
        // 添加后处理组件
        const postProcessEnv = this.mainCamera.addComponent(PostProcessEnv);
        postProcessEnv.camera = this.mainCamera;
        
        // 配置材质加载
        postProcessEnv.autoLoadMaterial = true;
        postProcessEnv.materialName = 'env-post-mtl';
        postProcessEnv.materialBundle = 'game';
        
        // 设置初始参数
        postProcessEnv.setSunWarmth(0.8);
        postProcessEnv.setFogDensity(0.1);
        postProcessEnv.setSunIntensity(1.2);
    }
}
```

### 2. 材质加载配置

```typescript
// 自动加载材质（推荐）
postProcessEnv.autoLoadMaterial = true;
postProcessEnv.materialName = 'env-post-mtl';
postProcessEnv.materialBundle = 'game';

// 手动加载材质
const success = await postProcessEnv.reloadMaterial();
if (success) {
    console.log('材质加载成功');
}

// 动态切换材质
await postProcessEnv.setMaterialName('another-material', 'game');
```

### 2. 使用预设

```typescript
// 应用阳光明媚预设
const sunnySettings = {
    sunWarmth: 0.9,
    fogDensity: 0.02,
    sunIntensity: 1.5,
    ambientLightColor: { r: 1.0, g: 0.95, b: 0.8, a: 1.0 },
    fogColor: { r: 1.0, g: 1.0, b: 0.9, a: 0.3 }
};

postProcessEnv.applySettings(sunnySettings);
```

### 3. 实时调整

```typescript
// 动态调整参数
postProcessEnv.setSunWarmth(0.6);
postProcessEnv.setFogDensity(0.15);
postProcessEnv.setAmbientLightColor(1.0, 0.9, 0.7, 1.0);
```

## 详细配置

### 组件属性

| 属性 | 类型 | 范围 | 默认值 | 描述 |
|------|------|------|--------|------|
| `camera` | Camera | - | null | 目标摄像机 |
| `postProcessMaterial` | Material | - | null | 自定义后处理材质 |
| `autoLoadMaterial` | boolean | - | true | 是否自动加载材质 |
| `materialName` | string | - | 'env-post-mtl' | 材质名称 |
| `materialBundle` | string | - | 'game' | 材质所在Bundle |
| `enablePostProcess` | boolean | - | true | 是否启用后处理 |
| `sunWarmth` | number | 0-1 | 0.6 | 阳光暖度 |
| `fogDensity` | number | 0-1 | 0.08 | 雾密度 |
| `sunIntensity` | number | 0-2 | 0.8 | 阳光强度 |
| `ambientLightColor` | Color | - | (1,1,1,1) | 环境光颜色 |
| `fogColor` | Color | - | (1,1,1,1) | 雾颜色 |

### 着色器参数

后处理组件会自动设置以下着色器参数：

```glsl
uniform EnvParams {
    vec4 u_ambientLight;    // 环境光颜色
    vec4 u_fogColor;        // 雾颜色
    float u_fogDensity;     // 雾密度
    float u_sunIntensity;   // 阳光强度
    float u_sunWarmth;      // 阳光暖度
};
```

## API 参考

### 核心方法

#### setSunWarmth(value: number): void
设置阳光暖度

```typescript
// 设置为暖色调
postProcessEnv.setSunWarmth(0.8);

// 设置为冷色调
postProcessEnv.setSunWarmth(0.2);
```

#### setFogDensity(value: number): void
设置雾密度

```typescript
// 轻雾
postProcessEnv.setFogDensity(0.05);

// 浓雾
postProcessEnv.setFogDensity(0.3);
```

#### setSunIntensity(value: number): void
设置阳光强度

```typescript
// 柔和光照
postProcessEnv.setSunIntensity(0.5);

// 强烈光照
postProcessEnv.setSunIntensity(1.8);
```

#### setAmbientLightColor(r: number, g: number, b: number, a?: number): void
设置环境光颜色

```typescript
// 暖色环境光
postProcessEnv.setAmbientLightColor(1.0, 0.9, 0.7);

// 冷色环境光
postProcessEnv.setAmbientLightColor(0.7, 0.8, 1.0);
```

#### setFogColor(r: number, g: number, b: number, a?: number): void
设置雾颜色

```typescript
// 白雾
postProcessEnv.setFogColor(1.0, 1.0, 1.0, 0.5);

// 蓝雾
postProcessEnv.setFogColor(0.7, 0.8, 1.0, 0.6);
```

### 管理方法

#### reloadMaterial(): Promise<boolean>
重新加载材质

```typescript
const success = await postProcessEnv.reloadMaterial();
if (success) {
    console.log('材质重新加载成功');
}
```

#### setMaterialName(materialName: string, bundleName?: string): Promise<boolean>
设置材质名称并重新加载

```typescript
// 切换到不同的材质
await postProcessEnv.setMaterialName('env-night-effect', 'game');

// 从不同的Bundle加载材质
await postProcessEnv.setMaterialName('custom-effect', 'resources');
```

#### setMaterial(material: Material): void
手动设置材质

```typescript
// 使用预先加载的材质
const customMaterial = await ResourceLoaderInstance.loadMaterial('game', 'custom-material');
if (customMaterial) {
    postProcessEnv.setMaterial(customMaterial);
}
```

#### applySettings(settings: any): void
应用设置对象

```typescript
const customSettings = {
    sunWarmth: 0.7,
    fogDensity: 0.12,
    sunIntensity: 1.1,
    ambientLightColor: { r: 0.9, g: 0.9, b: 1.0, a: 1.0 },
    fogColor: { r: 0.8, g: 0.9, b: 1.0, a: 0.4 }
};

postProcessEnv.applySettings(customSettings);
```

#### getCurrentSettings(): object
获取当前设置

```typescript
const currentSettings = postProcessEnv.getCurrentSettings();
console.log('当前设置:', currentSettings);
```

#### resetToDefaults(): void
重置为默认值

```typescript
postProcessEnv.resetToDefaults();
```

#### setPostProcessEnabled(enabled: boolean): void
启用/禁用后处理

```typescript
// 禁用后处理
postProcessEnv.setPostProcessEnabled(false);

// 启用后处理
postProcessEnv.setPostProcessEnabled(true);
```

## 预设配置

### 内置预设

```typescript
const presets = {
    // 阳光明媚
    sunny: {
        sunWarmth: 0.9,
        fogDensity: 0.02,
        sunIntensity: 1.5,
        ambientLightColor: { r: 1.0, g: 0.95, b: 0.8, a: 1.0 },
        fogColor: { r: 1.0, g: 1.0, b: 0.9, a: 0.3 }
    },
    
    // 雾天
    foggy: {
        sunWarmth: 0.3,
        fogDensity: 0.25,
        sunIntensity: 0.5,
        ambientLightColor: { r: 0.8, g: 0.8, b: 0.9, a: 1.0 },
        fogColor: { r: 0.9, g: 0.9, b: 1.0, a: 0.8 }
    },
    
    // 暖色调
    warm: {
        sunWarmth: 0.8,
        fogDensity: 0.05,
        sunIntensity: 1.2,
        ambientLightColor: { r: 1.0, g: 0.8, b: 0.6, a: 1.0 },
        fogColor: { r: 1.0, g: 0.9, b: 0.7, a: 0.4 }
    },
    
    // 冷色调
    cool: {
        sunWarmth: 0.2,
        fogDensity: 0.12,
        sunIntensity: 0.7,
        ambientLightColor: { r: 0.7, g: 0.8, b: 1.0, a: 1.0 },
        fogColor: { r: 0.8, g: 0.9, b: 1.0, a: 0.6 }
    }
};
```

## 与 LevelManager 集成

### 关卡环境配置

```typescript
// 在 LevelManager 中配置环境
private async configureEnvironment(environmentConfig: LevelEnvironment): Promise<void> {
    // 获取后处理组件
    const postProcessEnv = this.mainCamera.getComponent(PostProcessEnv);
    if (postProcessEnv) {
        // 根据关卡环境配置设置后处理参数
        const settings = {
            sunWarmth: environmentConfig.sunWarmth || 0.6,
            fogDensity: environmentConfig.fogDensity || 0.08,
            sunIntensity: environmentConfig.sunIntensity || 0.8,
            ambientLightColor: environmentConfig.ambientLight,
            fogColor: environmentConfig.fogColor
        };
        
        postProcessEnv.applySettings(settings);
        Log.log('LevelManager', '环境后处理配置完成');
    }
}
```

### 关卡 JSON 配置

```json
{
    "environment": {
        "weather": "sunny",
        "timeOfDay": "morning",
        "sunWarmth": 0.8,
        "fogDensity": 0.05,
        "sunIntensity": 1.2,
        "ambientLight": {
            "r": 1.0,
            "g": 0.95,
            "b": 0.8,
            "a": 1.0
        },
        "fogColor": {
            "r": 1.0,
            "g": 1.0,
            "b": 0.9,
            "a": 0.3
        }
    }
}
```

## UI 集成示例

### 滑块控制

```typescript
@ccclass('EnvironmentUI')
export class EnvironmentUI extends Component {
    @property(PostProcessEnv)
    postProcessEnv: PostProcessEnv = null;
    
    @property(Slider)
    sunWarmthSlider: Slider = null;
    
    start() {
        // 设置滑块事件
        this.sunWarmthSlider.node.on('slide', (slider: Slider) => {
            this.postProcessEnv.setSunWarmth(slider.progress);
        });
    }
}
```

### 按钮预设

```typescript
// 预设按钮事件
onSunnyButtonClick() {
    const sunnySettings = {
        sunWarmth: 0.9,
        fogDensity: 0.02,
        sunIntensity: 1.5
    };
    this.postProcessEnv.applySettings(sunnySettings);
}
```

## 性能优化

### 1. 材质复用
```typescript
// 使用共享材质避免重复创建
@property(Material)
sharedPostProcessMaterial: Material = null;

start() {
    if (this.sharedPostProcessMaterial) {
        this.postProcessEnv.postProcessMaterial = this.sharedPostProcessMaterial;
    }
}
```

### 2. 参数缓存
```typescript
// 避免频繁更新相同参数
private lastSunWarmth: number = -1;

setSunWarmthOptimized(value: number) {
    if (Math.abs(value - this.lastSunWarmth) > 0.01) {
        this.postProcessEnv.setSunWarmth(value);
        this.lastSunWarmth = value;
    }
}
```

### 3. 批量更新
```typescript
// 批量更新多个参数
updateEnvironmentBatch(sunWarmth: number, fogDensity: number, sunIntensity: number) {
    const settings = {
        sunWarmth,
        fogDensity,
        sunIntensity
    };
    this.postProcessEnv.applySettings(settings);
}
```

## 故障排除

### 常见问题

1. **后处理不生效**
   - 检查摄像机是否正确设置
   - 确认后处理组件已启用
   - 验证材质是否正确加载

2. **参数设置无效果**
   - 检查参数值是否在有效范围内
   - 确认材质支持对应的 uniform 参数
   - 验证着色器是否正确编译

3. **性能问题**
   - 避免每帧更新参数
   - 使用参数缓存机制
   - 考虑降低后处理质量

### 调试方法

```typescript
// 启用调试信息
postProcessEnv.debugInfo();

// 检查当前设置
const settings = postProcessEnv.getCurrentSettings();
console.log('当前设置:', settings);

// 验证组件状态
console.log('后处理启用:', postProcessEnv.enablePostProcess);
console.log('摄像机设置:', !!postProcessEnv.camera);
```

## 最佳实践

### 1. 组件初始化
- 在 `start()` 方法中初始化后处理组件
- 确保摄像机引用正确设置
- 提供合理的默认参数值

### 2. 参数调整
- 使用渐变过渡而非突变
- 提供预设配置便于快速切换
- 考虑不同设备的性能差异

### 3. 与其他系统集成
- 与关卡管理器配合使用
- 响应游戏状态变化
- 提供用户自定义选项

## 扩展示例

查看 `PostProcessEnvExample.ts` 文件获取完整的使用示例，包括：
- UI 控制集成
- 预设系统实现
- 实时参数调整
- 调试和测试功能

## 相关文件

- `PostProcessEnv.ts` - 主要组件实现
- `PostProcessEnvExample.ts` - 使用示例
- `env-post-effect.effect` - 对应的着色器文件
- `LevelManager.ts` - 关卡管理器集成

---

*本组件已完成开发和测试，可用于生产环境。如有问题请参考示例代码或联系开发团队。*