# ResourceLoader 资源加载器

ResourceLoader 是一个强大的资源管理工具，用于通过bundle名称获取资源列表并过滤出指定名字的完整路径。

## 主要功能

### 1. 获取Bundle资源列表
```typescript
import { ResourceLoaderInstance } from './ResourceLoader';

// 获取指定Bundle中的所有资源
const resources = ResourceLoaderInstance.getBundleResourceList('resources');
console.log(`找到 ${resources.length} 个资源`);
```

### 2. 搜索指定资源
```typescript
// 基础搜索
const searchOptions = {
    name: 'Chick',           // 搜索包含'Chick'的资源
    type: 'SpriteFrame',     // 只搜索SpriteFrame类型
    pathContains: 'chickens', // 路径包含'chickens'
    caseSensitive: false,    // 不区分大小写
    maxResults: 10           // 最多返回10个结果
};

const results = ResourceLoaderInstance.searchResources('resources', searchOptions);
```

### 3. 查找SpriteFrame路径
```typescript
// 查找指定名称的SpriteFrame完整路径
const spritePath = ResourceLoaderInstance.findSpriteFramePath('resources', 'CK_Chick');
if (spritePath) {
    console.log(`找到SpriteFrame路径: ${spritePath}`);
}
```

### 4. 加载SpriteFrame资源
```typescript
// 单个加载
const spriteFrame = await ResourceLoaderInstance.loadSpriteFrame('resources', 'CK_Chick');
if (spriteFrame) {
    // 使用spriteFrame
    sprite.spriteFrame = spriteFrame;
}

// 批量加载
const spriteNames = ['CK_Chick', 'GN_Blitz', 'CK_Cluck'];
const spriteMap = await ResourceLoaderInstance.loadSpriteFrames('resources', spriteNames);
```

### 5. 加载Material资源
```typescript
// 单个材质加载
const material = await ResourceLoaderInstance.loadMaterial('resources', 'env-post-effect');
if (material) {
    // 应用材质到3D对象
    meshRenderer.material = material;
}

// 批量材质加载
const materialNames = ['Mat_Environment', 'Mat_Character', 'Mat_UI'];
const materialMap = await ResourceLoaderInstance.loadMaterials('resources', materialNames);

// 智能搜索材质
const envMaterials = ResourceLoaderInstance.smartSearchMaterial('resources', 'env');
```

### 6. 加载其他资源类型
```typescript
// 加载纹理
const texture = await ResourceLoaderInstance.loadTexture2D('resources', 'background_texture');
if (texture) {
    console.log(`纹理尺寸: ${texture.width}x${texture.height}`);
}

// 加载音频
const audioClip = await ResourceLoaderInstance.loadAudioClip('resources', 'background_music');
if (audioClip) {
    // 播放音频
    audioSource.clip = audioClip;
    audioSource.play();
}
```

spriteMap.forEach((spriteFrame, name) => {
    if (spriteFrame) {
        console.log(`${name} 加载成功`);
    } else {
        console.log(`${name} 加载失败`);
    }
});
```

### 5. 智能搜索
```typescript
// 智能搜索精灵资源
const smartResults = ResourceLoaderInstance.smartSearchSprite('resources', 'Chick');
// 会自动尝试匹配：
// - Chick (精确匹配)
// - CK_Chick (带前缀)
// - 包含'chick'的资源
// - 路径包含'chick'的资源

// 智能搜索材质资源
const materialResults = ResourceLoaderInstance.smartSearchMaterial('resources', 'env');
// 会自动尝试匹配：
// - env (精确匹配)
// - Mat_env, Material_env, Mtl_env, M_env (带前缀)
// - 包含'env'的材质
// - 路径包含'env'的材质
```

### 6. 调试和统计
```typescript
// 打印Bundle详细信息（包含材质信息）
ResourceLoaderInstance.debugPrintBundleInfo('resources');

// 获取资源统计
const stats = ResourceLoaderInstance.getResourceStats('resources');
console.log('资源统计:', stats);
// 输出: { SpriteFrame: 50, Material: 15, Texture2D: 20, AudioClip: 10, Effect: 5, ... }
```

### 7. 资源管理
```typescript
// 预加载资源
const pathsToPreload = [
    'main/textures/chickens/CK_Chick/spriteFrame',
    'main/textures/chickens/GN_Blitz/spriteFrame'
];
await ResourceLoaderInstance.preloadResources('resources', pathsToPreload);

// 释放资源
ResourceLoaderInstance.releaseResources('resources', pathsToPreload);

// 清除缓存
ResourceLoaderInstance.clearCache('resources'); // 清除指定Bundle缓存
ResourceLoaderInstance.clearCache(); // 清除所有缓存
```

## 在ActorController中的使用示例

```typescript
import { ResourceLoaderInstance } from '../ResourceLoader';
import { Material, MeshRenderer } from 'cc';

export class ActorController extends Component {
    
    /**
     * 使用ResourceLoader加载角色资源
     */
    private async loadActorResourcesWithLoader() {
        try {
            // 智能搜索鸟类资源
            const birdResults = ResourceLoaderInstance.smartSearchSprite('resources', this.birdType);
            if (birdResults.length > 0) {
                const birdSprite = await ResourceLoaderInstance.loadSpriteFrame('resources', this.birdType);
                if (birdSprite && this._birdSprite) {
                    this._birdSprite.spriteFrame = birdSprite;
                    Log.log(this.MODULE_NAME, `鸟类资源加载成功: ${this.birdType}`);
                }
            }

            // 智能搜索武器资源
            const gunResults = ResourceLoaderInstance.smartSearchSprite('resources', this.gunType);
            if (gunResults.length > 0) {
                const gunSprite = await ResourceLoaderInstance.loadSpriteFrame('resources', this.gunType);
                if (gunSprite && this._gunSprite) {
                    this._gunSprite.spriteFrame = gunSprite;
                    Log.log(this.MODULE_NAME, `武器资源加载成功: ${this.gunType}`);
                }
            }

            // 加载环境材质
            const envMaterial = await ResourceLoaderInstance.loadMaterial('resources', 'env-post-effect');
            if (envMaterial) {
                // 应用环境后处理材质
                this.applyEnvironmentMaterial(envMaterial);
                Log.log(this.MODULE_NAME, '环境材质加载成功');
            }

        } catch (error) {
            Log.error(this.MODULE_NAME, '资源加载失败:', error);
        }
    }

    /**
     * 预加载所有角色资源
     */
    public async preloadAllActorResources() {
        const allBirdTypes = this.getAvailableBirdTypes();
        const allGunTypes = this.getAvailableGunTypes();
        
        // 批量加载所有鸟类资源
        const birdSprites = await ResourceLoaderInstance.loadSpriteFrames('resources', allBirdTypes);
        
        // 批量加载所有武器资源
        const gunSprites = await ResourceLoaderInstance.loadSpriteFrames('resources', allGunTypes);
        
        // 批量加载材质资源
        const materialNames = ['env-post-effect', 'character-material', 'ui-material'];
        const materials = await ResourceLoaderInstance.loadMaterials('resources', materialNames);
        
        Log.log(this.MODULE_NAME, `预加载完成: 鸟类 ${birdSprites.size}, 武器 ${gunSprites.size}, 材质 ${materials.size}`);
    }

    /**
     * 应用环境材质
     */
    private applyEnvironmentMaterial(material: Material) {
        // 找到场景中的渲染器并应用材质
        const renderers = this.node.getComponentsInChildren(MeshRenderer);
        renderers.forEach(renderer => {
            if (renderer.node.name.includes('Environment')) {
                renderer.material = material;
            }
        });
    }
}
```

## ResourceInfo 接口

```typescript
interface ResourceInfo {
    name: string;      // 资源名称 (如: "CK_Chick")
    fullPath: string;  // 完整路径 (如: "main/textures/chickens/CK_Chick/spriteFrame")
    type: string;      // 资源类型 (如: "SpriteFrame", "Texture2D")
    exists: boolean;   // 是否存在
}
```

## 搜索选项

```typescript
interface ResourceSearchOptions {
    name?: string;         // 搜索的资源名称（支持部分匹配）
    type?: string;         // 资源类型过滤
    pathContains?: string; // 路径包含的关键字
    caseSensitive?: boolean; // 是否区分大小写
    maxResults?: number;   // 最大返回数量
}
```

## 特性

- **多资源类型支持**: SpriteFrame、Material、Texture2D、AudioClip、Prefab、Scene、Effect
- **单例模式**: 全局唯一实例，避免重复初始化
- **缓存机制**: 自动缓存Bundle资源列表，提高性能
- **智能搜索**: 支持多种命名规则和模糊匹配（精灵和材质）
- **类型安全**: 完整的TypeScript类型定义
- **错误处理**: 完善的错误处理和日志记录
- **批量操作**: 支持批量加载和预加载
- **资源管理**: 支持资源释放和缓存清理
- **材质系统**: 完整的材质加载和应用支持

## 注意事项

1. 确保Bundle已经加载完成再使用ResourceLoader
2. 使用完资源后及时释放，避免内存泄漏
3. 大量资源建议使用预加载机制
4. 定期清理缓存，特别是在切换场景时